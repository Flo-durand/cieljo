class Api::V1::Users::RegistrationsController < Devise::RegistrationsController
  include RackSessionFix
  respond_to :json

  private

  # Override Devise's method to skip the cookie-based sign-in.
  # Just return true without calling any other navigation methods.
  def sign_up(resource_name, resource)
    true
  end

  # Format the JSON response sent to React
  def respond_with(resource, _opts = {})
    if resource.persisted?
      render json: {
        status: { code: 200, message: "Signed up successfully." },
        data: {
          id: resource.id,
          email: resource.email,
          username: resource.username
        }
      }, status: :ok
    else
      render json: {
        status: { message: "Sign-up failed.", errors: resource.errors.full_messages }
      }, status: :unprocessable_entity
    end
  end

  # Strong parameters for the API
  def sign_up_params
    params.require(:user).permit(:email, :password, :username)
  end
end
