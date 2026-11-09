import { useParams, useNavigate } from 'react-router-dom';
import './GameRoom.scss';

export default function GameRoom() {
  // Read the room code from the URL (e.g. /game/XF4G)
  const { room_code } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Player';

  const handleLeaveGame = () => {
    // Later, notify the Rails backend through the API or ActionCable
    navigate('/');
  };

  return (
    <div className="game-room">
      <div className="game-room__header">
        <h2>🎰 Skyjo table: Cieljo</h2>
        <button
          onClick={handleLeaveGame}
          className="btn btn--danger"
        >
          Leave the table
        </button>
      </div>

      <div className="game-room__code-section">
        <h1 className="game-room__code">
          Room code: {room_code}
        </h1>
        <p className="game-room__hint">Share this code with your friends so they can join your game!</p>
      </div>

      <div className="game-room__players">
        <h3>👥 Players at the table</h3>
        <ul className="game-room__player-list">
          <li className="game-room__player">
            👑 {username} <span className="game-room__player-status">(Host - Ready)</span>
          </li>
          <li className="game-room__player game-room__player--waiting">
            Waiting for other players...
          </li>
        </ul>
      </div>

      <div className="game-room__actions">
        <button
          className="btn btn--success game-room__start"
          disabled
        >
          Start the game (requires at least 2 players)
        </button>
      </div>
    </div>
  );
}
