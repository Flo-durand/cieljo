class GameInitializerService
  def initialize(game)
    @game = game
  end

  def call
    # Wrap everything in a SQL transaction for performance and consistency
    Card.transaction do
      generate_deck
    end
  end

  private

  def generate_deck
    cards_to_create = []

    # 1. Exact Skyjo card distribution
    distribution = {
      -2 => 5,
      -1 => 15
    }
    # Add 10 copies of each value from 0 to 12
    (0..12).each { |v| distribution[v] = 10 }

    # 2. Build the raw card list
    distribution.each do |value, count|
      count.times do
        cards_to_create << {
          game_id: @game.id,
          value: value,
          location: "draw_pile",
          is_face_up: false,
          created_at: Time.current,
          updated_at: Time.current
        }
      end
    end

    # 3. Shuffle the deck (Ruby's built-in shuffle)
    cards_to_create.shuffle!

    # 4. Bulk insert into PostgreSQL for speed
    Card.insert_all!(cards_to_create)
  end
end
