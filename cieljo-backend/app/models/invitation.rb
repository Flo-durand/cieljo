class Invitation < ApplicationRecord
  belongs_to :game
  belongs_to :host, class_name: 'User'
  belongs_to :guest, class_name: 'User'

  validates :status, inclusion: { in: %w[pending accepted declined] }
end
