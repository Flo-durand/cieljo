# Deletes a user's account. Before the account goes, the user leaves each of their games the way a player
# quitting would (LeaveGameService): a lobby renumbers its seats, a game in progress goes on without them (or is
# won by the last player left), an empty game is deleted. Then the user and the rest of their data (friendships,
# invitations) are deleted. Everything happens in one transaction: if anything fails, nothing is deleted.
class DeleteAccountService
  def initialize(user)
    @user = user
  end

  def call
    User.transaction do
      @user.players.includes(:game).find_each do |player|
        LeaveGameService.new(player.game, player).call
      end
      @user.destroy!
    end
  end
end
