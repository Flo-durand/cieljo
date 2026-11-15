require "test_helper"

class Api::V1::AuthControllerTest < ActionDispatch::IntegrationTest
  # The fixture users have the password "password123"
  def login(params)
    post api_v1_auth_login_url, params: params, as: :json
  end

  test "logs in with the right email and password and returns a working token" do
    login(user: { email: "one@example.com", password: "password123" })

    assert_response :ok
    token = response.parsed_body.dig("data", "token")
    assert token.start_with?("Bearer ")
    assert_equal "player_one", response.parsed_body.dig("data", "username")

    get api_v1_game_url("ABCD"), headers: { "Authorization" => token }, as: :json
    assert_response :ok
  end

  test "refuses a wrong password" do
    login(user: { email: "one@example.com", password: "wrong-password" })

    assert_response :unauthorized
    assert_equal "Invalid email or password.", response.parsed_body["error"]
  end

  test "refuses an unknown email with the same message" do
    login(user: { email: "nobody@example.com", password: "password123" })

    assert_response :unauthorized
    assert_equal "Invalid email or password.", response.parsed_body["error"]
  end

  test "refuses a missing password" do
    login(user: { email: "one@example.com" })

    assert_response :unauthorized
  end

  test "answers 400 when the user object is missing" do
    login(email: "one@example.com", password: "password123")

    assert_response :bad_request
    assert_equal "Email and password are required.", response.parsed_body["error"]
  end

  test "answers 400 when the user object has the wrong shape" do
    login(user: "one@example.com")

    assert_response :bad_request
  end
  # --- Logout ---

  def token_for(user)
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    "Bearer #{token}"
  end

  def logout(token)
    delete api_v1_auth_logout_url, headers: { "Authorization" => token }, as: :json
  end

  test "logging out revokes the token" do
    token = token_for(users(:one))

    logout(token)

    assert_response :ok
    assert_equal "Logged out successfully.", response.parsed_body.dig("status", "message")
    get api_v1_me_url, headers: { "Authorization" => token }, as: :json
    assert_response :unauthorized
  end

  test "logging out revokes every token of the user (all devices)" do
    laptop = token_for(users(:one))
    phone = token_for(users(:one))

    logout(laptop)

    get api_v1_me_url, headers: { "Authorization" => phone }, as: :json
    assert_response :unauthorized
  end

  test "the user can log in again after logging out" do
    logout(token_for(users(:one)))

    login(user: { email: "one@example.com", password: "password123" })
    assert_response :ok

    get api_v1_me_url, headers: { "Authorization" => response.parsed_body.dig("data", "token") }, as: :json
    assert_response :ok
  end

  test "logging out does not affect the other users" do
    other = token_for(users(:two))

    logout(token_for(users(:one)))

    get api_v1_me_url, headers: { "Authorization" => other }, as: :json
    assert_response :ok
  end

  test "logging out requires a valid session" do
    delete api_v1_auth_logout_url, as: :json

    assert_response :unauthorized
  end

  test "a revoked token cannot log out again" do
    token = token_for(users(:one))
    logout(token)

    logout(token)

    assert_response :unauthorized
  end
end
