# Plays the turn of the current player, in two steps:
#   1. draw: take a card from the draw pile or the discard pile. It goes to the player's hand, face up.
#   2. then either
#      - swap: put the card in hand in place of one card of the grid; that card goes to the discard pile, or
#      - discard: throw the card in hand onto the discard pile and reveal a face-down card of the grid
#        (only when the card comes from the draw pile).
# After step 2, the turn goes to the next player in turn order.
class TurnService
  class Error < StandardError; end

  SOURCES = %w[draw_pile discard_pile].freeze

  def initialize(game, player)
    @game = game
    @player = player
  end

  def draw(source)
    play do
      raise Error, "You already have a card in hand." if @game.drawn_from
      raise Error, "You can only draw from the draw pile or the discard pile." unless SOURCES.include?(source)

      card = source == "draw_pile" ? draw_pile_card : discard_top
      raise Error, "There is no card to take from the #{source.tr('_', ' ')}." unless card

      card.update!(location: "hand", player: @player, row: nil, column: nil, is_face_up: true)
      @game.update!(drawn_from: source)
    end
  end

  def swap(card_id)
    play do
      hand = hand_card!
      grid_card = grid_card!(card_id)
      row = grid_card.row
      column = grid_card.column

      discard!(grid_card)
      hand.update!(location: "player_grid", row: row, column: column, is_face_up: true)
      end_turn
    end
  end

  def discard(card_id)
    play do
      hand = hand_card!
      raise Error, "A card taken from the discard pile must be swapped with a card of your grid." if @game.drawn_from == "discard_pile"

      grid_card = grid_card!(card_id)
      raise Error, "This card is already face up." if grid_card.is_face_up

      discard!(hand)
      grid_card.update!(is_face_up: true)
      end_turn
    end
  end

  private

  # Locks the game row so two requests cannot play at the same time, then checks that it is the player's turn
  def play
    @game.with_lock do
      raise Error, "The game is not in progress." unless @game.status == "in_progress"
      raise Error, "The players are still revealing their first cards." if @game.initial_reveal_phase?
      raise Error, "It is not your turn." unless @game.current_player_id == @player.id

      yield
    end
  end

  # The draw pile is face down, so any of its cards is as good as the top one: drawing a random card
  # keeps it shuffled, even after the discard pile is put back into it.
  def draw_pile_card
    refill_draw_pile if cards("draw_pile").none?
    cards("draw_pile").order(Arel.sql("RANDOM()")).first
  end

  # When the draw pile is empty, every discard pile card except the top one goes back into it, face down
  def refill_draw_pile
    top = discard_top
    cards("discard_pile").where.not(id: top&.id).update_all(location: "draw_pile", is_face_up: false, updated_at: Time.current)
  end

  # The last card put on the discard pile is the visible one
  def discard_top
    cards("discard_pile").order(:updated_at, :id).last
  end

  def hand_card!
    @game.cards.find_by(location: "hand", player: @player) || raise(Error, "Draw a card first.")
  end

  def grid_card!(card_id)
    cards("player_grid").find_by(player: @player, id: card_id) || raise(Error, "This card is not in your grid.")
  end

  def discard!(card)
    card.update!(location: "discard_pile", player: nil, row: nil, column: nil, is_face_up: true)
  end

  def end_turn
    players = @game.players.order(:turn_order).to_a
    next_player = players[(players.index(@player) + 1) % players.size]
    @game.update!(current_player: next_player, drawn_from: nil, turn_number: @game.turn_number + 1)
  end

  def cards(location)
    @game.cards.where(location: location)
  end
end
