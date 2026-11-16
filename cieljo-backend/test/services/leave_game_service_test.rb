require "test_helper"

class LeaveGameServiceTest < ActiveSupport::TestCase
  # Game one (pending, room ABCD) has player one as host; add players up to `total`
  def lobby_with(total)
    game = games(:one)
    GameInitializerService.new(game).call
    (game.players.count + 1..total).each do |index|
      user = User.create!(email: "seat#{index}@example.com", username: "seat_player_#{index}", password: "password123")
      game.players.create!(user: user, score: 0, turn_order: index)
    end
    game
  end

  def seats(game)
    game.players.order(:turn_order).map { |player| [ player.turn_order, player.user.username ] }
  end

  def leave(game, player)
    LeaveGameService.new(game, player).call
  end

  test "a player leaves the lobby and the others are renumbered" do
    game = lobby_with(3)
    second = game.players.find_by(turn_order: 2)

    deleted = leave(game, second)

    assert_not deleted
    assert_equal [ [ 1, "player_one" ], [ 2, "seat_player_3" ] ], seats(game)
    assert_not Player.exists?(second.id)
  end

  test "when the host leaves the lobby, the next player becomes the host" do
    game = lobby_with(3)

    leave(game, players(:one))

    assert_equal [ [ 1, "seat_player_2" ], [ 2, "seat_player_3" ] ], seats(game)
    assert_equal game.players.find_by(turn_order: 1), game.reload.current_player
  end

  test "a lobby left empty is deleted with its cards" do
    game = lobby_with(1)

    deleted = leave(game, players(:one))

    assert deleted
    assert_not Game.exists?(game.id)
    assert_equal 0, Card.where(game_id: game.id).count
  end

  test "the deck stays untouched when a player leaves the lobby" do
    game = lobby_with(2)

    assert_no_difference -> { game.cards.where(location: "draw_pile").count } do
      leave(game, game.players.find_by(turn_order: 2))
    end
  end

  test "a player can join again after leaving the lobby" do
    game = lobby_with(2)
    leaver = game.players.find_by(turn_order: 2)
    user = leaver.user
    leave(game, leaver)

    rejoined = game.players.create!(user: user, score: 0, turn_order: game.players.count + 1)

    assert_equal 2, rejoined.turn_order
  end

  test "a player leaves a finished game; an empty finished game is deleted" do
    game = lobby_with(2)
    game.update!(status: "finished")

    assert_not leave(game, players(:one))
    assert leave(game, game.players.first)
    assert_not Game.exists?(game.id)
  end
  # --- Forfeiting a game in progress ---

  # Starts game one with `total` players; `current` is the turn order of the player whose turn it is
  # (nil keeps the reveal of the first cards going)
  def game_in_progress(total, current: 1)
    game = lobby_with(total)
    GameStarterService.new(game).call
    game.update!(current_player: game.players.find_by(turn_order: current)) if current
    game
  end

  def seat(game, turn_order)
    game.players.find_by(turn_order: turn_order)
  end

  def grid_of(game, player)
    game.cards.where(location: "player_grid", player: player)
  end

  test "a player forfeits: they leave and their grid leaves the game" do
    game = game_in_progress(3)
    leaver = seat(game, 2)
    grid_ids = grid_of(game, leaver).pluck(:id)

    deleted = leave(game, leaver)

    assert_not deleted
    assert_not Player.exists?(leaver.id)
    assert_equal 0, Card.where(id: grid_ids).count
    assert_equal "in_progress", game.reload.status
    assert_equal 2, game.players.count
  end

  test "when the current player forfeits, the turn passes to the next player" do
    game = game_in_progress(3, current: 2)

    leave(game, seat(game, 2))

    assert_equal seat(game, 3), game.reload.current_player
  end

  test "when the last player in turn order forfeits during their turn, the turn goes back to the first" do
    game = game_in_progress(3, current: 3)

    leave(game, seat(game, 3))

    assert_equal seat(game, 1), game.reload.current_player
  end

  test "a card in the hand of the forfeiting player goes face up onto the discard pile" do
    game = game_in_progress(3, current: 2)
    TurnService.new(game, seat(game, 2)).draw("draw_pile")
    hand = game.cards.find_by(location: "hand")

    leave(game, seat(game, 2))

    hand.reload
    assert_equal [ "discard_pile", nil, true ], [ hand.location, hand.player_id, hand.is_face_up ]
    assert_equal hand, game.cards.where(location: "discard_pile").order(:updated_at, :id).last
    assert_nil game.reload.drawn_from
    assert_equal seat(game, 3), game.current_player
  end

  test "when another player forfeits, the current player keeps playing" do
    game = game_in_progress(3, current: 1)
    TurnService.new(game, seat(game, 1)).draw("draw_pile")

    leave(game, seat(game, 2))

    game.reload
    assert_equal seat(game, 1), game.current_player
    assert_equal "draw_pile", game.drawn_from, "the current player still has their card in hand"
  end

  test "with one player left, the game is finished and that player wins" do
    game = game_in_progress(2, current: 1)

    leave(game, seat(game, 1))

    game.reload
    assert_equal "finished", game.status
    assert_nil game.current_player
    assert_equal [ "seat_player_2" ], game.players.map { |player| player.user.username }
  end

  test "during the reveal, the first player is chosen when the others are all done" do
    game = game_in_progress(3, current: nil)
    # Players 1 and 3 have revealed 2 cards each, player 2 has not
    { 1 => [ 5, 5 ], 3 => [ 9, 9 ] }.each do |turn_order, values|
      grid_of(game, seat(game, turn_order)).first(2).each_with_index do |card, index|
        card.update!(is_face_up: true, value: values[index])
      end
    end

    leave(game, seat(game, 2))

    assert_equal seat(game, 3), game.reload.current_player
  end

  test "during the reveal, the reveal goes on when the others are not done" do
    game = game_in_progress(3, current: nil)

    leave(game, seat(game, 2))

    assert game.reload.initial_reveal_phase?
  end

  test "the other cards are untouched when a player forfeits" do
    game = game_in_progress(3)
    leaver = seat(game, 2)
    others = game.cards.where.not(player: leaver).or(game.cards.where(player: nil)).order(:id)
                 .pluck(:id, :location, :player_id, :is_face_up)

    leave(game, leaver)

    assert_equal others, game.cards.order(:id).pluck(:id, :location, :player_id, :is_face_up)
  end
  test "two players forfeiting at the same time still pass the turn to a player in the game" do
    game = game_in_progress(4, current: 2)
    # Two requests load the game at the same time
    outdated_game = Game.find(game.id)
    third = seat(game, 3)
    fourth = seat(game, 4)

    leave(game, seat(game, 2))
    # The second request still sees player 2 as the current player; the lock reloads the game
    LeaveGameService.new(outdated_game, third).call

    assert_equal fourth, game.reload.current_player
  end
end
