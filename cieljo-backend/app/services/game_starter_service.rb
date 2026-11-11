# Starts a pending game: deals a 3x4 grid of face-down cards to every player,
# flips the first draw pile card onto the discard pile and sets the game in progress.
class GameStarterService
  MIN_PLAYERS = 2
  GRID_ROWS = 3
  GRID_COLUMNS = 4

  class Error < StandardError; end

  def initialize(game)
    @game = game
  end

  def call
    # Lock the game row so two simultaneous start requests cannot deal twice
    @game.with_lock do
      raise Error, "This game has already started or is finished." unless @game.status == "pending"

      players = @game.players.order(:turn_order).to_a
      raise Error, "At least #{MIN_PLAYERS} players are needed to start the game." if players.size < MIN_PLAYERS

      # The deck was shuffled before insertion, so the id order is the draw pile order
      draw_pile = @game.cards.where(location: "draw_pile").order(:id).to_a
      needed = players.size * GRID_ROWS * GRID_COLUMNS + 1
      raise Error, "Not enough cards in the draw pile." if draw_pile.size < needed

      players.each { |player| deal_grid(player, draw_pile) }
      draw_pile.shift.update!(location: "discard_pile", is_face_up: true)

      @game.update!(status: "in_progress")
    end
  end

  private

  def deal_grid(player, draw_pile)
    GRID_ROWS.times do |row|
      GRID_COLUMNS.times do |column|
        draw_pile.shift.update!(location: "player_grid", player: player, row: row, column: column, is_face_up: false)
      end
    end
  end
end
