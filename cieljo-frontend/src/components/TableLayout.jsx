import './TableLayout.scss';

// Seats the opponents around the table, clockwise from the current player (who sits at the bottom):
// left side (bottom to top), then the top (left to right), then the right side (top to bottom).
function seatOpponents(players) {
  const meIndex = players.findIndex(player => player.current_user);
  // Opponents in turn order, starting with the player right after the current one
  const opponents = [...players.slice(meIndex + 1), ...players.slice(0, meIndex)];
  const count = opponents.length;

  if (count === 1) return { left: [], top: opponents, right: [] };
  if (count === 2) return { left: [opponents[0]], top: [], right: [opponents[1]] };

  const perSide = Math.max(1, Math.floor(count / 3));
  return {
    left: opponents.slice(0, perSide).reverse(),
    top: opponents.slice(perSide, count - perSide),
    right: opponents.slice(count - perSide),
  };
}

// The green table: the current player at the bottom, the opponents around, and `children` in the middle.
// renderPlayer(player, { small }) draws one seat; opponents are drawn small.
export default function TableLayout({ players, renderPlayer, children }) {
  const me = players.find(player => player.current_user);
  const seats = seatOpponents(players);

  return (
    <div className="table-layout">
      {['left', 'top', 'right'].map(side => (
        <div key={side} className={`table-layout__seats table-layout__seats--${side}`}>
          {seats[side].map(player => (
            <div key={player.id}>{renderPlayer(player, { small: true })}</div>
          ))}
        </div>
      ))}

      <div className="table-layout__center">{children}</div>

      <div className="table-layout__me">
        {me && renderPlayer(me, { small: false })}
      </div>
    </div>
  );
}
