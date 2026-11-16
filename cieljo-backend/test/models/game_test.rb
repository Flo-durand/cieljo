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
  test "deleting the current player clears it from the game" do
    game = games(:one)
    game.update!(current_player: players(:one))

    players(:one).destroy!

    assert_nil game.reload.current_player_id
  end

  test "the current player must be a player that exists" do
    assert_raises(ActiveRecord::InvalidForeignKey) do
      games(:one).update_columns(current_player_id: 0)
    end
  end

  test "deleting a user also deletes their friendships and invitations" do
    user = users(:two)

    user.destroy!

    assert_not Friendship.where(user_id: user.id).or(Friendship.where(friend_id: user.id)).exists?
    assert_not Invitation.where(host_id: user.id).or(Invitation.where(guest_id: user.id)).exists?
  end
end
