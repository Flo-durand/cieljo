require "test_helper"

class GameTest < ActiveSupport::TestCase
  test "destroying a game deletes its players and cards, even dealt ones" do
    game = Game.create!(status: "pending", turn_number: 1)
    player = game.players.create!(user: users(:one), score: 0, turn_order: 1)
    GameInitializerService.new(game).call

    # Deal one card to the player, as during a real game
    game.cards.first.update!(player: player, location: "hand")

    assert_difference -> { Card.count } => -150, -> { Player.count } => -1 do
      game.destroy!
    end
  end
end
