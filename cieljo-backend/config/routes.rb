Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      root to: "home#index"

      # Standard Devise sign-up/sign-out routes
      devise_for :users, controllers: {
        sessions: "api/v1/users/sessions",
        registrations: "api/v1/users/registrations"
      }, defaults: { format: :json }

      # --- Custom login route (outside Devise) ---
      post "auth/login", to: "auth#login", defaults: { format: :json }

      # --- Game routes ---
      # GET /api/v1/games/:room_code returns the game and its players
      resources :games, only: [ :create, :show ], param: :room_code do
        # POST /api/v1/games/join with { room_code }
        post :join, on: :collection
        # POST /api/v1/games/:room_code/start (host only)
        post :start, on: :member
        # POST /api/v1/games/:room_code/reveal with { card_id }
        post :reveal, on: :member
        # Turns: draw a card, then swap it with a grid card or discard it and reveal a grid card
        post :draw, on: :member
        post :swap, on: :member
        post :discard, on: :member
      end
    end
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
