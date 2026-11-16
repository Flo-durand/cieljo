# At the start of the game, each player reveals 2 cards of their grid.
# Once everyone has done it, the player who ended the previous round plays first; in the first round (or when
# that player has quit), the player with the highest total of revealed cards.
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
      self.class.choose_first_player_if_everyone_revealed(@game)
    end
  end

  # Once every player has revealed their first cards, the player who ended the previous round plays first
  # (Game#first_player_turn_order). Otherwise, the player with the highest total plays first (on a tie, the
  # player who comes first in turn order). Also called when a player leaves during the reveal: the others
  # may all be done already. Call it while holding the lock of the game row.
  def self.choose_first_player_if_everyone_revealed(game)
    revealed = game.cards.where(location: "player_grid", is_face_up: true)
    return unless revealed.count == game.players.count * Game::INITIAL_REVEAL_COUNT

    # Fresh queries: the players already loaded may still include one who just left
    first_player = game.first_player_turn_order && game.players.find_by(turn_order: game.first_player_turn_order)
    totals = revealed.group(:player_id).sum(:value)
    first_player ||= game.players.order(:turn_order).max_by { |player| [ totals.fetch(player.id, 0), -player.turn_order ] }
    game.update!(current_player: first_player)
  end
end
