require "test_helper"

class RateLimitsTest < ActionDispatch::IntegrationTest
  def token_for(user)
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    "Bearer #{token}"
  end

  def assert_rate_limited
    assert_response :too_many_requests
    assert_equal "Too many requests. Please wait a moment and try again.", response.parsed_body["error"]
  end

  test "login: 10 attempts per 3 minutes for an IP address" do
    10.times do
      post api_v1_auth_login_url, params: { user: { email: "one@example.com", password: "wrong" } }, as: :json
      assert_response :unauthorized
    end

    # Even the right password is refused once the limit is reached
    post api_v1_auth_login_url, params: { user: { email: "one@example.com", password: "password123" } }, as: :json
    assert_rate_limited

    # Another IP address is not affected
    post api_v1_auth_login_url, params: { user: { email: "one@example.com", password: "password123" } },
                                headers: { "REMOTE_ADDR" => "10.0.0.2" }, as: :json
    assert_response :ok

    # The limit is lifted after 3 minutes
    travel 3.minutes + 1.second do
      post api_v1_auth_login_url, params: { user: { email: "one@example.com", password: "password123" } }, as: :json
      assert_response :ok
    end
  end

  test "sign-up: 5 accounts per hour for an IP address" do
    5.times do |index|
      post api_v1_user_registration_url,
           params: { user: { email: "new#{index}@example.com", password: "password123", username: "new_player_#{index}" } },
           as: :json
      assert_response :ok
    end

    assert_no_difference -> { User.count } do
      post api_v1_user_registration_url,
           params: { user: { email: "new5@example.com", password: "password123", username: "new_player_5" } }, as: :json
    end
    assert_rate_limited
  end

  test "game creation: 10 games per minute for a user" do
    10.times do
      post api_v1_games_url, headers: { "Authorization" => token_for(users(:one)) }, as: :json
      assert_response :created
    end

    assert_no_difference -> { Game.count } do
      post api_v1_games_url, headers: { "Authorization" => token_for(users(:one)) }, as: :json
    end
    assert_rate_limited

    # Another user is not affected
    post api_v1_games_url, headers: { "Authorization" => token_for(users(:two)) }, as: :json
    assert_response :created
  end

  test "the other game actions are not limited" do
    15.times do
      get api_v1_game_url("ABCD"), headers: { "Authorization" => token_for(users(:one)) }, as: :json
      assert_response :ok
    end
  end
end
