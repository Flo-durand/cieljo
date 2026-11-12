class Api::V1::AuthController < ApplicationController
  # No CSRF protection or Devise filters needed here
  skip_before_action :authenticate_user!, only: [ :login ]
  def login
    # 1. Look up the user
    user = User.find_by(email: params[:user][:email])

    # 2. Check the password against Devise's encrypted password
    if user && user.valid_password?(params[:user][:password])
      # 3. Generate the JWT through the gem
      token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)

      render json: {
        status: { code: 200, message: "Logged in successfully." },
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          token: "Bearer #{token}"
        }
      }, status: :ok
    else
      render json: {
        status: { code: 401, message: "Login failed." },
        error: "Invalid email or password."
      }, status: :unauthorized
    end
  end
end
