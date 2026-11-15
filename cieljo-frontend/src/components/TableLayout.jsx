import './TableLayout.scss';

// The places around the table, in clockwise order from the current player, who sits at the bottom center
const SEATS = ['bottom-left', 'left', 'top', 'right', 'bottom-right'];

// How many opponents sit at each place, by number of opponents (1 to 7): never more than 3 at the top
// and 1 at any other place, so seats are never stacked and the table keeps the same shape.
//   players:      2  3  4  5  6  7  8
//   bottom-left   -  -  -  -  -  1  1
//   left          -  1  1  1  1  1  1
//   top           1  -  1  2  3  2  3
//   right         -  1  1  1  1  1  1
//   bottom-right  -  -  -  -  -  1  1
const SEAT_COUNTS = {
  1: { top: 1 },
  2: { left: 1, right: 1 },
  3: { left: 1, top: 1, right: 1 },
  4: { left: 1, top: 2, right: 1 },
  5: { left: 1, top: 3, right: 1 },
  6: { 'bottom-left': 1, left: 1, top: 2, right: 1, 'bottom-right': 1 },
  7: { 'bottom-left': 1, left: 1, top: 3, right: 1, 'bottom-right': 1 },
};

// Seats the opponents clockwise from the current player: the player right after them sits at the bottom
// left (or the left), then come the left, the top (from left to right), the right and the bottom right.
function seatOpponents(players) {
  const meIndex = players.findIndex(player => player.current_user);
  // Opponents in turn order, starting with the player right after the current one
  const opponents = [...players.slice(meIndex + 1), ...players.slice(0, meIndex)];
  const counts = SEAT_COUNTS[opponents.length] ?? {};

  const seats = {};
  let next = 0;
  SEATS.forEach(seat => {
    const count = counts[seat] ?? 0;
    seats[seat] = opponents.slice(next, next + count);
    next += count;
  });
  return seats;
}

// The green table: the current player at the bottom center, the opponents around, and `children` in the middle.
// renderPlayer(player, { small }) draws one seat; small is true for the opponents (smaller names).
// corner is shown in the bottom right corner of the table (the info button during the game).
export default function TableLayout({ players, renderPlayer, corner, children }) {
  const me = players.find(player => player.current_user);
  const seats = seatOpponents(players);
  const classes = ['table-layout'];
  // With a player at the bottom right, the corner gets its own space below them
  if (seats['bottom-right'].length > 0) classes.push('table-layout--bottom-seats');

  return (
    <div className={classes.join(' ')}>
      {SEATS.map(seat => (
        <div key={seat} className={`table-layout__seats table-layout__seats--${seat}`}>
          {seats[seat].map(player => (
            <div key={player.id}>{renderPlayer(player, { small: true })}</div>
          ))}
        </div>
      ))}

      <div className="table-layout__center">{children}</div>

      <div className="table-layout__me">
        {me && renderPlayer(me, { small: false })}
      </div>

      {corner && <div className="table-layout__corner">{corner}</div>}
    </div>
  );
}
