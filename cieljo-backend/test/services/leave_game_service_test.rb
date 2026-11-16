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
end
