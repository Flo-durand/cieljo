class Api::V1::HomeController < ApplicationController
  skip_before_action :authenticate_user!
  def index
    render json: {
      status: "online",
      message: "Welcome to the Cieljo API. The backend is ready to accept connections from React!"
    }, status: :ok
  end
end
