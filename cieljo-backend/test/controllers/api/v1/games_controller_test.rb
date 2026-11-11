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

  test "shows the dealt grids without the values of face-down cards" do
    prepare_game_one
    start("ABCD", users(:one))

    get api_v1_game_url("ABCD"), headers: auth_headers(users(:two)), as: :json

    assert_response :ok
    data = response.parsed_body["data"]
    data["players"].each do |player|
      assert_equal 12, player["grid"].size
      assert player["grid"].all? { |card| card["value"].nil? && !card["face_up"] }
    end
    assert data["discard_top"]["face_up"]
    assert_not_nil data["discard_top"]["value"]
    assert_equal 125, data["draw_pile_count"]
  end

  test "returns 404 when starting an unknown room" do
    start("ZZZZ", users(:one))

    assert_response :not_found
  end

  # --- Revealing the first cards ---

  def reveal(card, user)
    post reveal_api_v1_game_url("ABCD"), params: { card_id: card.id }, headers: auth_headers(user), as: :json
  end

  # Starts game one and gives each grid known values, so the first player is predictable
  def start_game_one(values_by_user)
    game = prepare_game_one
    start("ABCD", users(:one))

    values_by_user.each do |user, values|
      grid_of(game, user).each_with_index { |card, index| card.update!(value: values.fetch(index, 0)) }
    end
    game
  end

  def grid_of(game, user)
    game.cards.where(location: "player_grid", player: game.players.find_by(user: users(user))).order(:row, :column)
  end

  test "starting a game opens the reveal phase without a current player" do
    game = start_game_one({})

    assert game.reload.initial_reveal_phase?
    assert_nil game.current_player
  end

  test "a player reveals a card of their grid" do
    game = start_game_one({})
    card = grid_of(game, :one).first

    reveal(card, users(:one))

    assert_response :ok
    assert card.reload.is_face_up
    assert response.parsed_body.dig("data", "initial_reveal")
  end

  test "cannot reveal more than 2 cards" do
    game = start_game_one({})
    cards = grid_of(game, :one).first(3)
    reveal(cards[0], users(:one))
    reveal(cards[1], users(:one))

    reveal(cards[2], users(:one))

    assert_response :unprocessable_entity
    assert_not cards[2].reload.is_face_up
  end

  test "cannot reveal a card of another player" do
    game = start_game_one({})
    card = grid_of(game, :two).first

    reveal(card, users(:one))

    assert_response :unprocessable_entity
    assert_equal "This card is not in your grid.", response.parsed_body["error"]
  end

  test "cannot reveal the same card twice" do
    game = start_game_one({})
    card = grid_of(game, :one).first
    reveal(card, users(:one))

    reveal(card, users(:one))

    assert_response :unprocessable_entity
    assert_equal "This card is already face up.", response.parsed_body["error"]
  end

  test "the player with the highest total plays first once everyone has revealed" do
    game = start_game_one(one: [ 1, 2 ], two: [ 5, 6 ])
    grid_one = grid_of(game, :one)
    grid_two = grid_of(game, :two)

    reveal(grid_one[0], users(:one))
    reveal(grid_one[1], users(:one))
    reveal(grid_two[0], users(:two))
    assert game.reload.initial_reveal_phase?

    reveal(grid_two[1], users(:two))

    assert_not game.reload.initial_reveal_phase?
    assert_equal users(:two), game.current_player.user
    assert_equal game.current_player_id, response.parsed_body.dig("data", "current_player_id")
  end

  test "on a tie, the first player in turn order plays first" do
    game = start_game_one(one: [ 3, 3 ], two: [ 4, 2 ])
    (grid_of(game, :one).first(2) + grid_of(game, :two).first(2)).each do |card|
      reveal(card, card.player.user)
    end

    assert_equal users(:one), game.reload.current_player.user
  end

  test "cannot use the initial reveal once the first player is chosen" do
    game = start_game_one({})
    (grid_of(game, :one).first(2) + grid_of(game, :two).first(2)).each do |card|
      reveal(card, card.player.user)
    end

    reveal(grid_of(game, :one)[5], users(:one))

    assert_response :unprocessable_entity
  end

  test "users who are not players cannot reveal cards" do
    game = start_game_one({})
    outsider = User.create!(email: "three@example.com", username: "player_three", password: "password123")

    reveal(grid_of(game, :one).first, outsider)

    assert_response :forbidden
  end
end
