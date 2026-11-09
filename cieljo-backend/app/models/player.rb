class Player < ApplicationRecord
  belongs_to :user
  belongs_to :game

  # A user can only appear once in a given game (also enforced by a unique DB index)
  validates :user_id, uniqueness: { scope: :game_id, message: "is already in this game" }
end
