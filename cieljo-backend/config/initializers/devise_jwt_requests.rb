# devise-jwt adds paths to its Rack middleware once the app has booted: it dispatches a token on Devise's sign in
# and sign up, and revokes it on Devise's sign out. It computes them from the Devise modules of the User model,
# whatever routes are really exposed.
#
# Our tokens do not go through that middleware: Api::V1::AuthController#login creates them (UserEncoder),
# ApplicationController#authenticate_user! checks them (TokenDecoder + jti), and Api::V1::AuthController#logout
# revokes them (User.revoke_jwt). Devise's sign in/out routes are not exposed (config/routes.rb), and the
# middleware cannot handle our tokens there anyway: they are encoded for the scope :user while Devise names the
# mapping :api_v1_user, so DELETE /api/v1/users/sign_out with a token crashed in the revocation middleware.
#
# So the middleware gets no path to act on. This block runs after devise-jwt's own after_initialize (gem
# initializers run before the app's).
# It does not change how tokens are created, checked or revoked.
Rails.application.config.after_initialize do
  Warden::JWTAuth.configure do |config|
    config.dispatch_requests = []
    config.revocation_requests = []
  end
end
