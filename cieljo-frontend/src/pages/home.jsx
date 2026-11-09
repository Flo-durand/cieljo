import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/v1';

export default function Home() {
  const navigate = useNavigate();

  // Initialize directly from localStorage
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));
  console.log(token)
  // Single 'message' state for all user feedback
  const [message, setMessage] = useState('');

  const handleCreateGame = async () => {
    try {
    // Safety: make sure the token starts with "Bearer "
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;


      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authToken // JWT is required
        }
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    setMessage('');
    navigate('/');
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h1>🃏 Welcome to Cieljo</h1>

      {/* Show the message if there is one (auth or network error) */}
      {message && <p style={{ color: '#dc3545', fontWeight: 'bold' }}>{message}</p>}

      {!token ? (
        <div>
          <p style={{ fontSize: '18px', color: '#555' }}>
            The thrilling strategy card game, right in your browser.
          </p>
          <div style={{ marginTop: '30px' }}>
            <button
              onClick={() => navigate('/auth')}
              style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', borderRadius: '5px', backgroundColor: '#007BFF', color: '#fff', border: 'none' }}
            >
              Join the adventure (Log in / Sign up)
            </button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <p style={{ fontSize: '20px', color: '#28a745' }}>
            Welcome back, <strong>{username}</strong>! 🟢
          </p>

          <div style={{ margin: '40px 0', padding: '30px', border: '1px dashed #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h3>🎮 Game actions</h3>
            <p>The lobby is ready. You can now create or join a Skyjo table.</p>

            <button
              onClick={handleCreateGame}
              style={{ padding: '10px 20px', fontSize: '15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}
            >
              Create a game
            </button>

            <button style={{ padding: '10px 20px', fontSize: '15px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Join a game
            </button>
          </div>

          <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
