class Api::V1::GamesController < ApplicationController

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
end
