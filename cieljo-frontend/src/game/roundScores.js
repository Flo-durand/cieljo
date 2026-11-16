// The end of a round and of the game: who started the last round, the ranking, the winners and the countdown to
// the next round (see RoundScores.jsx).

// The total score of a player (all the rounds scored so far), or the points of the round just scored
export const totalOf = player => player.score;
export const roundPointsOf = player => player.round_points ?? 0;

// The players from the lowest points to the highest (the lowest wins), by their total unless pointsOf says
// otherwise. On a tie, the players share the rank (1, 1, 3) and keep their turn order.
export function roundRanking(players, pointsOf = totalOf) {
  const sorted = [...players].sort((a, b) => pointsOf(a) - pointsOf(b));
  return sorted.map(player => ({
    ...player,
    rank: sorted.findIndex(other => pointsOf(other) === pointsOf(player)) + 1,
  }));
}

const nameOf = player => (player.current_user ? 'you' : player.username);

// "you win!", "player_2 wins!", "you and player_2 win the round!", "player_2, player_3 and player_4 win!"
// pointsOf ranks the players (their total by default); what is added after the verb (" the round").
export function winnersText(players, { pointsOf = totalOf, what = '' } = {}) {
  const winners = roundRanking(players, pointsOf).filter(player => player.rank === 1);
  // The current user is named first
  const names = [...winners].sort((a, b) => Number(b.current_user) - Number(a.current_user)).map(nameOf);
  if (names.length === 0) return '';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const singular = names.length === 1 && names[0] !== 'you';
  return `${list} ${singular ? 'wins' : 'win'}${what}!`;
}

// The reminder shown during the last round. roundEnderId is null when the player who ended the round has quit.
export function lastRoundText({ lastRound, roundEnderId, players }) {
  if (!lastRound) return '';
  const ender = players.find(player => player.id === roundEnderId);
  if (!ender) return 'Last round!';
  if (ender.current_user) return 'Last round: you revealed all your cards.';
  return `Last round: ${ender.username} revealed all their cards.`;
}

// The numbers of the rounds scored so far, in order (the columns of the score table)
export function playedRounds(players) {
  const numbers = new Set(players.flatMap(player => (player.rounds ?? []).map(round => round.round_number)));
  return [...numbers].sort((a, b) => a - b);
}

// Between two rounds: "Next round in 23 s · 2/3 players ready", or "Starting the next round..." once the time is up
export function nextRoundText(players, secondsLeft) {
  const ready = players.filter(player => player.ready).length;
  const when = secondsLeft > 0 ? `Next round in ${secondsLeft} s` : 'Starting the next round...';
  return `${when} · ${ready}/${players.length} players ready`;
}
