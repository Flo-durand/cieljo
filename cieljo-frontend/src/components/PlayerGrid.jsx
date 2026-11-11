import Card from './Card';
import './PlayerGrid.scss';

// A player's 3x4 grid of cards with their name.
// canClickCard(card) tells which cards the player can click, and onCardClick(card) handles the click.
export default function PlayerGrid({ player, small = false, isPlaying = false, canClickCard, onCardClick }) {
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
        {player.grid.map(card => (
          <Card
            key={card.id}
            card={card}
            small={small}
            onClick={canClickCard?.(card) ? () => onCardClick(card) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
