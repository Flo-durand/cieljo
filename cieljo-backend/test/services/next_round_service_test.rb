require "test_helper"

# Between two rounds: the players get ready, then the next round is dealt (NextRoundService), and the player who
# ended the previous round plays first once the cards are revealed (InitialRevealService).
class NextRoundServiceTest < ActiveSupport::TestCase
  # Game one has just finished its first round with 3 players, 12 points each; player two ended it
  setup do
    @game = games(:one)
    GameInitializerService.new(@game).call
    third_user = User.create!(email: "three@example.com", username: "player_three", password: "password123")

    @p1 = players(:one)
    @p1.update!(score: 0)
    @p2 = @game.players.create!(user: users(:two), score: 0, turn_order: 2)
    @p3 = @game.players.create!(user: third_user, score: 0, turn_order: 3)

    GameStarterService.new(@game).call
    @game.update!(current_player: @p1, round_ender_turn_order: 2)
    # A low score for everyone, so nobody reaches the end score
    @game.cards.where(location: "player_grid").update_all(value: 1)
    RoundEndService.new(@game).call
    @game.reload
  end

  def ready(player)
    NextRoundService.new(@game, player.reload).call
    @game.reload
  end

  def grid(player)
    @game.cards.where(location: "player_grid", player: player)
  end

  test "a player getting ready waits for the others" do
    ready(@p1)

    assert_equal "round_over", @game.status
    assert @p1.reload.ready_for_next_round
    assert_not @p2.reload.ready_for_next_round
  end

  test "getting ready twice changes nothing" do
    ready(@p1)
    ready(@p1)

    assert_equal "round_over", @game.status
  end

  test "the next round is dealt once every player is ready" do
    old_card_ids = @game.cards.ids

    [ @p1, @p2, @p3 ].each { |player| ready(player) }

    assert_equal "in_progress", @game.status
    assert_equal 2, @game.round_number
    assert @game.initial_reveal_phase?
    assert_nil @game.round_ender_turn_order
    assert_nil @game.round_ended_at
    assert_equal 2, @game.first_player_turn_order
    assert_equal 150, @game.cards.count
    assert_empty @game.cards.ids & old_card_ids, "a new deck is shuffled for every round"
    [ @p1, @p2, @p3 ].each do |player|
      assert_equal 12, grid(player).where(is_face_up: false).count
      assert_not player.reload.ready_for_next_round
    end
    assert_equal 1, @game.cards.where(location: "discard_pile").count
  end

  test "after the delay, the next round starts without the players who are not ready" do
    travel Game::NEXT_ROUND_DELAY + 1.second do
      ready(@p1)
    end

    assert_equal "in_progress", @game.status
    assert_equal 2, @game.round_number
  end

  test "the scores and the history are kept for the next round" do
    scores = [ @p1, @p2, @p3 ].map { |player| player.reload.score }

    [ @p1, @p2, @p3 ].each { |player| ready(player) }

    assert_equal scores, [ @p1, @p2, @p3 ].map { |player| player.reload.score }
    assert_equal [ 1 ], @p1.round_results.map(&:round_number)
  end

  test "the player who ended the previous round plays first once the cards are revealed" do
    [ @p1, @p2, @p3 ].each { |player| ready(player) }
    # Player one reveals the highest cards, but player two ended the previous round
    grid(@p1).update_all(value: 12)
    grid(@p2).update_all(value: -2)

    [ @p1, @p2, @p3 ].each do |player|
      grid(player).limit(Game::INITIAL_REVEAL_COUNT).each do |card|
        InitialRevealService.new(@game, player, card.id).call
      end
    end

    assert_equal @p2, @game.reload.current_player
  end

  test "when the player who ended the previous round has quit, the highest revealed total plays first" do
    LeaveGameService.new(@game, @p2).call
    [ @p1, @p3 ].each { |player| ready(player) }
    grid(@p3).update_all(value: 12)

    [ @p1, @p3 ].each do |player|
      grid(player).limit(Game::INITIAL_REVEAL_COUNT).each do |card|
        InitialRevealService.new(@game, player, card.id).call
      end
    end

    assert_equal @p3, @game.reload.current_player
  end

  test "the next round starts when the only player not ready quits" do
    ready(@p1)
    ready(@p2)

    LeaveGameService.new(@game, @p3).call

    assert_equal "in_progress", @game.reload.status
    assert_equal 2, @game.round_number
  end

  test "a game left with a single player between two rounds is finished without scores" do
    LeaveGameService.new(@game, @p2).call
    LeaveGameService.new(@game, @p3).call

    @game.reload
    assert_equal "finished", @game.status
    assert_not @game.round_scored?
  end

  test "a player can only get ready between two rounds" do
    [ @p1, @p2, @p3 ].each { |player| ready(player) }

    error = assert_raises(NextRoundService::Error) { ready(@p1) }
    assert_equal "The round is not over.", error.message
  end
end
