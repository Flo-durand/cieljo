Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      # --- Devise: only the sign-up route ---
      # devise_for must stay: it registers the User model with Devise (the sign-up controller needs it) and with
      # devise-jwt. Its own routes are skipped: Devise's sign in/out, password and account edit/delete routes
      # rely on Devise sessions, not on our JWT flow, so they could not work here (401 or 500). Account
      # edit/delete and "forgot password" emails are planned as our own endpoints using current_user (see
      # CLAUDE.md); the User model keeps every Devise module for them.
      devise_for :users, skip: %i[sessions passwords registrations], defaults: { format: :json }
      # Inside the api/v1 namespace, Devise names this mapping :api_v1_user (not :user)
      devise_scope :api_v1_user do
        # POST /api/v1/users signs up
        post "users", to: "users/registrations#create", as: :user_registration, defaults: { format: :json }
      end

      # --- Custom login route (outside Devise) ---
      post "auth/login", to: "auth#login", defaults: { format: :json }
      # Revokes every token of the logged-in user (all their devices)
      delete "auth/logout", to: "auth#logout", defaults: { format: :json }

      # GET /api/v1/me returns the logged-in user (and tells the frontend whether the session is still valid)
      resource :me, only: :show, controller: "me"

      # --- Game routes ---
      # GET /api/v1/games/:room_code returns the game and its players
      # GET /api/v1/games lists the games of the current user that are not finished (to come back to one)
      resources :games, only: [ :index, :create, :show ], param: :room_code do
        # POST /api/v1/games/join with { room_code }
        post :join, on: :collection
        # POST /api/v1/games/:room_code/start (host only)
        post :start, on: :member
        # POST /api/v1/games/:room_code/leave: the current user leaves the game
        post :leave, on: :member
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
