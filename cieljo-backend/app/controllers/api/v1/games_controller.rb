class Api::V1::GamesController < ApplicationController
  # A removed column puts 3 cards on top of the replaced or thrown card, and one more shows what was under it
  DISCARD_RECENT_COUNT = 5

  # Each new game inserts 150 cards: 10 new games per minute for a user (runs after authenticate_user!)
  rate_limit to: 10, within: 1.minute, only: :create, by: -> { current_user.id }, with: -> { render_rate_limited }

  before_action :set_game, only: %i[show start leave reveal draw swap discard ready]
  before_action :set_current_player, only: %i[show leave reveal draw swap discard ready]

  # GET /api/v1/games: the games of the current user in the lobby, in progress or between two rounds, the most
  # recently active first
  def index
    games = Game.where(status: %w[pending in_progress round_over])
                .where(id: current_user.players.select(:game_id))
                .includes(:players, current_player: :user)
                .order(updated_at: :desc)

    render json: {
      data: games.map do |game|
        {
          room_code: game.room_code,
          status: game.status,
          players_count: game.players.size,
          max_players: Game::MAX_PLAYERS,
          round_number: game.round_number,
          initial_reveal: game.initial_reveal_phase?,
          current_player: game.current_player && game.status == "in_progress" ? game.current_player.user.username : nil,
          your_turn: game.status == "in_progress" && game.current_player&.user_id == current_user.id
        }
      end
    }, status: :ok
  end

  def show
    players = @game.players.includes(:user, :round_results).order(:turn_order)
    grids = @game.cards.where(location: "player_grid").order(:row, :column).group_by(&:player_id)

    render json: {
      data: {
        game_id: @game.id,
        room_code: @game.room_code,
        status: @game.status,
        # The rules the frontend needs, so it never keeps its own copy of them
        rules: {
          grid_rows: GameStarterService::GRID_ROWS,
          grid_columns: GameStarterService::GRID_COLUMNS,
          initial_reveal_count: Game::INITIAL_REVEAL_COUNT,
          max_players: Game::MAX_PLAYERS,
          end_score: Game::END_SCORE,
          next_round_delay: Game::NEXT_ROUND_DELAY.to_i
        },
        # The round being played (or just scored), 1 for the first one
        round_number: @game.round_number,
        # Between two rounds (status round_over): the seconds left before the next round starts even if some
        # players are not ready (counted by the server, so the clock of each device does not matter)
        next_round_in: @game.status == "round_over" ? [ (@game.next_round_at - Time.current).ceil, 0 ].max : nil,
        # True while the players reveal their first cards; the current player is then chosen
        initial_reveal: @game.initial_reveal_phase?,
        current_player_id: @game.current_player_id,
        # True once a player has revealed all their cards: everyone else plays one last turn
        last_round: @game.last_round?,
        # The player who revealed all their cards first, or nil (no last round yet, or they quit)
        round_ender_id: @game.round_ender&.id,
        # True once the round is scored: between two rounds, or at the end of the game when a player reached
        # end_score (false when the game ended because the other players quit)
        round_scored: @game.round_scored?,
        players: players.map do |player|
          {
            id: player.id,
            username: player.user.username,
            turn_order: player.turn_order,
            host: player.turn_order == 1,
            current_user: player.user_id == current_user.id,
            # The total of the rounds already scored
            score: player.score,
            # Once the round is scored: its points (already in score) and whether they were doubled
            round_points: (current_round_result(player)&.points if @game.round_scored?),
            round_doubled: (current_round_result(player)&.doubled if @game.round_scored?),
            # The points of each round already scored, the first round first
            rounds: player.round_results.map do |result|
              { round_number: result.round_number, points: result.points, doubled: result.doubled }
            end,
            # Between two rounds: the player is ready for the next one
            ready: player.ready_for_next_round,
            grid: (grids[player.id] || []).map { |card| card_json(card) }
          }
        end,
        draw_pile_count: @game.cards.where(location: "draw_pile").count,
        # The card the current player has drawn, visible to everyone, or nil
        hand: hand_json,
        # The last card put on the discard pile is the visible one
        discard_top: card_json(@game.cards.where(location: "discard_pile").order(:updated_at, :id).last),
        # The last cards put on the discard pile, oldest first (every discarded card was shown face up), so the
        # frontend can show them landing one after the other when a column is removed
        discard_recent: @game.cards.where(location: "discard_pile").order(updated_at: :desc, id: :desc)
                             .limit(DISCARD_RECENT_COUNT).reverse.map { |card| card_json(card) }
      }
    }, status: :ok
  end

  def create
    game = GameCreatorService.new(current_user).call

    render json: {
      status: { code: 200, message: "Game room created and deck initialized." },
      data: {
        game_id: game.id,
        room_code: game.room_code,
        status: game.status,
        current_player: current_user.username
      }
    }, status: :created
  rescue ActiveRecord::RecordInvalid
    render json: { error: "Could not create the game room." }, status: :unprocessable_entity
  end

  def join
    room_code = params[:room_code].to_s.strip.upcase
    game = Game.find_by(room_code: room_code)

    unless game
      return render json: { error: "No game found with this code." }, status: :not_found
    end

    if game.players.exists?(user: current_user)
      return render json: { error: "You are already in this game." }, status: :conflict
    end

    # Locks the game row: two players joining at the same time cannot both take the last seat or the same turn order
    error = nil
    player = nil
    game.with_lock do
      if game.status != "pending"
        error = "This game has already started or is finished."
      elsif game.players.count >= Game::MAX_PLAYERS
        error = "This game is full (#{Game::MAX_PLAYERS} players maximum)."
      else
        player = game.players.new(user: current_user, score: 0, turn_order: game.players.count + 1)
        player.save
      end
    end
    return render json: { error: error }, status: :unprocessable_entity if error

    if player.persisted?
      render json: {
        status: { code: 200, message: "Joined the game." },
        data: {
          game_id: game.id,
          room_code: game.room_code,
          status: game.status,
          turn_order: player.turn_order
        }
      }, status: :ok
    else
      render json: { error: player.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotUnique
    # Two simultaneous requests from the same user: the unique index wins
    render json: { error: "You are already in this game." }, status: :conflict
  end

  def start
    # The host is the player who created the game (turn order 1)
    unless @game.players.exists?(user: current_user, turn_order: 1)
      return render json: { error: "Only the host can start the game." }, status: :forbidden
    end

    GameStarterService.new(@game).call

    render json: {
      status: { code: 200, message: "Game started." },
      data: {
        game_id: @game.id,
        room_code: @game.room_code,
        status: @game.status
      }
    }, status: :ok
  rescue GameStarterService::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/games/:room_code/leave
  def leave
    deleted = LeaveGameService.new(@game, @player).call

    render json: {
      status: { code: 200, message: "You left the game." },
      data: { room_code: @game.room_code, game_deleted: deleted }
    }, status: :ok
  rescue LeaveGameService::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/games/:room_code/reveal with { card_id }
  def reveal
    InitialRevealService.new(@game, @player, params[:card_id]).call

    render json: {
      status: { code: 200, message: "Card revealed." },
      data: {
        game_id: @game.id,
        room_code: @game.room_code,
        initial_reveal: @game.initial_reveal_phase?,
        current_player_id: @game.current_player_id
      }
    }, status: :ok
  rescue InitialRevealService::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  # POST /api/v1/games/:room_code/draw with { source: "draw_pile" | "discard_pile" }
  def draw
    play_turn("Card drawn.") { |turn| turn.draw(params[:source].to_s) }
  end

  # POST /api/v1/games/:room_code/swap with { card_id }
  def swap
    play_turn("Card swapped.") { |turn| turn.swap(params[:card_id]) }
  end

  # POST /api/v1/games/:room_code/discard with { card_id } (the face-down card to reveal)
  def discard
    play_turn("Card discarded.") { |turn| turn.discard(params[:card_id]) }
  end

  # POST /api/v1/games/:room_code/ready: between two rounds, the player is ready for the next one. It starts once
  # every player is ready, or when a player sends it after the delay (see NextRoundService).
  def ready
    NextRoundService.new(@game, @player).call

    render json: {
      status: { code: 200, message: @game.status == "in_progress" ? "Next round started." : "Ready for the next round." },
      data: { game_id: @game.id, room_code: @game.room_code, status: @game.status, round_number: @game.round_number }
    }, status: :ok
  rescue NextRoundService::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

  def current_round_result(player)
    player.round_results.find { |result| result.round_number == @game.round_number }
  end

  def play_turn(message)
    turn = TurnService.new(@game, @player)
    yield turn

    render json: {
      status: { code: 200, message: message },
      data: {
        game_id: @game.id,
        room_code: @game.room_code,
        current_player_id: @game.current_player_id,
        turn_number: @game.turn_number,
        hand: hand_json,
        # The column of 3 identical cards removed by this move, if any
        removed_column: turn.removed_column
      }
    }, status: :ok
  rescue TurnService::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  def hand_json
    card = @game.cards.find_by(location: "hand")
    return nil unless card

    card_json(card).merge(player_id: card.player_id, drawn_from: @game.drawn_from)
  end

  def set_game
    @game = Game.find_by(room_code: params[:room_code].to_s.strip.upcase)

    render json: { error: "No game found with this code." }, status: :not_found unless @game
  end

  # Only the players of a game can see it and play in it
  def set_current_player
    @player = @game.players.find_by(user: current_user)

    render json: { error: "You are not a player of this game." }, status: :forbidden unless @player
  end

  # The value of a face-down card is never sent, so players cannot cheat by reading the API
  def card_json(card)
    return nil unless card

    {
      id: card.id,
      row: card.row,
      column: card.column,
      face_up: card.is_face_up,
      value: card.is_face_up ? card.value : nil
    }
  end
end
