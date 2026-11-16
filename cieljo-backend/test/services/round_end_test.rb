require "test_helper"

# The end of the round: the last round (TurnService), the scores (RoundScoring, RoundEndService) and quitting
# during the last round (LeaveGameService).
class RoundEndTest < ActiveSupport::TestCase
  # Game one is started with 3 players and the initial reveal is skipped: player one plays first.
  setup do
    @game = games(:one)
    GameInitializerService.new(@game).call
    third_user = User.create!(email: "three@example.com", username: "player_three", password: "password123")

    @p1 = players(:one)
    @p1.update!(score: 0)
    @p2 = @game.players.create!(user: users(:two), score: 0, turn_order: 2)
    @p3 = @game.players.create!(user: third_user, score: 0, turn_order: 3)

    GameStarterService.new(@game).call
    @game.update!(current_player: @p1)
  end

  # --- Helpers ---

  def grid(player)
    @game.cards.where(location: "player_grid", player: player).order(:row, :column)
  end

  # Gives the player's grid values worth `total` points, with no column of 3 identical values (so no move removes
  # a column). The card at row 2, column 3 stays face down when `all_but_one` is set, every other card is face
  # up; otherwise the whole grid is face down.
  def set_grid(player, total, all_but_one: false)
    values = [ total - 6, 1, 2, 3, 0, -1, 1, 2, 1, 0, -1, -2 ]
    raise ArgumentError, "a total of 6 or 7 makes a column of identical values" if [ 0, 1 ].include?(values.first)

    grid(player).each_with_index do |card, index|
      card.update!(value: values[index], is_face_up: all_but_one && index != 11)
    end
  end

  # Draws from the draw pile, throws the card and reveals a face-down card of the grid
  def play_turn(player)
    service = TurnService.new(@game, player)
    service.draw("draw_pile")
    service.discard(grid(player).find_by(is_face_up: false).id)
  end

  def results
    RoundScoring.new(@game).results.to_h { |result| [ result.player.turn_order, [ result.points, result.doubled ] ] }
  end

  # --- The last round ---

  test "revealing the last face-down card of a grid starts the last round" do
    set_grid(@p1, 10, all_but_one: true)

    play_turn(@p1)

    @game.reload
    assert @game.last_round?
    assert_equal 1, @game.round_ender_turn_order
    assert_equal @p1, @game.round_ender
    assert_equal @p2, @game.current_player, "the other players still play"
    assert_equal "in_progress", @game.status
  end

  test "a grid with face-down cards left does not start the last round" do
    set_grid(@p1, 10)

    play_turn(@p1)

    assert_not @game.reload.last_round?
  end

  test "each other player plays once more, then the round ends with every card face up" do
    set_grid(@p1, 10, all_but_one: true)
    play_turn(@p1)
    play_turn(@p2)
    assert_equal "in_progress", @game.reload.status
    assert_equal @p3, @game.current_player

    play_turn(@p3)

    @game.reload
    assert_equal "finished", @game.status
    assert @game.round_scored?
    assert_nil @game.current_player
    assert_nil @game.drawn_from
    assert grid(@p2).all?(&:is_face_up)
    assert grid(@p3).all?(&:is_face_up)
  end

  test "when a later seat ends the round, the turn goes around the table back to that seat" do
    play_turn(@p1)
    set_grid(@p2, 10, all_but_one: true)
    play_turn(@p2)
    play_turn(@p3)
    assert_equal @p1, @game.reload.current_player

    play_turn(@p1)

    assert_equal "finished", @game.reload.status
  end

  test "another player revealing all their cards during the last round does not change who ended it" do
    set_grid(@p1, 10, all_but_one: true)
    play_turn(@p1)
    set_grid(@p2, 20, all_but_one: true)

    play_turn(@p2)

    assert_equal 1, @game.reload.round_ender_turn_order
    assert_equal "in_progress", @game.status
  end

  test "removing the last column of face-down cards starts the last round" do
    set_grid(@p1, 10, all_but_one: true)
    column = grid(@p1).where(column: 3).order(:row).to_a
    column[0].update!(value: 4)
    column[1].update!(value: 4)
    column[2].update!(value: 4)
    service = TurnService.new(@game, @p1)
    service.draw("draw_pile")

    service.discard(column[2].id)

    assert_equal 3, service.removed_column[:column]
    assert @game.reload.last_round?
  end

  # --- Scores ---

  def finish_round(p1:, p2:, p3:)
    set_grid(@p1, p1, all_but_one: true)
    set_grid(@p2, p2)
    set_grid(@p3, p3)
    play_turn(@p1)
    play_turn(@p2)
    play_turn(@p3)
    @game.reload
  end

  test "each player scores the cards of their grid, added to their score" do
    finish_round(p1: 10, p2: 20, p3: 30)

    assert_equal({ 1 => [ 10, false ], 2 => [ 20, false ], 3 => [ 30, false ] }, results)
    assert_equal [ 10, 20, 30 ], [ @p1, @p2, @p3 ].map { |player| player.reload.score }
  end

  test "the player who ended the round has their points doubled when another score is lower" do
    finish_round(p1: 20, p2: 10, p3: 30)

    assert_equal({ 1 => [ 40, true ], 2 => [ 10, false ], 3 => [ 30, false ] }, results)
    assert_equal 40, @p1.reload.score
  end

  test "the player who ended the round has their points doubled when another score is equal" do
    finish_round(p1: 20, p2: 20, p3: 30)

    assert_equal [ 40, true ], results[1]
  end

  test "points that are not positive are never doubled" do
    finish_round(p1: -4, p2: -5, p3: 30)

    assert_equal [ -4, false ], results[1]
  end

  test "the cards of a removed column no longer count" do
    set_grid(@p1, 10)
    @game.update!(round_ender_turn_order: 2)
    grid(@p1).where(column: 0).each { |card| @game.discard!(card) }

    # Column 0 held 4, 0 and 1 (see set_grid)
    assert_equal 5, results[1][0]
  end

  test "an empty grid scores 0" do
    @game.cards.where(location: "player_grid", player: @p1).find_each { |card| @game.discard!(card) }
    @game.update!(round_ender_turn_order: 1)

    assert_equal [ 0, false ], results[1]
  end

  # --- Quitting during the last round ---

  test "when the player who ended the round quits, the round still ends when the turn passes their seat" do
    set_grid(@p1, 10, all_but_one: true)
    play_turn(@p1)
    LeaveGameService.new(@game, @p1).call
    play_turn(@p2)
    assert_equal "in_progress", @game.reload.status

    play_turn(@p3)

    @game.reload
    assert_equal "finished", @game.status
    assert @game.round_scored?
    assert_nil @game.round_ender
    assert_equal [ 2, 3 ], results.keys
  end

  test "when the last player to play quits, the round ends" do
    set_grid(@p1, 10, all_but_one: true)
    set_grid(@p2, 20)
    play_turn(@p1)
    play_turn(@p2)

    LeaveGameService.new(@game, @p3).call

    @game.reload
    assert_equal "finished", @game.status
    assert @game.round_scored?
    assert_equal 10, @p1.reload.score
    assert_equal 20, @p2.reload.score
  end

  test "a game left with a single player during the last round is finished without scores" do
    set_grid(@p1, 10, all_but_one: true)
    play_turn(@p1)

    LeaveGameService.new(@game, @p2).call
    LeaveGameService.new(@game, @p3).call

    @game.reload
    assert_equal "finished", @game.status
    assert_not @game.round_scored?
    assert_equal 0, @p1.reload.score
  end
end
