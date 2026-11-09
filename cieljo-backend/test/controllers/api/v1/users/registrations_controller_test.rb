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
end
