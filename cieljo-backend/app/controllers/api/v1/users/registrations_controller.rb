class Api::V1::Users::RegistrationsController < Devise::RegistrationsController
  respond_to :json

  private

  # On surcharge la méthode de Devise pour éviter la tentative de connexion par cookie.
  # On retourne simplement true sans appeler d'autres méthodes de navigation.
  def sign_up(resource_name, resource)
    true
  end

  # Formatage de la réponse JSON envoyée à React
  def respond_with(resource, _opts = {})
    if resource.persisted?
      render json: {
        status: { code: 200, message: "Inscription réussie." },
        data: {
          id: resource.id,
          email: resource.email,
          username: resource.username
        }
      }, status: :ok
    else
      render json: {
        status: { message: "L'inscription a échoué.", errors: resource.errors.full_messages }
      }, status: :unprocessable_entity
    end
  end

  # Strong parameters pour l'API
  def sign_up_params
    params.require(:user).permit(:email, :password, :username)
  end
end
