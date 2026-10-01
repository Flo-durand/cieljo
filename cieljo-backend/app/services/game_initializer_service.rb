class GameInitializerService
  def initialize(game)
    @game = game
  end

  def call
    # On enveloppe le tout dans une transaction SQL pour des performances optimales et éviter les bugs
    Card.transaction do
      generate_deck
    end
  end

  private

  def generate_deck
    cards_to_create = []

    # 1. Définition de la répartition exacte du Skyjo
    distribution = {
      -2 => 5,
      -1 => 15
    }
    # On ajoute 10 exemplaires pour chaque valeur de 1 à 12
    (0..12).each { |v| distribution[v] = 10 }

    # 2. Génération de la liste brute des cartes
    distribution.each do |value, count|
      count.times do
        cards_to_create << {
          game_id: @game.id,
          value: value,
          location: 'draw_pile',
          is_face_up: false,
          created_at: Time.current,
          updated_at: Time.current
        }
      end
    end

    # 3. Mélange aléatoire du deck (Algorithme natif de Ruby)
    cards_to_create.shuffle!

    # 4. Insertion en masse (Bulk Insert) dans PostgreSQL pour une vitesse maximale
    Card.insert_all!(cards_to_create)
  end
end
