// The order of the deal at the start of a game.

// Cards are dealt one at a time to each player in turn order, like a real deal,
// then the next card goes onto the discard pile.
export function buildDeal(players, discardTop) {
  const cardIds = [];
  const gridSize = Math.max(0, ...players.map(player => player.grid.length));

  for (let index = 0; index < gridSize; index += 1) {
    players.forEach(player => {
      if (player.grid[index]) cardIds.push(player.grid[index].id);
    });
  }

  return { cardIds, discardCardId: discardTop?.id };
}
