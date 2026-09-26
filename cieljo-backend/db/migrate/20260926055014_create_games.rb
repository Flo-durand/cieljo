class CreateGames < ActiveRecord::Migration[8.1]
  def change
    create_table :games do |t|
      t.string :status, null: false, default: "pending"
      t.string :room_code, null: false
      t.integer :current_player_id
      t.integer :turn_number, null: false, default: 1

      t.timestamps
    end
    add_index :games, :room_code, unique: true
    add_index :games, :current_player_id
  end
end
