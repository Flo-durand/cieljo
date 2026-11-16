// Where the opponents sit around the game table, clockwise in turn order from the current player.

// The 7 places around the table, in clockwise order from the current player, who sits at the bottom center:
//   [top-left]     [top]    [top-right]
//   [left]       (middle)   [right]
//   [bottom-left]   (me)    [bottom-right]
export const SEATS = ['bottom-left', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-right'];

// The places used, by number of opponents (1 to 7): one player per place, and a symmetric table when possible.
//   players:      2  3  4  5  6  7  8
//   bottom-left   -  -  -  -  -  x  x
//   left          -  x  x  x  x  x  x
//   top-left      -  -  -  x  x  x  x
//   top           x  -  x  -  x  -  x
//   top-right     -  -  -  x  x  x  x
//   right         -  x  x  x  x  x  x
//   bottom-right  -  -  -  -  -  x  x
const USED_SEATS = {
  1: ['top'],
  2: ['left', 'right'],
  3: ['left', 'top', 'right'],
  4: ['left', 'top-left', 'top-right', 'right'],
  5: ['left', 'top-left', 'top', 'top-right', 'right'],
  6: ['bottom-left', 'left', 'top-left', 'top-right', 'right', 'bottom-right'],
  7: SEATS,
};

// Seats the opponents clockwise from the current player: the player right after them sits at the bottom
// left (or the left), then come the left, the top left, the top, the top right, the right and the bottom right.
export function seatOpponents(players) {
  const meIndex = players.findIndex(player => player.current_user);
  // Opponents in turn order, starting with the player right after the current one
  const opponents = [...players.slice(meIndex + 1), ...players.slice(0, meIndex)];
  const used = USED_SEATS[opponents.length] ?? [];

  const seats = {};
  let next = 0;
  SEATS.forEach(seat => {
    seats[seat] = used.includes(seat) ? opponents.slice(next, next + 1) : [];
    if (used.includes(seat)) next += 1;
  });
  return seats;
}
