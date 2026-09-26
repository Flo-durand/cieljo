class Api::V1::HomeController < ApplicationController
  def index
    render json: {
      status: "online",
      message: "Bienvenue sur l'API Cieljo. Le backend est prêt à recevoir les connexions de React !"
    }, status: :ok
  end
end
