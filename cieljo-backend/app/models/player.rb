class Player < ApplicationRecord
  belongs_to :user
  belongs_to :game
  # The cards in the player's grid or hand leave the game with the player (a card in the piles has no player)
  has_many :cards, dependent: :delete_all

  # A user can only appear once in a given game (also enforced by a unique DB index)
  validates :user_id, uniqueness: { scope: :game_id, message: "is already in this game" }
end
