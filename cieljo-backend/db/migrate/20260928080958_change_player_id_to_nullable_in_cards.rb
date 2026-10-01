class ChangePlayerIdToNullableInCards < ActiveRecord::Migration[8.1]
  def change
    # On indique à PostgreSQL que la colonne player_id peut être nulle (true)
    change_column_null :cards, :player_id, true
  end
end
