# Between two rounds (status round_over), each player says they are ready for the next round. It starts once
# every player is ready, or as soon as a player asks after Game::NEXT_ROUND_DELAY (each page sends "ready" when
# its countdown ends, so a player who has gone away does not block the others).
# The next round is played with a new shuffled deck: the cards are dealt again, each player reveals their first
# cards, then the player who ended the previous round plays first.
class NextRoundService
  class Error < StandardError; end

  def initialize(game, player)
    @game = game
    @player = player
  end

  def call
    # Lock the game row so the last two players getting ready cannot both start the next round
    @game.with_lock do
      raise Error, "The round is not over." unless @game.status == "round_over"

      @player.update!(ready_for_next_round: true) unless @player.ready_for_next_round
      self.class.start_if_ready(@game)
    end
  end

  # Starts the next round when every player is ready or the delay is over. Also called when a player quits
  # between two rounds: the others may all be ready already. Call it while holding the lock of the game row.
  def self.start_if_ready(game)
    everyone_ready = !game.players.where(ready_for_next_round: false).exists?
    start(game) if everyone_ready || Time.current >= game.next_round_at
  end

  def self.start(game)
    first_player_turn_order = game.round_ender_turn_order
    game.cards.delete_all
    GameInitializerService.new(game).call
    game.players.update_all(ready_for_next_round: false, updated_at: Time.current)
    game.update!(
      round_number: game.round_number + 1,
      round_ended_at: nil,
      round_ender_turn_order: nil,
      first_player_turn_order: first_player_turn_order
    )
    GameStarterService.deal(game)
  end
  private_class_method :start
end
