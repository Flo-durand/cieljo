class CreateInvitations < ActiveRecord::Migration[8.1]
  def change
    create_table :invitations do |t|
      t.references :game, null: false, foreign_key: true
      t.integer :host_id, null: false
      t.integer :guest_id, null: false
      t.string :status, null: false, default: "pending" # pending, accepted, declined

      t.timestamps
    end
    add_index :invitations, :host_id
    add_index :invitations, :guest_id
  end
end
