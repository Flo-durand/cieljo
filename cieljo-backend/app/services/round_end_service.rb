# Ends the round once everyone has played their last turn: every card left in the grids is revealed, the points
# of the round (RoundScoring) are saved in the history (RoundResult) and added to each player's score. When a
# player reaches Game::END_SCORE, the game is finished; otherwise the players get ready for the next round
# (status round_over, see NextRoundService). Called by TurnService and LeaveGameService, inside their lock of the
# game row.
class RoundEndService
  def initialize(game)
    @game = game
  end

  def call
    @game.cards.where(location: "player_grid", is_face_up: false).update_all(is_face_up: true, updated_at: Time.current)
    RoundScoring.new(@game).results.each do |result|
      player = result.player
      player.round_results.create!(round_number: @game.round_number, points: result.points, doubled: result.doubled)
      player.update!(score: player.score + result.points, ready_for_next_round: false)
    end

    game_over = @game.players.where(score: Game::END_SCORE..).exists?
    @game.update!(
      status: game_over ? "finished" : "round_over",
      current_player: nil,
      drawn_from: nil,
      round_ended_at: game_over ? nil : Time.current
    )
  end
end
