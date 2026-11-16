import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, logout } from '../api';
import './Home.scss';

// One line about a game of the user: the lobby, the reveal of the first cards, or whose turn it is
function gameState(game) {
  if (game.status === 'pending') return `Lobby · ${game.players_count}/${game.max_players} players`;
  if (game.initial_reveal) return 'Revealing the first cards';
  if (game.your_turn) return 'Your turn!';
  return game.current_player ? `${game.current_player}'s turn` : 'In progress';
}

export default function Home() {
  const navigate = useNavigate();

  // Initialize directly from localStorage
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));
  // A stored token may have expired or been revoked: check it with the API when the page opens.
  // apiFetch sends to the login page on a 401; otherwise the username is refreshed from the server.
  useEffect(() => {
    if (!token) return undefined;
    let active = true;

    const checkSession = async () => {
      try {
        const response = await apiFetch('/me');
        if (!response.ok || !active) return;
        const data = await response.json();
        localStorage.setItem('username', data.data.username);
        setUsername(data.data.username);
      } catch {
        // The backend cannot be reached: keep the stored session, the actions will show the error
      }
    };

    checkSession();
    return () => {
      active = false;
    };
  }, [token]);

  // The games of the user in the lobby or in progress, to come back to a paused game. Loaded when the page opens
  // (for the count on the "My games" button) and again each time the list is opened.
  const [myGames, setMyGames] = useState([]);
  const [showMyGames, setShowMyGames] = useState(false);

  const fetchMyGames = async () => {
    try {
      const response = await apiFetch('/games');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      // The backend cannot be reached: no list, the actions will show the error
      return null;
    }
  };

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    fetchMyGames().then(games => {
      if (active && games) setMyGames(games);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const handleToggleMyGames = async () => {
    const opening = !showMyGames;
    setShowMyGames(opening);
    if (!opening) return;
    const games = await fetchMyGames();
    if (games) setMyGames(games);
  };

  // Single 'message' state for all user feedback
  const [message, setMessage] = useState('');

  // Join game form
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  const handleCreateGame = async () => {
    try {
      const response = await apiFetch('/games', { method: 'POST' });

      const data = await response.json();

      if (response.ok) {
        setMessage(''); // Clear messages on success
        navigate(`/game/${data.data.room_code}`); // Redirect to the game room
      } else {
        setMessage("Error while creating the game.");
      }
    } catch (error) {
      setMessage(`Could not reach the backend server. Details: ${error.message || error}`);
    }
  };

  const handleToggleJoinForm = () => {
    setShowJoinForm(!showJoinForm);
    setRoomCode('');
    setMessage('');
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/games/join', { method: 'POST', body: { room_code: roomCode.trim() } });

      const data = await response.json();

      if (response.ok) {
        setMessage('');
        navigate(`/game/${data.data.room_code}`);
      } else {
        // The API explains why: unknown code, already in the game, game already started...
        setMessage(data.error || "Could not join the game.");
      }
    } catch (error) {
      setMessage(`Could not reach the backend server. Details: ${error.message || error}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    setToken(null);
    setUsername(null);
    setMessage('');
    navigate('/');
  };

  return (
    <div className="home">
      <h1>🃏 Welcome to Cieljo</h1>

      {/* Show the message if there is one (auth or network error) */}
      {message && <p className="home__message">{message}</p>}

      {!token ? (
        <div>
          <p className="home__intro">
            The thrilling strategy card game, right in your browser.
          </p>
          <div className="home__cta-wrapper">
            <button
              onClick={() => navigate('/auth')}
              className="btn btn--primary home__cta"
            >
              Join the adventure (Log in / Sign up)
            </button>
          </div>
        </div>
      ) : (
        <div className="home__lobby">
          <p className="home__welcome">
            Welcome back, <strong>{username}</strong>! 🟢
          </p>

          <div className="home__panel">
            <h3>🎮 Game actions</h3>
            <p>The lobby is ready. You can now create or join a Skyjo table.</p>

            <button
              onClick={handleCreateGame}
              className="btn btn--success home__action home__action--spaced"
            >
              Create a game
            </button>

            <button onClick={handleToggleJoinForm} className="btn btn--info home__action">
              {showJoinForm ? 'Cancel' : 'Join a game'}
            </button>

            {showJoinForm && (
              <form onSubmit={handleJoinGame} className="home__join-form">
                <label htmlFor="home-room-code" className="home__join-label">Room code</label>
                <input
                  id="home-room-code"
                  type="text"
                  placeholder="Room code (e.g. XF4G)"
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={4}
                  required
                  autoFocus
                  className="home__join-input"
                />
                <button type="submit" className="btn btn--success home__action">
                  Join
                </button>
              </form>
            )}

            <div className="home__my-games">
              <button
                type="button"
                className="btn btn--primary home__action"
                onClick={handleToggleMyGames}
                aria-expanded={showMyGames}
                aria-controls="home-my-games"
              >
                {showMyGames ? 'Hide my games' : `My games (${myGames.length})`}
              </button>
            </div>

            {showMyGames && (
              <section id="home-my-games" className="home__games" aria-label="My games">
                {myGames.length === 0 ? (
                  <p className="home__games-empty">You have no game in the lobby or in progress.</p>
                ) : (
                  <ul className="home__games-list">
                    {myGames.map(game => (
                      <li key={game.room_code} className="home__game">
                        <span className="home__game-code">{game.room_code}</span>
                        <span className={`home__game-state ${game.your_turn ? 'home__game-state--your-turn' : ''}`}>
                          {gameState(game)}
                        </span>
                        <button
                          type="button"
                          className="btn btn--success home__action"
                          onClick={() => navigate(`/game/${game.room_code}`)}
                        >
                          {game.status === 'pending' ? 'Open' : 'Resume'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>

          <button onClick={handleLogout} className="btn btn--danger">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
