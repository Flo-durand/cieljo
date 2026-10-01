class Api::V1::Users::SessionsController < Devise::SessionsController
  include RackSessionFix
  respond_to :json

  private

  def respond_with(resource, _opts = {})
    render json: { status: { code: 200, message: "Connexion réussie." }, data: resource }, status: :ok
  end

  def respond_to_on_destroy
    if current_user
      render json: { status: 200, message: "Déconnexion réussie." }, status: :ok
    else
      render json: { status: 401, message: "Aucune session active trouvée." }, status: :unauthorized
    end
  end
end
