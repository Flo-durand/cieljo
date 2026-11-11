import Card from './Card';
import PlayerGrid from './PlayerGrid';
import './GameTable.scss';

// Must match Game::INITIAL_REVEAL_COUNT in the backend
const INITIAL_REVEAL_COUNT = 2;

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

const faceUpCount = player => player.grid.filter(card => card.face_up).length;

// Message shown in the middle of the table
function tableMessage({ me, players, initialReveal, currentPlayerId }) {
  if (initialReveal) {
    const left = INITIAL_REVEAL_COUNT - faceUpCount(me);
    if (left > 0) return `Reveal ${left} card${left > 1 ? 's' : ''} of your grid.`;
    return 'Waiting for the other players to reveal their cards...';
  }

  const playing = players.find(player => player.id === currentPlayerId);
  if (!playing) return '';
  return playing.current_user ? "It's your turn!" : `It's ${playing.username}'s turn.`;
}

export default function GameTable({ players, drawPileCount, discardTop, initialReveal, currentPlayerId, onRevealCard }) {
  const me = players.find(player => player.current_user);
  const seats = seatOpponents(players);

  // During the initial reveal, the player can click their face-down cards until 2 are face up
  const canRevealCard = card =>
    initialReveal && !card.face_up && faceUpCount(me) < INITIAL_REVEAL_COUNT;

  return (
    <div className="game-table">
      {['left', 'top', 'right'].map(side => (
        <div key={side} className={`game-table__seats game-table__seats--${side}`}>
          {seats[side].map(player => (
            <PlayerGrid key={player.id} player={player} small isPlaying={player.id === currentPlayerId} />
          ))}
        </div>
      ))}

      <div className="game-table__center">
        <div className="game-table__piles">
          <div className="game-table__pile">
            <Card card={drawPileCount > 0 ? { face_up: false } : null} />
            <span>Draw pile ({drawPileCount})</span>
          </div>
          <div className="game-table__pile">
            <Card card={discardTop} />
            <span>Discard pile</span>
          </div>
        </div>
        {me && (
          <p className="game-table__message">
            {tableMessage({ me, players, initialReveal, currentPlayerId })}
          </p>
        )}
      </div>

      <div className="game-table__me">
        {me && (
          <PlayerGrid
            player={me}
            isPlaying={me.id === currentPlayerId}
            canClickCard={canRevealCard}
            onCardClick={card => onRevealCard(card.id)}
          />
        )}
      </div>
    </div>
  );
}
