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

  test "shows the room with its players ordered by turn" do
    join("ABCD", users(:two))

    get api_v1_game_url("abcd"), headers: auth_headers(users(:two)), as: :json

    assert_response :ok
    players = response.parsed_body.dig("data", "players")
    assert_equal %w[player_one player_two], players.map { |p| p["username"] }
    assert_equal [ true, false ], players.map { |p| p["host"] }
    assert_equal [ false, true ], players.map { |p| p["current_user"] }
  end

  test "hides the room from users who are not players" do
    get api_v1_game_url("ABCD"), headers: auth_headers(users(:two)), as: :json

    assert_response :forbidden
  end

  test "returns 404 when showing an unknown room" do
    get api_v1_game_url("ZZZZ"), headers: auth_headers(users(:one)), as: :json

    assert_response :not_found
  end

  test "requires authentication" do
    post join_api_v1_games_url, params: { room_code: "ABCD" }, as: :json

    assert_response :unauthorized
  end

  # --- Starting a game ---

  def start(room_code, user)
    post start_api_v1_game_url(room_code), headers: auth_headers(user), as: :json
  end

  # Game one gets a full deck and a second player, ready to start
  def prepare_game_one
    game = games(:one)
    GameInitializerService.new(game).call
    game.players.create!(user: users(:two), score: 0, turn_order: 2)
    game
  end

  test "the host starts the game and deals a 3x4 grid to each player" do
    game = prepare_game_one

    start("abcd", users(:one))

    assert_response :ok
    assert_equal "in_progress", game.reload.status

    game.players.each do |player|
      grid = game.cards.where(player: player, location: "player_grid")
      assert_equal 12, grid.count
      assert_equal [ 0, 1, 2 ], grid.distinct.pluck(:row).sort
      assert_equal [ 0, 1, 2, 3 ], grid.distinct.pluck(:column).sort
      assert grid.none?(&:is_face_up)
    end

    discard = game.cards.where(location: "discard_pile")
    assert_equal 1, discard.count
    assert discard.first.is_face_up
    assert_equal 150 - 25, game.cards.where(location: "draw_pile").count
  end

  test "only the host can start the game" do
    game = prepare_game_one

    start("ABCD", users(:two))

    assert_response :forbidden
    assert_equal "pending", game.reload.status
  end

  test "needs at least two players to start" do
    game = games(:one)
    GameInitializerService.new(game).call

    start("ABCD", users(:one))

    assert_response :unprocessable_entity
    assert_equal "At least 2 players are needed to start the game.", response.parsed_body["error"]
    assert_equal "pending", game.reload.status
  end

  test "cannot start a game twice" do
    game = prepare_game_one
    start("ABCD", users(:one))

    assert_no_changes -> { game.cards.where(location: "player_grid").count } do
      start("ABCD", users(:one))
    end

    assert_response :unprocessable_entity
  end

  test "returns 404 when starting an unknown room" do
    start("ZZZZ", users(:one))

    assert_response :not_found
  end
end
