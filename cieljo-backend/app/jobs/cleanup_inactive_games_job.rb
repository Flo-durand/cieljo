# Deletes the games nobody has played for a while (a lobby left open, a paused game never resumed, a finished
# game), with their players and their 150 cards. Runs every hour in production (config/recurring.yml).
# A game is inactive when neither it, nor one of its players, nor one of its cards has changed for INACTIVITY:
# drawing a card or joining a lobby does not touch the game row, so the cards and the players count too.
class CleanupInactiveGamesJob < ApplicationJob
  queue_as :default

  INACTIVITY = 24.hours

  def perform
    cutoff = INACTIVITY.ago
    recently_played_cards = Card.where(updated_at: cutoff..).select(:game_id)
    recently_changed_players = Player.where(updated_at: cutoff..).select(:game_id)

    Game.where(updated_at: ...cutoff)
        .where.not(id: recently_played_cards)
        .where.not(id: recently_changed_players)
        .find_each(&:destroy!)
  end
end
