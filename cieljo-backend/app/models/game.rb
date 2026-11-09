class Game < ApplicationRecord
  # Cards must be deleted BEFORE players: cards.player_id has a foreign key to players.
  # delete_all removes the whole deck in one SQL query (Card has no callbacks).
  has_many :cards, dependent: :delete_all
  has_many :players, dependent: :destroy
  has_many :users, through: :players
  has_many :invitations, dependent: :destroy

  # Points to the active player
  belongs_to :current_player, class_name: 'Player', optional: true

  validates :room_code, presence: true, uniqueness: true
  validates :status, inclusion: { in: %w[pending in_progress finished] }

  # Automatically generate a unique 4-character room code before creating the game
  before_validation :generate_room_code, on: :create

  private

  def generate_room_code
    loop do
      self.room_code = SecureRandom.alphanumeric(4).upcase
      break unless Game.exists?(room_code: room_code)
    end
  end
end
