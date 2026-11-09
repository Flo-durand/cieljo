class User < ApplicationRecord
  include Devise::JWT::RevocationStrategies::JTIMatcher
  # Include default devise modules. Others available are:
  # :confirmable, :lockable, :timeoutable, :trackable and :omniauthable
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: self

  def jwt_payload
    super.merge('jti' => self.jti)
  end
  
  # Automatically generate a JTI when the user is created
  before_create :generate_jti

  # 1. Avatar (Active Storage)
  # has_one_attached :avatar

  # 2. Players and games
  has_many :players, dependent: :destroy
  has_many :games, through: :players

  # 3. Friends list (self-join)
  # Friend requests I sent
  has_many :friendships, dependent: :destroy
  has_many :friends, through: :friendships

  # Friend requests I received (the inverse)
  has_many :inverse_friendships, class_name: 'Friendship', foreign_key: 'friend_id', dependent: :destroy
  has_many :inverse_friends, through: :inverse_friendships, source: :user

  # 4. Game invitations
  has_many :sent_invitations, class_name: 'Invitation', foreign_key: 'host_id', dependent: :destroy
  has_many :received_invitations, class_name: 'Invitation', foreign_key: 'guest_id', dependent: :destroy

  # Validations
  validates :username, presence: true, uniqueness: { case_sensitive: false }, length: { minimum: 3, maximum: 20 }

  private

  def generate_jti
    self.jti ||= SecureRandom.uuid
  end
end
