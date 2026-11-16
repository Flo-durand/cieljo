# Almost every query on the cards filters by game and location (the draw pile, a grid, the discard pile...):
# one composite index serves them. It also serves the queries by game only (its first column), so the
# separate indexes on game_id and on location are no longer needed.
class IndexCardsByGameAndLocation < ActiveRecord::Migration[8.1]
  def change
    add_index :cards, [ :game_id, :location ]
    remove_index :cards, :game_id
    remove_index :cards, :location
  end
end
