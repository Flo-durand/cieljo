# A player leaves a game, under a lock of the game row (two players leaving at the same time cannot both
# renumber the seats or delete the game).
# - In the lobby (pending): the player is removed and the others are renumbered 1, 2, 3... so the first one
#   becomes the host; a lobby left empty is deleted.
# - In a game in progress, the player forfeits: their grid cards leave the game and a card in their hand goes
#   onto the discard pile. If it was their turn, it passes to the next player. During the reveal of the first
#   cards, the first player is chosen if all the others are done. With fewer than 2 players left, the game is
#   finished and the last player wins.
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
      next forfeit if @game.status == "in_progress"

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

  def forfeit
    players = @game.players.order(:turn_order).to_a
    next_player = players[(players.index(@player) + 1) % players.size]
    was_playing = @game.current_player_id == @player.id

    # The card in hand goes onto the discard pile, face up; the grid cards leave with the player
    hand = @game.cards.find_by(location: "hand", player: @player)
    @game.discard!(hand) if hand
    @player.destroy!

    if players.size - 1 < GameStarterService::MIN_PLAYERS
      # The last player wins by forfeit
      @game.update!(status: "finished", current_player: nil, drawn_from: nil)
    elsif was_playing
      @game.update!(current_player: next_player, drawn_from: nil)
    elsif @game.initial_reveal_phase?
      InitialRevealService.choose_first_player_if_everyone_revealed(@game)
    end
  end

  # The seats stay numbered 1, 2, 3... in the same order: the player with number 1 is the host
  def renumber(players)
    players.each_with_index { |player, index| player.update!(turn_order: index + 1) }
    @game.update!(current_player: players.first)
  end
end
