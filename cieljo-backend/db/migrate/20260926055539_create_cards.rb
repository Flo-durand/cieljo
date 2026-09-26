class CreateCards < ActiveRecord::Migration[8.1]
  def change
    create_table :cards do |t|
      t.references :game, null: false, foreign_key: true
      t.references :player, null: false, foreign_key: true
      t.integer :value, null: false
      t.integer :row
      t.integer :column
      t.string :location, null: false
      t.boolean :is_face_up, null: false, default: false

      t.timestamps
    end
    add_index :cards, :location
  end
end
