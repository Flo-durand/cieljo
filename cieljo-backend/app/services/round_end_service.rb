# Ends the round once everyone has played their last turn: every card left in the grids is revealed, the points
# of the round (RoundScoring) are added to each player's score, and the game is finished (a game has a single
# round for now). Called by TurnService and LeaveGameService, inside their lock of the game row.
class RoundEndService
  def initialize(game)
    @game = game
  end

  def call
    @game.cards.where(location: "player_grid", is_face_up: false).update_all(is_face_up: true, updated_at: Time.current)
    RoundScoring.new(@game).results.each do |result|
      result.player.update!(score: result.player.score + result.points)
    end
    @game.update!(status: "finished", current_player: nil, drawn_from: nil)
  end
end
