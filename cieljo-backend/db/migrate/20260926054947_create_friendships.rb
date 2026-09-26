class CreateFriendships < ActiveRecord::Migration[8.1]
  def change
    create_table :friendships do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :friend_id, null: false
      t.string :status, null: false, default: "pending" # pending, accepted, blocked

      t.timestamps
    end

    add_index :friendships, :friend_id
    
    # Évite les doublons de demande d'ami entre deux mêmes personnes
    add_index :friendships, [:user_id, :friend_id], unique: true
  end
end
