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
end
