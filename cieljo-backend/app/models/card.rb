class Card < ApplicationRecord
  belongs_to :game
  # Cards in the draw pile don't belong to any player yet
  belongs_to :player, optional: true
end
