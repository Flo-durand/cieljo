import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.scss';

const API_URL = 'http://localhost:3000/api/v1';

export default function Home() {
  const navigate = useNavigate();

  // Initialize directly from localStorage
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));
  console.log(token)
  // Single 'message' state for all user feedback
  const [message, setMessage] = useState('');

  // Join game form
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Safety: make sure the token starts with "Bearer " (JWT is required)
    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
  });

  const handleCreateGame = async () => {
    try {
      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: authHeaders()
      });

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
      const response = await fetch(`${API_URL}/games/join`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ room_code: roomCode.trim() })
      });

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
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
                <input
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
          </div>

          <button onClick={handleLogout} className="btn btn--danger">
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
