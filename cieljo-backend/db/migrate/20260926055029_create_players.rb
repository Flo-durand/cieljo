class CreatePlayers < ActiveRecord::Migration[8.1]
  def change
    create_table :players do |t|
      t.references :user, null: false, foreign_key: true
      t.references :game, null: false, foreign_key: true
      t.integer :score, null: false, default: 0
      t.integer :turn_order

      t.timestamps
    end
    add_index :players, [:user_id, :game_id], unique: true
  end
end
