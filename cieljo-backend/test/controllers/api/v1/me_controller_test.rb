require "test_helper"

class Api::V1::MeControllerTest < ActionDispatch::IntegrationTest
  def token_for(user)
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    "Bearer #{token}"
  end

  test "returns the logged-in user" do
    get api_v1_me_url, headers: { "Authorization" => token_for(users(:two)) }, as: :json

    assert_response :ok
    data = response.parsed_body["data"]
    assert_equal users(:two).id, data["id"]
    assert_equal "two@example.com", data["email"]
    assert_equal "player_two", data["username"]
  end

  test "never sends private account data" do
    get api_v1_me_url, headers: { "Authorization" => token_for(users(:one)) }, as: :json

    assert_equal %w[email id username], response.parsed_body["data"].keys.sort
  end

  test "requires a valid session" do
    get api_v1_me_url, as: :json

    assert_response :unauthorized
  end
end
