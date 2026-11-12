class Friendship < ApplicationRecord
  belongs_to :user
  belongs_to :friend, class_name: "User"

  # Validate the friendship status
  validates :status, inclusion: { in: %w[pending accepted blocked] }

  # Prevent users from adding themselves as a friend
  validate :cannot_add_self

  private

  def cannot_add_self
    errors.add(:friend_id, "can't be yourself") if user_id == friend_id
  end
end
