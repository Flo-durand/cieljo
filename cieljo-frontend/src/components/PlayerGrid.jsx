import Card from './Card';
import './PlayerGrid.scss';

// A player's 3x4 grid of cards with their name
export default function PlayerGrid({ player, small = false }) {
  return (
    <div className={`player-grid ${small ? 'player-grid--small' : ''}`}>
      <div className="player-grid__name">
        {player.host && '👑 '}
        {player.username}
        {player.current_user && ' (you)'}
      </div>
      <div className="player-grid__cards">
        {player.grid.map(card => (
          <Card key={card.id} card={card} small={small} />
        ))}
      </div>
    </div>
  );
}
