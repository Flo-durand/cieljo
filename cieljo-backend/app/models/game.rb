class Game < ApplicationRecord
  has_many :players, dependent: :destroy
  has_many :users, through: :players
  has_many :cards, dependent: :destroy
  has_many :invitations, dependent: :destroy

  # Permet de cibler le joueur actif
  belongs_to :current_player, class_name: 'Player', optional: true

  validates :room_code, presence: true, uniqueness: true
  validates :status, inclusion: { in: %w[pending in_progress finished] }

  # Génère automatiquement un code de salon unique à 4 lettres avant de créer la partie
  before_validation :generate_room_code, on: :create

  private

  def generate_room_code
    loop do
      self.room_code = SecureRandom.alphanumeric(4).upcase
      break unless Game.exists?(room_code: room_code)
    end
  end
end
