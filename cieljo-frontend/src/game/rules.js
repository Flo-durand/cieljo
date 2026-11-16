// The rules of the game come from the API (the "rules" of the game details), so the frontend never keeps its
// own copy of them: the grid size, the number of cards revealed at the start and the maximum of players.
// (The SCSS also assumes grids of 4 columns for the width of a seat: see $grid-columns in _variables.scss.)
export function rulesFromApi(rules) {
  return {
    gridRows: rules.grid_rows,
    gridColumns: rules.grid_columns,
    initialRevealCount: rules.initial_reveal_count,
    maxPlayers: rules.max_players,
  };
}
