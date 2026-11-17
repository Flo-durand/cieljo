// The points of the round in progress, shown under each player's name (see PlayerGrid.jsx).

// The sum of the face-up cards of a player's grid: the values of face-down cards are never sent by the API, and
// a removed column no longer counts. Once the round is scored, the points saved by the server (round_points,
// doubled for a round ender without the lowest score) replace this sum.
export function livePoints(player) {
  if (player.round_points != null) return player.round_points;
  return player.grid.reduce((sum, card) => (card.face_up ? sum + card.value : sum), 0);
}

// "14 pts", "1 pt", "-2 pts"
export function pointsText(points) {
  return `${points} ${Math.abs(points) === 1 ? 'pt' : 'pts'}`;
}
