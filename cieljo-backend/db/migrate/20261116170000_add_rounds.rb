# Several rounds per game, until a player reaches Game::END_SCORE points:
# - games.round_number: the round being played (1 for the first one);
# - games.round_ended_at: when the last round ended, while the players get ready for the next one (status
#   round_over); the next round starts once everyone is ready, or Game::NEXT_ROUND_DELAY after this time;
# - games.first_player_turn_order: the seat of the player who plays first once the cards are revealed (the player
#   who ended the previous round), or nil (the player with the highest revealed total plays first);
# - players.ready_for_next_round: the player is ready for the next round;
# - round_results: the points of each player for each round (the history shown in the score table).
class AddRounds < ActiveRecord::Migration[8.1]
  def change
    add_column :games, :round_number, :integer, default: 1, null: false
    add_column :games, :round_ended_at, :datetime
    add_column :games, :first_player_turn_order, :integer
    add_column :players, :ready_for_next_round, :boolean, default: false, null: false

    create_table :round_results do |t|
      t.references :player, null: false, foreign_key: { on_delete: :cascade }
      t.integer :round_number, null: false
      t.integer :points, null: false
      t.boolean :doubled, default: false, null: false
      t.timestamps
    end
    add_index :round_results, %i[player_id round_number], unique: true
  end
end
