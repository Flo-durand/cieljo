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
  validates :status, inclusion: { in: %w[pending in_progress finished] }
  # Where the current player took the card in their hand from (nil when they hold no card)
  validates :drawn_from, inclusion: { in: %w[draw_pile discard_pile] }, allow_nil: true

  # Number of cards each player reveals at the start of the game
  INITIAL_REVEAL_COUNT = 2
  # The official Skyjo rules are for 2 to 8 players
  MAX_PLAYERS = 8

  # Automatically generate a unique 4-character room code before creating the game
  before_validation :generate_room_code, on: :create

  # Once the game has started, the first player is only chosen after everyone has revealed their first cards
  def initial_reveal_phase?
    status == "in_progress" && current_player_id.nil?
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
