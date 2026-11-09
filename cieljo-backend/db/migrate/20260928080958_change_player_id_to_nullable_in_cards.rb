class ChangePlayerIdToNullableInCards < ActiveRecord::Migration[8.1]
  def change
    # Allow the player_id column to be null
    change_column_null :cards, :player_id, true
  end
end
