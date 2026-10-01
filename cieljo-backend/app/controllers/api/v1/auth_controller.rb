class Api::V1::AuthController < ApplicationController
  # Pas besoin de protection CSRF ou de filtres Devise ici
  skip_before_action :authenticate_user!, only: [:login]
  def login
    # 1. Recherche de l'utilisateur en base
    user = User.find_by(email: params[:user][:email])

    # 2. Vérification sécurisée du mot de passe crypté par Devise
    if user && user.valid_password?(params[:user][:password])
      # 3. Génération garantie du jeton JWT via la gem
      token, _payload = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)

      render json: {
        status: { code: 200, message: "Connexion réussie." },
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          token: "Bearer #{token}"
        }
      }, status: :ok
    else
      render json: {
        status: { code: 401, message: "Échec de la connexion." },
        error: "Email ou mot de passe incorrect."
      }, status: :unauthorized
    end
  end
end
