class Api::V1::Users::SessionsController < Devise::SessionsController
  respond_to :json

  private

  # Réponse lors de la connexion réussie
  def respond_with(resource, _opts = {})
    render json: {
      status: { code: 200, message: "Connexion réussie." },
      data: {
        id: resource.id,
        email: resource.email,
        username: resource.username
      }
    }, status: :ok
  end

  # Réponse lors de la déconnexion (destruction du token)
  def respond_to_on_destroy
    if current_user
      render json: {
        status: 200,
        message: "Déconnexion réussie."
      }, status: :ok
    else
      render json: {
        status: 401,
        message: "Aucune session active trouvée."
      }, status: :unauthorized
    end
  end
end
