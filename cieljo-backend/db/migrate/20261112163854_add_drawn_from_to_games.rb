class AddDrawnFromToGames < ActiveRecord::Migration[8.1]
  def change
    add_column :games, :drawn_from, :string
  end
end
