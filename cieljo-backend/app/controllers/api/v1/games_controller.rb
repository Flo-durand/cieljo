class Api::V1::GamesController < ApplicationController

  def show
    game = Game.find_by(room_code: params[:room_code].to_s.strip.upcase)

    unless game
      return render json: { error: "No game found with this code." }, status: :not_found
    end

    # Only the players of a game can see its room
    unless game.players.exists?(user: current_user)
      return render json: { error: "You are not a player of this game." }, status: :forbidden
    end

    players = game.players.includes(:user).order(:turn_order)
    grids = game.cards.where(location: "player_grid").order(:row, :column).group_by(&:player_id)

    render json: {
      data: {
        game_id: game.id,
        room_code: game.room_code,
        status: game.status,
        players: players.map do |player|
          {
            id: player.id,
            username: player.user.username,
            turn_order: player.turn_order,
            host: player.turn_order == 1,
            current_user: player.user_id == current_user.id,
            grid: (grids[player.id] || []).map { |card| card_json(card) }
          }
        end,
        draw_pile_count: game.cards.where(location: "draw_pile").count,
        # The last card put on the discard pile is the visible one
        discard_top: card_json(game.cards.where(location: "discard_pile").order(:updated_at, :id).last)
      }
    }, status: :ok
  end

  def create
    @game = Game.new(status: 'pending', turn_number: 1)

    if @game.save
      @player = @game.players.new(user: current_user, score: 0, turn_order: 1)

      if @player.save
        @game.update(current_player: @player)

        GameInitializerService.new(@game).call

        render json: {
          status: { code: 200, message: "Game room created and deck initialized." },
          data: {
            game_id: @game.id,
            room_code: @game.room_code,
            status: @game.status,
            current_player: current_user.username
          }
        }, status: :created
      else
        render json: { error: "Could not add the player to the game." }, status: :unprocessable_entity
      end
    else
      render json: { error: "Could not create the game room." }, status: :unprocessable_entity
    end
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

    unless game.status == "pending"
      return render json: { error: "This game has already started or is finished." }, status: :unprocessable_entity
    end

    player = game.players.new(user: current_user, score: 0, turn_order: game.players.count + 1)

    if player.save
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
    game = Game.find_by(room_code: params[:room_code].to_s.strip.upcase)

    unless game
      return render json: { error: "No game found with this code." }, status: :not_found
    end

    # The host is the player who created the game (turn order 1)
    unless game.players.exists?(user: current_user, turn_order: 1)
      return render json: { error: "Only the host can start the game." }, status: :forbidden
    end

    GameStarterService.new(game).call

    render json: {
      status: { code: 200, message: "Game started." },
      data: {
        game_id: game.id,
        room_code: game.room_code,
        status: game.status
      }
    }, status: :ok
  rescue GameStarterService::Error => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

  private

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
