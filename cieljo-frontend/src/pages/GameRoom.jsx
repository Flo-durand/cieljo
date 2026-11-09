import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL, authHeaders } from '../api';
import './GameRoom.scss';

// How often the player list is refreshed (until real-time updates with ActionCable)
const REFRESH_INTERVAL_MS = 3000;

export default function GameRoom() {
  // Read the room code from the URL (e.g. /game/XF4G)
  const { room_code } = useParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGame = async () => {
      try {
        const response = await fetch(`${API_URL}/games/${room_code}`, { headers: authHeaders() });
        const data = await response.json();

        if (response.ok) {
          setPlayers(data.data.players);
          setError('');
        } else {
          setError(data.error || 'Could not load the game.');
        }
      } catch (err) {
        setError(`Could not reach the backend server. Details: ${err.message || err}`);
      }
    };

    fetchGame();
    const intervalId = setInterval(fetchGame, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [room_code]);

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

      {error && <p className="game-room__error">{error}</p>}

      <div className="game-room__players">
        <h3>👥 Players at the table ({players.length})</h3>
        <ul className="game-room__player-list">
          {players.map(player => (
            <li key={player.id} className="game-room__player">
              {player.host && '👑 '}
              {player.username}
              {player.current_user && <span className="game-room__you"> (you)</span>}
              {player.host && <span className="game-room__player-status"> (Host)</span>}
            </li>
          ))}
          {players.length < 2 && (
            <li className="game-room__player game-room__player--waiting">
              Waiting for other players...
            </li>
          )}
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
