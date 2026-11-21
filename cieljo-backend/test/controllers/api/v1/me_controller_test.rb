require "test_helper"

class Api::V1::MeControllerTest < ActionDispatch::IntegrationTest
  def token_for(user)
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    "Bearer #{token}"
  end

  def update_account(user, attributes, token: token_for(user))
    patch api_v1_me_url, params: { user: attributes }, headers: { "Authorization" => token }, as: :json
  end

  def delete_account(user, password)
    delete api_v1_me_url, params: { user: { current_password: password } },
                          headers: { "Authorization" => token_for(user) }, as: :json
  end

  # --- GET /api/v1/me ---

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

  # --- PATCH /api/v1/me ---

  test "changes the username without the current password" do
    update_account(users(:one), { username: "new_name" })

    assert_response :ok
    assert_equal "new_name", response.parsed_body.dig("data", "username")
    assert_nil response.parsed_body.dig("data", "token")
    assert_equal "new_name", users(:one).reload.username
  end

  test "refuses a username already taken, whatever its case" do
    update_account(users(:one), { username: "PLAYER_TWO" })

    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Username has already been taken"
    assert_equal "player_one", users(:one).reload.username
  end

  test "changes the email with the current password" do
    update_account(users(:one), { email: "New.One@Example.com", current_password: "password123" })

    assert_response :ok
    assert_equal "new.one@example.com", users(:one).reload.email
  end

  test "keeping the same email does not need the current password" do
    update_account(users(:one), { email: "ONE@example.com", username: "renamed" })

    assert_response :ok
    assert_equal "renamed", users(:one).reload.username
  end

  test "refuses a new email without the right current password (422, not 401)" do
    update_account(users(:one), { email: "new.one@example.com", current_password: "wrong-password" })

    assert_response :unprocessable_entity
    assert_equal "Your current password is incorrect.", response.parsed_body["error"]
    assert_equal "one@example.com", users(:one).reload.email
  end

  test "refuses an email already taken" do
    update_account(users(:one), { email: "two@example.com", current_password: "password123" })

    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Email has already been taken"
  end

  test "a new password revokes the old tokens and returns a new one" do
    old_token = token_for(users(:one))

    update_account(users(:one), { password: "a-new-password", current_password: "password123" }, token: old_token)

    assert_response :ok
    new_token = response.parsed_body.dig("data", "token")
    assert users(:one).reload.valid_password?("a-new-password")

    get api_v1_me_url, headers: { "Authorization" => old_token }, as: :json
    assert_response :unauthorized

    get api_v1_me_url, headers: { "Authorization" => new_token }, as: :json
    assert_response :ok
  end

  test "refuses a new password without the right current password" do
    update_account(users(:one), { password: "a-new-password" })

    assert_response :unprocessable_entity
    assert users(:one).reload.valid_password?("password123")
  end

  test "refuses a password shorter than 8 characters and keeps the session" do
    token = token_for(users(:one))

    update_account(users(:one), { password: "short", current_password: "password123" }, token: token)

    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Password is too short (minimum is 8 characters)"
    get api_v1_me_url, headers: { "Authorization" => token }, as: :json
    assert_response :ok
  end

  test "a blank password keeps the current one" do
    update_account(users(:one), { username: "renamed", password: "" })

    assert_response :ok
    assert users(:one).reload.valid_password?("password123")
  end

  test "answers 400 without account data" do
    patch api_v1_me_url, params: {}, headers: { "Authorization" => token_for(users(:one)) }, as: :json

    assert_response :bad_request
  end

  test "editing requires a valid session" do
    patch api_v1_me_url, params: { user: { username: "intruder" } }, as: :json

    assert_response :unauthorized
  end

  # --- DELETE /api/v1/me ---

  test "deletes the account with the current password" do
    delete_account(users(:one), "password123")

    assert_response :ok
    assert_not User.exists?(users(:one).id)
  end

  test "keeps the account with a wrong password (422, not 401)" do
    delete_account(users(:one), "wrong-password")

    assert_response :unprocessable_entity
    assert_equal "Your current password is incorrect.", response.parsed_body["error"]
    assert User.exists?(users(:one).id)
  end

  test "a deleted account can no longer use its token" do
    token = token_for(users(:one))
    delete api_v1_me_url, params: { user: { current_password: "password123" } },
                          headers: { "Authorization" => token }, as: :json

    get api_v1_me_url, headers: { "Authorization" => token }, as: :json

    assert_response :unauthorized
  end

  test "deleting: 10 attempts per 3 minutes for a user" do
    10.times do
      delete_account(users(:one), "wrong-password")
      assert_response :unprocessable_entity
    end

    delete_account(users(:one), "password123")

    assert_response :too_many_requests
    assert User.exists?(users(:one).id)
  end
end
