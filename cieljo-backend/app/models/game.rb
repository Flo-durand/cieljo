class Game < ApplicationRecord
  # Cards must be deleted BEFORE players: cards.player_id has a foreign key to players.
  # delete_all removes the whole deck in one SQL query (Card has no callbacks).
  has_many :cards, dependent: :delete_all
  has_many :players, dependent: :destroy
  has_many :users, through: :players
  has_many :invitations, dependent: :destroy

  # Points to the active player
  belongs_to :current_player, class_name: "Player", optional: true

  validates :room_code, presence: true, uniqueness: true
  validates :status, inclusion: { in: %w[pending in_progress round_over finished] }
  # Where the current player took the card in their hand from (nil when they hold no card)
  validates :drawn_from, inclusion: { in: %w[draw_pile discard_pile] }, allow_nil: true

  # Number of cards each player reveals at the start of the game
  INITIAL_REVEAL_COUNT = 2
  # The official Skyjo rules are for 2 to 8 players
  MAX_PLAYERS = 8
  # The game ends with the round in which a player reaches this total score
  END_SCORE = 100
  # Between two rounds, the next one starts once every player is ready, or after this delay
  NEXT_ROUND_DELAY = 30.seconds

  # Automatically generate a unique 4-character room code before creating the game
  before_validation :generate_room_code, on: :create

  # Once the game has started, the first player is only chosen after everyone has revealed their first cards
  def initial_reveal_phase?
    status == "in_progress" && current_player_id.nil?
  end

  # The last round begins when a player has revealed all the cards left in their grid: every other player
  # plays once more, then the round ends (see TurnService and RoundEndService)
  def last_round?
    status == "in_progress" && round_ender_turn_order.present?
  end

  # The round is over when the player who ended it is next to play, after everyone else played their last
  # turn. The turn goes from the seat from_turn_order to the seat to_turn_order: it is over if it reaches or
  # passes the seat of that player (passes it when that player has quit the game in the meantime).
  def round_over_when_turn_passes?(from_turn_order, to_turn_order)
    seat = round_ender_turn_order
    return false unless seat

    if from_turn_order < to_turn_order
      seat > from_turn_order && seat <= to_turn_order
    else
      # The turn goes back around the table to the first seats
      seat > from_turn_order || seat <= to_turn_order
    end
  end

  # The player who ended the round, or nil (no last round yet, or that player has quit the game)
  def round_ender
    round_ender_turn_order && players.find_by(turn_order: round_ender_turn_order)
  end

  # The round is scored between two rounds (round_over) and at the end of the game when a player reached
  # END_SCORE. A game finished because only one player is left after the others quit (see LeaveGameService) has
  # no scores to show for its round.
  def round_scored?
    status == "round_over" || (status == "finished" && round_ender_turn_order.present?)
  end

  # Between two rounds: when the next round starts even if some players are not ready (see NextRoundService)
  def next_round_at
    round_ended_at && round_ended_at + NEXT_ROUND_DELAY
  end

  # Puts a card face up on top of the discard pile. The discard pile is ordered by updated_at: each card put on
  # it gets a later time than the previous top card, even when several cards are discarded at once (a removed
  # column), so its order is never ambiguous.
  def discard!(card)
    card.update!(location: "discard_pile", player: nil, row: nil, column: nil, is_face_up: true, updated_at: next_discard_time)
  end

  private

  def next_discard_time
    now = Time.current
    latest = cards.where(location: "discard_pile").maximum(:updated_at)
    latest && latest >= now ? latest + Rational(1, 1_000_000) : now
  end

  def generate_room_code
    loop do
      self.room_code = SecureRandom.alphanumeric(4).upcase
      break unless Game.exists?(room_code: room_code)
    end
  end
end
