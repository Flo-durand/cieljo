class Api::V1::AuthController < ApplicationController
  # No CSRF protection or Devise filters needed here
  skip_before_action :authenticate_user!, only: [ :login ]
  # Slows down password guessing: 10 login attempts per 3 minutes for an IP address
  rate_limit to: 10, within: 3.minutes, only: :login, with: -> { render_rate_limited }

  def login
    # 1. Read the credentials: a request without a "user" object is refused with a 400 (see below)
    credentials = params.expect(user: [ :email, :password ])

    # 2. Look up the user
    user = User.find_by(email: credentials[:email])

    # 3. Check the password against Devise's encrypted password
    if user && user.valid_password?(credentials[:password])
      # 4. Generate the JWT through the gem
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
  rescue ActionController::ParameterMissing
    render json: { error: "Email and password are required." }, status: :bad_request
  end

  # DELETE /api/v1/auth/logout
  # Revokes the token with the revocation strategy of the User model (JTIMatcher): the user gets a new jti, so
  # every token issued before stops working. There is one jti per user, so this logs the user out of all
  # their devices.
  def logout
    User.revoke_jwt(nil, current_user)

    render json: { status: { code: 200, message: "Logged out successfully." } }, status: :ok
  end
end
