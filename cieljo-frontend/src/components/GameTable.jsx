import Card from './Card';
import PlayerGrid from './PlayerGrid';
import './GameTable.scss';

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

export default function GameTable({ players, drawPileCount, discardTop }) {
  const me = players.find(player => player.current_user);
  const seats = seatOpponents(players);

  return (
    <div className="game-table">
      {['left', 'top', 'right'].map(side => (
        <div key={side} className={`game-table__seats game-table__seats--${side}`}>
          {seats[side].map(player => (
            <PlayerGrid key={player.id} player={player} small />
          ))}
        </div>
      ))}

      <div className="game-table__center">
        <div className="game-table__pile">
          <Card card={drawPileCount > 0 ? { face_up: false } : null} />
          <span>Draw pile ({drawPileCount})</span>
        </div>
        <div className="game-table__pile">
          <Card card={discardTop} />
          <span>Discard pile</span>
        </div>
      </div>

      <div className="game-table__me">
        {me && <PlayerGrid player={me} />}
      </div>
    </div>
  );
}
