require "test_helper"

# ApplicationController#authenticate_user! protects every endpoint except sign-up and login
class AuthenticationTest < ActionDispatch::IntegrationTest
  def token_for(user)
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    token
  end

  # A protected endpoint: player one is in game one
  def show_game(authorization)
    headers = authorization ? { "Authorization" => authorization } : {}
    get api_v1_game_url("ABCD"), headers: headers, as: :json
  end

  test "accepts a valid token" do
    show_game("Bearer #{token_for(users(:one))}")

    assert_response :ok
  end

  test "refuses a request without a token" do
    show_game(nil)

    assert_response :unauthorized
    assert_equal "Authentication required. Invalid or expired session.", response.parsed_body["error"]
  end

  test "refuses a malformed token" do
    show_game("Bearer not-a-jwt")

    assert_response :unauthorized
  end

  test "refuses a token signed with another secret" do
    payload = { sub: users(:one).id.to_s, jti: users(:one).jti, scp: "user", exp: 1.hour.from_now.to_i }
    show_game("Bearer #{JWT.encode(payload, "another-secret", "HS256")}")

    assert_response :unauthorized
  end

  test "refuses an expired token" do
    token = token_for(users(:one))

    travel 2.days do
      show_game("Bearer #{token}")
    end

    assert_response :unauthorized
  end

  test "refuses a revoked token (the user's jti has changed)" do
    token = token_for(users(:one))
    users(:one).update!(jti: SecureRandom.uuid)

    show_game("Bearer #{token}")

    assert_response :unauthorized
  end

  test "refuses a token of a deleted user" do
    user = User.create!(email: "gone@example.com", username: "gone_player", password: "password123")
    token = token_for(user)
    user.destroy!

    show_game("Bearer #{token}")

    assert_response :unauthorized
  end

  test "a database error is a server error, not a missing session" do
    token = token_for(users(:one))
    # Simulate a database outage while loading the user (the original method comes back in the ensure)
    User.define_singleton_method(:find_by) { |*| raise ActiveRecord::ConnectionNotEstablished, "database down" }

    assert_raises(ActiveRecord::ConnectionNotEstablished) do
      show_game("Bearer #{token}")
    end
  ensure
    User.singleton_class.remove_method(:find_by)
  end
end
