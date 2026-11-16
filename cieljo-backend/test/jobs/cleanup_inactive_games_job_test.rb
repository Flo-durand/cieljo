require "test_helper"

class CleanupInactiveGamesJobTest < ActiveJob::TestCase
  # A game with a full deck and its host, last changed `age` ago (the game, its players and its cards)
  def game_last_changed(age, status: "pending")
    game = Game.create!(status: status, turn_number: 1)
    game.players.create!(user: users(:one), score: 0, turn_order: 1)
    GameInitializerService.new(game).call
    at = age.ago
    game.update_columns(updated_at: at)
    game.players.update_all(updated_at: at)
    game.cards.update_all(updated_at: at)
    game
  end

  test "deletes a game inactive for more than 24 hours, with its players and cards" do
    game = game_last_changed(25.hours)

    CleanupInactiveGamesJob.perform_now

    assert_not Game.exists?(game.id)
    assert_equal 0, Player.where(game_id: game.id).count
    assert_equal 0, Card.where(game_id: game.id).count
  end

  test "keeps a game played less than 24 hours ago" do
    game = game_last_changed(23.hours)

    CleanupInactiveGamesJob.perform_now

    assert Game.exists?(game.id)
  end

  test "a recent change of the game itself keeps it (a turn just ended)" do
    game = game_last_changed(25.hours, status: "in_progress")
    game.touch

    CleanupInactiveGamesJob.perform_now

    assert Game.exists?(game.id)
  end

  test "a recently moved card keeps the game (a card drawn does not touch the game row)" do
    game = game_last_changed(25.hours, status: "in_progress")
    game.cards.first.touch

    CleanupInactiveGamesJob.perform_now

    assert Game.exists?(game.id)
  end

  test "a player who recently joined keeps the lobby" do
    game = game_last_changed(25.hours)
    game.players.create!(user: users(:two), score: 0, turn_order: 2)

    CleanupInactiveGamesJob.perform_now

    assert Game.exists?(game.id)
  end

  test "deletes inactive games whatever their status" do
    old = %w[pending in_progress finished].map { |status| game_last_changed(2.days, status: status) }

    CleanupInactiveGamesJob.perform_now

    assert old.none? { |game| Game.exists?(game.id) }
  end

  test "leaves the other games untouched" do
    active = game_last_changed(1.hour)
    game_last_changed(3.days)

    assert_no_difference -> { active.cards.count } do
      CleanupInactiveGamesJob.perform_now
    end
    assert Game.exists?(active.id)
  end

  test "runs every hour in production" do
    tasks = ActiveSupport::ConfigurationFile.parse(Rails.root.join("config/recurring.yml"))
    task = tasks.dig("production", "cleanup_inactive_games")

    assert_equal "CleanupInactiveGamesJob", task["class"]
    assert_equal "every hour", task["schedule"]
  end
end
