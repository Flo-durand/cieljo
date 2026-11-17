# Shortcuts to test a game by hand without playing every turn. Development only: they change a game directly in
# the database, skipping the rules. Quote the task name in zsh: bin/rails "dev:scores[ABCD,95]"
namespace :dev do
  # Sets the total score of every player of a game, to reach Game::END_SCORE in the next round.
  # The history of the rounds (round_results) is not changed, so the total no longer matches its sum.
  desc "Development only: set the total score of every player of a game"
  task :scores, %i[room_code score] => :environment do |_task, args|
    game = dev_game(args[:room_code])
    score = Integer(args[:score] || 95)
    game.players.update_all(score: score, updated_at: Time.current)
    puts "#{game.players.count} players of #{game.room_code} now have #{score} points"
  end

  # Turns face up every card of every grid except one per player, so the next move can end the round
  desc "Development only: reveal every grid card but one per player"
  task :reveal, %i[room_code] => :environment do |_task, args|
    game = dev_game(args[:room_code])
    abort "#{game.room_code} is not being played (status: #{game.status})" unless game.status == "in_progress"
    abort "The players have not revealed their first cards yet" if game.initial_reveal_phase?

    game.players.each do |player|
      face_down = player.cards.where(location: "player_grid", is_face_up: false).order(:id).to_a
      face_down.drop(1).each { |card| card.update!(is_face_up: true) }
    end
    puts "Every player of #{game.room_code} has at most one face-down card left"
  end

  def dev_game(room_code)
    abort "These tasks only run in development" unless Rails.env.development?
    abort "Give a room code, for example: bin/rails \"dev:reveal[ABCD]\"" if room_code.blank?

    Game.find_by(room_code: room_code.upcase) || abort("No game with the room code #{room_code}")
  end
end
