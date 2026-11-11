# At the start of the game, each player reveals 2 cards of their grid.
# Once everyone has done it, the player with the highest total of revealed cards plays first.
class InitialRevealService
  class Error < StandardError; end

  def initialize(game, player, card_id)
    @game = game
    @player = player
    @card_id = card_id
  end

  def call
    # Lock the game row so the last two reveals cannot both choose the first player
    @game.with_lock do
      raise Error, "The cards to reveal at the start of the game have already been revealed." unless @game.initial_reveal_phase?

      grid = @game.cards.where(location: "player_grid", player: @player)
      card = grid.find_by(id: @card_id)
      raise Error, "This card is not in your grid." unless card
      raise Error, "This card is already face up." if card.is_face_up
      if grid.where(is_face_up: true).count >= Game::INITIAL_REVEAL_COUNT
        raise Error, "You have already revealed #{Game::INITIAL_REVEAL_COUNT} cards."
      end

      card.update!(is_face_up: true)
      choose_first_player if everyone_revealed?
    end
  end

  private

  def revealed_cards
    @game.cards.where(location: "player_grid", is_face_up: true)
  end

  def everyone_revealed?
    revealed_cards.count == @game.players.count * Game::INITIAL_REVEAL_COUNT
  end

  # Highest total first; on a tie, the player who comes first in turn order
  def choose_first_player
    totals = revealed_cards.group(:player_id).sum(:value)
    first_player = @game.players.max_by { |player| [ totals.fetch(player.id, 0), -player.turn_order ] }
    @game.update!(current_player: first_player)
  end
end
