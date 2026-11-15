# The account of the logged-in user. The frontend calls it to check that the session is still valid.
# Editing and deleting the account (PATCH / DELETE /api/v1/me) are planned here.
class Api::V1::MeController < ApplicationController
  # GET /api/v1/me
  def show
    render json: {
      data: {
        id: current_user.id,
        email: current_user.email,
        username: current_user.username
      }
    }, status: :ok
  end
end
