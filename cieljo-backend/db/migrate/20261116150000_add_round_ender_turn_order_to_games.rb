# The seat (turn order) of the player who revealed all their cards first: the last round has begun, and it
# ends when the turn comes back to that seat. A seat rather than a player id, so the last round still ends at
# the right time if that player quits (seats are only renumbered in the lobby).
class AddRoundEnderTurnOrderToGames < ActiveRecord::Migration[8.1]
  def change
    add_column :games, :round_ender_turn_order, :integer
  end
end
