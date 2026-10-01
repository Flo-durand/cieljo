Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      root to: "home#index"

      # Routes d'inscription/déconnexion Devise standards
      devise_for :users, controllers: {
        sessions: 'api/v1/users/sessions',
        registrations: 'api/v1/users/registrations'
      }, defaults: { format: :json }

      # --- NOTRE NOUVELLE ROUTE TOTALEMENT LIBRE ---
      post 'auth/login', to: 'auth#login', defaults: { format: :json }

      # --- LA ROUTE POUR LA CRÉATION DE PARTIE ---
      resources :games, only: [:create]
    end
  end
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
