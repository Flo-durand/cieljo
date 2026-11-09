class ApplicationController < ActionController::API
  include Devise::Controllers::Helpers

  before_action :authenticate_user!

  # Helper to access the signed-in user from anywhere
  attr_reader :current_user

  private

  def authenticate_user!
    # 1. Extract the raw token string (strip the "Bearer " prefix)
    auth_header = request.headers['Authorization']
    token = auth_header.split(' ').last if auth_header.present?

    if token.present?
      begin
        # 2. Use the gem's decoder to verify the signature and read the payload
        payload, _header = Warden::JWTAuth::TokenDecoder.new.call(token)

        # 3. Load the user from PostgreSQL using the id (sub) stored in the JWT
        @current_user = User.find_by(id: payload['sub'])

        # 4. Check the user exists and the token id (jti) matches (rejects revoked tokens)
        if @current_user && @current_user.jti == payload['jti']
          return true # Authenticated, let the request through
        end
      rescue => e
        # Expired, forged or tampered tokens make the decoder raise
        logger.error "JWT DECODING FAILED: #{e.message}"
      end
    end

    # 5. No valid token: halt with a JSON error
    render json: {
      status: 401,
      error: "Authentication required. Invalid or expired session."
    }, status: :unauthorized
  end
end
