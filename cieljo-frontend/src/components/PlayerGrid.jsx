import Card from './Card';
import './PlayerGrid.scss';

// Must match GameStarterService::GRID_ROWS x GRID_COLUMNS in the backend
const GRID_SIZE = 12;

// A player's 3x4 grid of cards with their name.
// Before the deal (empty grid), invisible slots keep the grid's size, so the table does not grow at the start.
// canClickCard(card) tells which cards the player can click, and onCardClick(card) handles the click.
// isCardHidden(card) hides the cards that the deal animation has not brought yet.
// isDropTarget(card) highlights the card under a dragged card.
export default function PlayerGrid({
  player, small = false, isPlaying = false, canClickCard, onCardClick, isCardHidden, isDropTarget,
}) {
  const classes = ['player-grid'];
  if (small) classes.push('player-grid--small');
  if (isPlaying) classes.push('player-grid--playing');

  return (
    <div className={classes.join(' ')}>
      <div className="player-grid__name">
        {player.host && '👑 '}
        {player.username}
        {player.current_user && ' (you)'}
      </div>
      <div className="player-grid__cards">
        {player.grid.length > 0
          ? player.grid.map(card => (
            <Card
              key={card.id}
              card={card}
              small={small}
              className={[
                isCardHidden?.(card) && 'card--hidden',
                isDropTarget?.(card) && 'card--drop-target',
              ].filter(Boolean).join(' ')}
              onClick={canClickCard?.(card) ? () => onCardClick(card) : undefined}
            />
          ))
          : Array.from({ length: GRID_SIZE }, (_, index) => (
            <Card key={index} card={null} small={small} className="card--hidden" />
          ))}
      </div>
    </div>
  );
}
