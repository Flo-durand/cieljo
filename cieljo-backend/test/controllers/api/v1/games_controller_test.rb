require "test_helper"

class Api::V1::GamesControllerTest < ActionDispatch::IntegrationTest
  # Fixtures: player one is in game one (pending, ABCD),
  # player two is in game two (in_progress, WXYZ).

  def auth_headers(user)
    token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def join(room_code, user)
    post join_api_v1_games_url, params: { room_code: room_code }, headers: auth_headers(user), as: :json
  end

  test "joins a pending game" do
    game = games(:one)

    assert_difference -> { game.players.count }, 1 do
      join("ABCD", users(:two))
    end

    assert_response :ok
    assert_equal "ABCD", response.parsed_body.dig("data", "room_code")
    assert_equal 2, game.players.find_by(user: users(:two)).turn_order
  end

  test "normalizes the room code" do
    join("  abcd ", users(:two))

    assert_response :ok
  end

  test "refuses a user already in the game" do
    assert_no_difference -> { Player.count } do
      join("ABCD", users(:one))
    end

    assert_response :conflict
    assert_equal "You are already in this game.", response.parsed_body["error"]
  end

  test "returns 404 for an unknown room code" do
    join("ZZZZ", users(:two))

    assert_response :not_found
  end

  test "refuses a game that is not pending" do
    assert_no_difference -> { Player.count } do
      join("WXYZ", users(:one))
    end

    assert_response :unprocessable_entity
  end

  test "requires authentication" do
    post join_api_v1_games_url, params: { room_code: "ABCD" }, as: :json

    assert_response :unauthorized
  end
end
