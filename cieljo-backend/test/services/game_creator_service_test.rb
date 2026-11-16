require "test_helper"

class GameCreatorServiceTest < ActiveSupport::TestCase
  test "creates a pending game with the user as host and a full deck" do
    game = GameCreatorService.new(users(:two)).call

    assert_equal "pending", game.status
    host = game.players.sole
    assert_equal [ users(:two), 1 ], [ host.user, host.turn_order ]
    assert_equal host, game.current_player
    assert_equal 150, game.cards.where(location: "draw_pile").count
  end

  test "creates nothing when a step fails" do
    original = GameInitializerService.instance_method(:call)
    # Simulate a failure while the deck is being created
    GameInitializerService.define_method(:call) { raise ActiveRecord::RecordInvalid }

    assert_no_difference [ -> { Game.count }, -> { Player.count }, -> { Card.count } ] do
      assert_raises(ActiveRecord::RecordInvalid) { GameCreatorService.new(users(:two)).call }
    end
  ensure
    GameInitializerService.define_method(:call, original)
  end
end
