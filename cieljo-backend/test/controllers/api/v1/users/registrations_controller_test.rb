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

  # Devise's other routes do not work with the JWT flow and are not exposed (see config/routes.rb).
  # DELETE /api/v1/users/sign_out is left out on purpose: devise-jwt's revocation middleware handles it before
  # routing and fails on its scope (:user in our tokens, :api_v1_user for Devise), as it already did before.
  # Nothing uses it; a real server-side logout is planned (audit M1).
  test "the unused Devise routes do not exist" do
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(users(:one), :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }

    [
      [ :post, "/api/v1/users/sign_in" ],
      [ :post, "/api/v1/users/password" ],
      [ :get, "/api/v1/users/edit" ],
      [ :put, "/api/v1/users" ],
      [ :delete, "/api/v1/users" ]
    ].each do |verb, path|
      send(verb, path, headers: headers, as: :json)
      assert_response :not_found, "#{verb.upcase} #{path} should not exist"
    end
  end
end
