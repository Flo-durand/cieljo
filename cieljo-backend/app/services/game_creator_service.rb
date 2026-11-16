# Creates a game room with the user as host and its shuffled 150-card deck, all or nothing: if one step fails,
# the transaction leaves no game without a host or without cards.
class GameCreatorService
  def initialize(user)
    @user = user
  end

  def call
    Game.transaction do
      game = Game.create!(status: "pending", turn_number: 1)
      host = game.players.create!(user: @user, score: 0, turn_order: 1)
      game.update!(current_player: host)
      GameInitializerService.new(game).call
      game
    end
  end
end
