// Builders for the tests of src/game: players and cards shaped like the API's game details

// A grid of 3 rows x 4 columns; values[index] gives the face-up values (undefined = face down)
export function grid(playerId, values = []) {
  return Array.from({ length: 12 }, (_, index) => ({
    id: playerId * 100 + index,
    row: Math.floor(index / 4),
    column: index % 4,
    face_up: values[index] !== undefined,
    value: values[index] ?? null,
  }));
}

// Players 1..count; `me` is the id of the current user
export function players(count, { me = 1, grids = {} } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return { id, username: `player_${id}`, current_user: id === me, grid: grids[id] ?? grid(id) };
  });
}
