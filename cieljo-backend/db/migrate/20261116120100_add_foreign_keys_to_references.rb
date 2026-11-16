# Some reference columns were plain integers without a foreign key, while ids are bigint: nothing stopped them
# from pointing to a deleted record. They become bigint with a foreign key.
# - games.current_player_id: set to NULL when the player is deleted (a player leaving, a game being deleted).
# - friendships.friend_id, invitations.host_id and guest_id: the User model deletes them with the user.
class AddForeignKeysToReferences < ActiveRecord::Migration[8.1]
  def up
    # current_player_id is recomputed during the game: a dangling one is safely cleared. Friendships and
    # invitations are not cleaned up on purpose: a dangling one makes the migration fail instead of losing data.
    execute <<~SQL
      UPDATE games SET current_player_id = NULL
      WHERE current_player_id IS NOT NULL AND current_player_id NOT IN (SELECT id FROM players)
    SQL

    change_column :games, :current_player_id, :bigint
    add_foreign_key :games, :players, column: :current_player_id, on_delete: :nullify

    change_column :friendships, :friend_id, :bigint
    add_foreign_key :friendships, :users, column: :friend_id

    change_column :invitations, :host_id, :bigint
    change_column :invitations, :guest_id, :bigint
    add_foreign_key :invitations, :users, column: :host_id
    add_foreign_key :invitations, :users, column: :guest_id
  end

  def down
    remove_foreign_key :invitations, column: :guest_id
    remove_foreign_key :invitations, column: :host_id
    change_column :invitations, :guest_id, :integer
    change_column :invitations, :host_id, :integer

    remove_foreign_key :friendships, column: :friend_id
    change_column :friendships, :friend_id, :integer

    remove_foreign_key :games, column: :current_player_id
    change_column :games, :current_player_id, :integer
  end
end
