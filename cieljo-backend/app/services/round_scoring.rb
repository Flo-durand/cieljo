# The scores of a round, from the cards left in the grids: the cards of a removed column no longer count.
# The player who ended the round (revealed all their cards first) must have the lowest score: if another player
# has a score lower than or equal to theirs, their points are doubled (only when they are positive).
class RoundScoring
  Result = Data.define(:player, :points, :doubled)

  def initialize(game)
    @game = game
  end

  # One result per player, in turn order
  def results
    players = @game.players.order(:turn_order).to_a
    totals = @game.cards.where(location: "player_grid").group(:player_id).sum(:value)
    grid_points = players.to_h { |player| [ player.id, totals.fetch(player.id, 0) ] }
    ender_id = players.find { |player| player.turn_order == @game.round_ender_turn_order }&.id

    players.map do |player|
      points = grid_points[player.id]
      doubled = player.id == ender_id && points.positive? &&
                grid_points.any? { |id, other_points| id != player.id && other_points <= points }
      Result.new(player: player, points: doubled ? points * 2 : points, doubled: doubled)
    end
  end
end
