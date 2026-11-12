require "test_helper"

class TurnServiceTest < ActiveSupport::TestCase
  # Game one is started with 3 players and the initial reveal is skipped: player one plays first.
  setup do
    @game = games(:one)
    GameInitializerService.new(@game).call
    third_user = User.create!(email: "three@example.com", username: "player_three", password: "password123")

    @p1 = players(:one)
    @p2 = @game.players.create!(user: users(:two), score: 0, turn_order: 2)
    @p3 = @game.players.create!(user: third_user, score: 0, turn_order: 3)

    GameStarterService.new(@game).call
    @game.update!(current_player: @p1)
  end

  # --- Helpers ---

  def turn(player)
    TurnService.new(@game, player)
  end

  def grid(player)
    @game.cards.where(location: "player_grid", player: player).order(:row, :column)
  end

  def cards_in(location)
    @game.cards.where(location: location)
  end

  def hand
    cards_in("hand").first
  end

  def discard_top
    cards_in("discard_pile").order(:updated_at, :id).last
  end

  def face_down_card(player)
    grid(player).find_by(is_face_up: false)
  end

  # Snapshot of every card and of the game, to check that a refused action changes nothing
  def snapshot
    [
      @game.reload.attributes.except("updated_at"),
      @game.cards.order(:id).pluck(:id, :location, :player_id, :row, :column, :is_face_up)
    ]
  end

  def assert_refused(message)
    before = snapshot
    error = assert_raises(TurnService::Error) { yield }
    assert_equal message, error.message
    assert_equal before, snapshot, "a refused action must not change the game"
  end

  # --- Drawing ---

  test "drawing from the draw pile puts a card face up in the player's hand" do
    draw_pile_count = cards_in("draw_pile").count

    turn(@p1).draw("draw_pile")

    card = hand
    assert_equal @p1.id, card.player_id
    assert card.is_face_up
    assert_nil card.row
    assert_nil card.column
    assert_equal "draw_pile", @game.reload.drawn_from
    assert_equal draw_pile_count - 1, cards_in("draw_pile").count
    assert_equal @p1, @game.current_player, "the turn is not over after drawing"
  end

  test "drawing from the discard pile takes its top card" do
    top = discard_top

    turn(@p1).draw("discard_pile")

    assert_equal top, hand
    assert_equal "discard_pile", @game.reload.drawn_from
    assert_equal 0, cards_in("discard_pile").count
  end

  test "drawing from the discard pile takes the last discarded card, not an older one" do
    older = discard_top
    turn(@p1).draw("draw_pile")
    thrown = hand
    turn(@p1).discard(face_down_card(@p1).id)

    turn(@p2).draw("discard_pile")

    assert_equal thrown, hand
    assert_equal older, discard_top
  end

  test "cannot draw twice in the same turn" do
    turn(@p1).draw("draw_pile")

    assert_refused("You already have a card in hand.") { turn(@p1).draw("discard_pile") }
    assert_refused("You already have a card in hand.") { turn(@p1).draw("draw_pile") }
  end

  test "cannot draw from an unknown source" do
    assert_refused("You can only draw from the draw pile or the discard pile.") { turn(@p1).draw("hand") }
    assert_refused("You can only draw from the draw pile or the discard pile.") { turn(@p1).draw("") }
  end

  test "an empty draw pile is refilled with the discard pile except its top card" do
    top = discard_top
    # Move the draw pile to the discard pile, under the current top card
    cards_in("draw_pile").update_all(location: "discard_pile", is_face_up: true, updated_at: 1.hour.ago)
    moved = cards_in("discard_pile").count - 1

    turn(@p1).draw("draw_pile")

    assert_not_nil hand
    assert_equal [ top ], cards_in("discard_pile").to_a, "the top card stays on the discard pile"
    assert_equal moved - 1, cards_in("draw_pile").count
    assert cards_in("draw_pile").none?(&:is_face_up), "the refilled draw pile is face down"
  end

  test "cannot draw when the draw pile is empty and there is nothing to refill it with" do
    cards_in("draw_pile").delete_all

    assert_refused("There is no card to take from the draw pile.") { turn(@p1).draw("draw_pile") }
  end

  test "cannot draw from an empty discard pile" do
    cards_in("discard_pile").delete_all

    assert_refused("There is no card to take from the discard pile.") { turn(@p1).draw("discard_pile") }
  end

  # --- Whose turn ---

  test "only the current player can play" do
    assert_refused("It is not your turn.") { turn(@p2).draw("draw_pile") }

    turn(@p1).draw("draw_pile")
    card = face_down_card(@p2)
    assert_refused("It is not your turn.") { turn(@p2).swap(card.id) }
    assert_refused("It is not your turn.") { turn(@p2).discard(card.id) }
  end

  test "a request working on an outdated copy of the game cannot play twice" do
    # Two requests load the game at the same time; the first one plays the whole turn
    outdated_game = Game.find(@game.id)
    turn(@p1).draw("draw_pile")
    turn(@p1).discard(face_down_card(@p1).id)

    # The lock reloads the game, so the second request sees that the turn is over
    error = assert_raises(TurnService::Error) { TurnService.new(outdated_game, @p1).draw("draw_pile") }
    assert_equal "It is not your turn.", error.message
    assert_nil hand
  end

  test "cannot play while the players are revealing their first cards" do
    @game.update!(current_player: nil)

    assert_refused("The players are still revealing their first cards.") { turn(@p1).draw("draw_pile") }
  end

  test "cannot play a game that is not in progress" do
    %w[pending finished].each do |status|
      @game.update!(status: status)

      assert_refused("The game is not in progress.") { turn(@p1).draw("draw_pile") }
    end
  end

  # --- Swapping ---

  test "swapping puts the card in hand in the grid and the replaced card on the discard pile" do
    turn(@p1).draw("draw_pile")
    drawn = hand
    # A card whose row and column differ, so a mix-up between them would show
    replaced = grid(@p1).find_by(row: 1, column: 3)
    row = replaced.row
    column = replaced.column

    turn(@p1).swap(replaced.id)

    drawn.reload
    assert_equal [ "player_grid", @p1.id, row, column, true ],
                 [ drawn.location, drawn.player_id, drawn.row, drawn.column, drawn.is_face_up ]

    replaced.reload
    assert_equal [ "discard_pile", nil, nil, nil, true ],
                 [ replaced.location, replaced.player_id, replaced.row, replaced.column, replaced.is_face_up ]
    assert_equal replaced, discard_top
    assert_nil hand
    assert_equal 12, grid(@p1).count
  end

  test "can swap with a face-up card" do
    face_up = grid(@p1).first
    face_up.update!(is_face_up: true)
    turn(@p1).draw("draw_pile")

    turn(@p1).swap(face_up.id)

    assert_equal face_up, discard_top
  end

  test "a card taken from the discard pile can be swapped" do
    taken = discard_top
    turn(@p1).draw("discard_pile")
    replaced = face_down_card(@p1)

    turn(@p1).swap(replaced.id)

    assert_equal "player_grid", taken.reload.location
    assert_equal replaced, discard_top
  end

  test "cannot swap without a card in hand" do
    assert_refused("Draw a card first.") { turn(@p1).swap(face_down_card(@p1).id) }
  end

  test "can only swap with a card of the player's own grid" do
    turn(@p1).draw("draw_pile")

    assert_refused("This card is not in your grid.") { turn(@p1).swap(face_down_card(@p2).id) }
    assert_refused("This card is not in your grid.") { turn(@p1).swap(discard_top.id) }
    assert_refused("This card is not in your grid.") { turn(@p1).swap(cards_in("draw_pile").first.id) }
    assert_refused("This card is not in your grid.") { turn(@p1).swap(hand.id) }
    assert_refused("This card is not in your grid.") { turn(@p1).swap(0) }
    assert_refused("This card is not in your grid.") { turn(@p1).swap(nil) }
  end

  # --- Discarding ---

  test "discarding throws the card in hand and reveals a face-down card of the grid" do
    turn(@p1).draw("draw_pile")
    drawn = hand
    revealed = face_down_card(@p1)

    turn(@p1).discard(revealed.id)

    drawn.reload
    assert_equal [ "discard_pile", nil, true ], [ drawn.location, drawn.player_id, drawn.is_face_up ]
    assert_equal drawn, discard_top

    revealed.reload
    assert_equal [ "player_grid", @p1.id, true ], [ revealed.location, revealed.player_id, revealed.is_face_up ]
    assert_nil hand
    assert_equal 12, grid(@p1).count
  end

  test "a card taken from the discard pile cannot be discarded" do
    turn(@p1).draw("discard_pile")

    assert_refused("A card taken from the discard pile must be swapped with a card of your grid.") do
      turn(@p1).discard(face_down_card(@p1).id)
    end
  end

  test "discarding must reveal a face-down card" do
    face_up = grid(@p1).first
    face_up.update!(is_face_up: true)
    turn(@p1).draw("draw_pile")

    assert_refused("This card is already face up.") { turn(@p1).discard(face_up.id) }
  end

  test "cannot discard without a card in hand" do
    assert_refused("Draw a card first.") { turn(@p1).discard(face_down_card(@p1).id) }
  end

  test "can only reveal a card of the player's own grid" do
    turn(@p1).draw("draw_pile")

    assert_refused("This card is not in your grid.") { turn(@p1).discard(face_down_card(@p2).id) }
    assert_refused("This card is not in your grid.") { turn(@p1).discard(cards_in("draw_pile").first.id) }
  end

  # --- End of the turn ---

  test "after a swap or a discard, the turn goes to the next player" do
    turn(@p1).draw("draw_pile")
    turn(@p1).swap(face_down_card(@p1).id)

    @game.reload
    assert_equal @p2, @game.current_player
    assert_nil @game.drawn_from
    assert_equal 2, @game.turn_number
  end

  test "the turn goes around the table in turn order and back to the first player" do
    [ @p1, @p2, @p3 ].each do |player|
      assert_equal player, @game.reload.current_player
      turn(player).draw("draw_pile")
      turn(player).discard(face_down_card(player).id)
    end

    assert_equal @p1, @game.reload.current_player
    assert_equal 4, @game.turn_number
  end

  test "no card is lost or duplicated over many turns" do
    total = @game.cards.count

    12.times do |index|
      player = @game.reload.current_player
      if index.even?
        turn(player).draw(index % 4 == 0 ? "discard_pile" : "draw_pile")
        turn(player).swap(grid(player).offset(index % 12).first.id)
      else
        turn(player).draw("draw_pile")
        turn(player).discard(face_down_card(player).id)
      end

      assert_equal total, @game.cards.count
      [ @p1, @p2, @p3 ].each { |p| assert_equal 12, grid(p).count }
      assert_nil hand
      assert cards_in("discard_pile").exists?
      assert cards_in("discard_pile").all? { |card| card.is_face_up && card.player_id.nil? }
      assert cards_in("draw_pile").none? { |card| card.is_face_up || card.player_id }
    end

    assert_equal 13, @game.reload.turn_number
  end
end
