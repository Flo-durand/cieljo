// What changed on the table between two refreshes of the game: the removed columns and the players who left.
// The game table animates the first ones and announces the second ones.

// The most frequent face-up value of a list of cards (the value of a column about to be removed)
export function mostFrequentValue(cards) {
  const counts = new Map();
  cards.filter(card => card.face_up).forEach(card => counts.set(card.value, (counts.get(card.value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// The columns that were in a grid at the previous refresh and are gone now
export function findRemovedColumns(previousPlayers, players, discardTop) {
  const removals = [];
  players.forEach(player => {
    const before = previousPlayers.find(previous => previous.id === player.id);
    if (!before || before.grid.length === 0 || player.grid.length === 0) return;

    const columnsNow = new Set(player.grid.map(card => card.column));
    const columnsBefore = [...new Set(before.grid.map(card => card.column))];
    columnsBefore.filter(column => !columnsNow.has(column)).forEach(column => {
      const value = mostFrequentValue(before.grid.filter(card => card.column === column)) ?? discardTop?.value;
      removals.push({ playerId: player.id, column, value, username: player.username, isMe: player.current_user });
    });
  });
  return removals;
}

// The players who were at the table at the previous refresh and are gone now (they quit the game)
export function findDepartedPlayers(previousPlayers, players) {
  return previousPlayers.filter(previous => !players.some(player => player.id === previous.id));
}

// The cards of a removed column (one per row of the grid), shown in the grid while they fly to the discard pile
export const ghostCards = (removal, gridRows) => Array.from({ length: gridRows }, (_, row) => ({
  id: `removed-${removal.playerId}-${removal.column}-${row}`,
  row,
  column: removal.column,
  face_up: true,
  value: removal.value,
}));
