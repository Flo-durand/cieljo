require "test_helper"

class Api::V1::Users::RegistrationsControllerTest < ActionDispatch::IntegrationTest
  def sign_up(attrs)
    post api_v1_user_registration_url, params: { user: attrs }, as: :json
  end

  test "signs up without being authenticated" do
    assert_difference -> { User.count }, 1 do
      sign_up(email: "new@example.com", password: "password123", username: "newplayer")
    end

    assert_response :ok
    assert_equal "newplayer", response.parsed_body.dig("data", "username")
  end

  test "returns validation errors" do
    assert_no_difference -> { User.count } do
      sign_up(email: users(:one).email, password: "x", username: users(:one).username)
    end

    assert_response :unprocessable_entity
    assert_includes response.parsed_body.dig("status", "errors"), "Email has already been taken"
  end
  test "a new account can log in and use its token" do
    sign_up(email: "flow@example.com", password: "password123", username: "flowplayer")
    assert_response :ok

    post api_v1_auth_login_url, params: { user: { email: "flow@example.com", password: "password123" } }, as: :json
    assert_response :ok
    token = response.parsed_body.dig("data", "token")

    post api_v1_games_url, headers: { "Authorization" => token }, as: :json
    assert_response :created
  end

  # Devise's other routes do not work with the JWT flow and are not exposed (see config/routes.rb), and
  # devise-jwt's middleware no longer acts on any path (see config/initializers/devise_jwt_requests.rb)
  test "the unused Devise routes do not exist" do
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(users(:one), :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }

    [
      [ :post, "/api/v1/users/sign_in" ],
      [ :delete, "/api/v1/users/sign_out" ],
      [ :post, "/api/v1/users/password" ],
      [ :get, "/api/v1/users/edit" ],
      [ :put, "/api/v1/users" ],
      [ :delete, "/api/v1/users" ]
    ].each do |verb, path|
      send(verb, path, headers: headers, as: :json)
      assert_response :not_found, "#{verb.upcase} #{path} should not exist"
    end
  end

  test "devise-jwt's middleware does not act on any request" do
    assert_empty Warden::JWTAuth.config.dispatch_requests
    assert_empty Warden::JWTAuth.config.revocation_requests
  end

  test "signing up does not log the user in" do
    sign_up(email: "nosession@example.com", password: "password123", username: "nosession")

    assert_nil response.headers["Authorization"]
    assert_nil response.parsed_body.dig("data", "token")
  end

  test "a password needs at least 8 characters" do
    assert_no_difference -> { User.count } do
      sign_up(email: "short@example.com", password: "1234567", username: "shortpass")
    end
    assert_response :unprocessable_entity
    assert_includes response.parsed_body.dig("status", "errors"), "Password is too short (minimum is 8 characters)"

    sign_up(email: "long@example.com", password: "12345678", username: "longpass")
    assert_response :ok
  end

  test "an account created with a shorter password can still log in" do
    user = User.create!(email: "old@example.com", username: "old_player", password: "password123")
    # Accounts created before the 8-character rule may have a 6-character password
    user.update_column(:encrypted_password, Devise::Encryptor.digest(User, "abc123"))

    post api_v1_auth_login_url, params: { user: { email: "old@example.com", password: "abc123" } }, as: :json

    assert_response :ok
  end
end
