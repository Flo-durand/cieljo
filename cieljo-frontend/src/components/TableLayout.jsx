import './TableLayout.scss';

// The 7 places around the table, in clockwise order from the current player, who sits at the bottom center:
//   [top-left]     [top]    [top-right]
//   [left]       (middle)   [right]
//   [bottom-left]   (me)    [bottom-right]
const SEATS = ['bottom-left', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-right'];

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
function seatOpponents(players) {
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
