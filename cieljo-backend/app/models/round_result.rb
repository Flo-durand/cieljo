# The points a player scored in one round of a game (see RoundEndService); players.score is their total
class RoundResult < ApplicationRecord
  belongs_to :player

  validates :round_number, uniqueness: { scope: :player_id }
end
