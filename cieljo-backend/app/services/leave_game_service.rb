# A player leaves a game, under a lock of the game row (two players leaving at the same time cannot both
# renumber the seats or delete the game).
# - In the lobby (pending): the player is removed and the others are renumbered 1, 2, 3... so the first one
#   becomes the host; a lobby left empty is deleted.
# - In a finished game: the player is removed; a game left empty is deleted.
class LeaveGameService
  class Error < StandardError; end

  def initialize(game, player)
    @game = game
    @player = player
  end

  # Returns true when the game was deleted because nobody was left in it
  def call
    deleted = false
    @game.with_lock do
      raise Error, "Leaving a game in progress is not possible yet." if @game.status == "in_progress"

      @player.destroy!
      remaining = @game.players.order(:turn_order).to_a
      if remaining.empty?
        @game.destroy!
        deleted = true
      elsif @game.status == "pending"
        renumber(remaining)
      end
    end
    deleted
  end

  private

  # The seats stay numbered 1, 2, 3... in the same order: the player with number 1 is the host
  def renumber(players)
    players.each_with_index { |player, index| player.update!(turn_order: index + 1) }
    @game.update!(current_player: players.first)
  end
end
