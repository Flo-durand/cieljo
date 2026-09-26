# Protège l'application en fournissant un store de session valide à Devise
Rails.application.config.session_store :cookie_store, key: '_cieljo_session'
