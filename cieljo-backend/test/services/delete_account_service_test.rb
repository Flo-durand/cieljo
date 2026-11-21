require "test_helper"

class DeleteAccountServiceTest < ActiveSupport::TestCase
  def new_user(name)
    User.create!(email: "#{name}@example.com", username: name, password: "password123")
  end

  test "deletes the user, and the lobby they were alone in" do
    user_id = users(:one).id
    game_id = games(:one).id

    DeleteAccountService.new(users(:one)).call

    assert_not User.exists?(user_id)
    assert_not Game.exists?(game_id)
  end

  test "the next player becomes the host of the lobby" do
    guest = new_user("guest_player")
    games(:one).players.create!(user: guest, score: 0, turn_order: 2)

    DeleteAccountService.new(users(:one)).call

    assert_equal [ [ 1, guest.id ] ], games(:one).players.order(:turn_order).pluck(:turn_order, :user_id)
    assert_equal guest.id, games(:one).reload.current_player.user_id
  end

  test "forfeits a game in progress: with one player left, that player wins" do
    games(:two).players.create!(user: users(:one), score: 0, turn_order: 2)

    DeleteAccountService.new(users(:two)).call

    game = games(:two).reload
    assert_equal "finished", game.status
    assert_equal [ users(:one).id ], game.players.pluck(:user_id)
  end

  test "leaves every game of the user and deletes their friendships and invitations" do
    games(:two).players.create!(user: users(:one), score: 0, turn_order: 2)
    friend = new_user("friend_player")
    Friendship.create!(user: users(:one), friend: friend, status: "accepted")
    Invitation.create!(host: friend, guest: users(:one), game: games(:two), status: "pending")

    DeleteAccountService.new(users(:one)).call

    assert_equal 0, Player.where(user_id: users(:one).id).count
    # Sent and received, including the fixtures between users one and two
    assert_equal 0, Friendship.where(user_id: users(:one).id).or(Friendship.where(friend_id: users(:one).id)).count
    assert_equal 0, Invitation.where(guest_id: users(:one).id).or(Invitation.where(host_id: users(:one).id)).count
    assert User.exists?(friend.id)
  end
end
