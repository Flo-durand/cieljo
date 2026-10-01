class ApplicationController < ActionController::API
  include Devise::Controllers::Helpers

  before_action :authenticate_user!

  # Méthode utilitaire pour accéder facilement au joueur connecté n'importe où
  attr_reader :current_user

  private

  def authenticate_user!
    # 1. On extrait la chaîne brute du token (on enlève "Bearer ")
    auth_header = request.headers['Authorization']
    token = auth_header.split(' ').last if auth_header.present?

    if token.present?
      begin
        # 2. On utilise le décodeur officiel de la gem pour valider la signature et lire le contenu
        payload, _header = Warden::JWTAuth::TokenDecoder.new.call(token)

        # 3. On charge l'utilisateur en base PostgreSQL à partir de l'identifiant (sub) stocké dans le JWT
        @current_user = User.find_by(id: payload['sub'])

        # 4. On vérifie si l'utilisateur existe et si son identifiant de token (jti) correspond (sécurité anti-vieux tokens)
        if @current_user && @current_user.jti == payload['jti']
          return true # Authentification réussie, on laisse passer la requête !
        end
      rescue => e
        # Si le token est expiré, falsifié ou altéré, le décodeur lève une erreur capturée ici
        logger.error "ÉCHEC DÉCODAGE JWT : #{e.message}"
      end
    end

    # 5. Si aucun token n'est valide, on coupe la route proprement en JSON
    render json: {
      status: 401,
      error: "Authentification requise. Session invalide ou expirée."
    }, status: :unauthorized
  end
end
