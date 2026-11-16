// The end of the round: who started the last round, the ranking and the winners (see RoundScores.jsx).

// The players from the lowest score to the highest (the lowest score wins). On a tie, the players share the rank
// (1, 1, 3) and keep their turn order.
export function roundRanking(players) {
  const sorted = [...players].sort((a, b) => a.score - b.score);
  return sorted.map(player => ({
    ...player,
    rank: sorted.findIndex(other => other.score === player.score) + 1,
  }));
}

const nameOf = player => (player.current_user ? 'you' : player.username);

// "you win!", "player_2 wins!", "you and player_2 win!", "player_2, player_3 and player_4 win!"
export function winnersText(players) {
  const winners = roundRanking(players).filter(player => player.rank === 1);
  // The current user is named first
  const names = [...winners].sort((a, b) => Number(b.current_user) - Number(a.current_user)).map(nameOf);
  if (names.length === 0) return '';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  const singular = names.length === 1 && names[0] !== 'you';
  return `${list} ${singular ? 'wins' : 'win'}!`;
}

// The reminder shown during the last round. roundEnderId is null when the player who ended the round has quit.
export function lastRoundText({ lastRound, roundEnderId, players }) {
  if (!lastRound) return '';
  const ender = players.find(player => player.id === roundEnderId);
  if (!ender) return 'Last round!';
  if (ender.current_user) return 'Last round: you revealed all your cards.';
  return `Last round: ${ender.username} revealed all their cards.`;
}
