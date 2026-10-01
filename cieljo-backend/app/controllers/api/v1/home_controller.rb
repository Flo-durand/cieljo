class Api::V1::HomeController < ApplicationController
  skip_before_action :authenticate_user!
  def index
    render json: {
      status: "online",
      message: "Bienvenue sur l'API Cieljo. Le backend est prêt à recevoir les connexions de React !"
    }, status: :ok
  end
end
