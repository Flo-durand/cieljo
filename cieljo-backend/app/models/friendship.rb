class Friendship < ApplicationRecord
  belongs_to :user
  belongs_to :friend, class_name: 'User'

  # Validation du statut de l'amitié
  validates :status, inclusion: { in: %w[pending accepted blocked] }

  # Empêche de s'ajouter soi-même en ami
  validate :cannot_add_self

  private

  def cannot_add_self
    errors.add(:friend_id, "ne peut pas être vous-même") if user_id == friend_id
  end
end
