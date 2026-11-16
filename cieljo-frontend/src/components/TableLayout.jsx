import { SEATS, seatOpponents } from '../game/seating';
import './TableLayout.scss';

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
