import { useParams, useNavigate } from 'react-router-dom';

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
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h2>🎰 Skyjo table: Cieljo</h2>
        <button
          onClick={handleLeaveGame}
          style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Leave the table
        </button>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h1 style={{ fontSize: '48px', color: '#007BFF', letterSpacing: '2px', margin: '10px 0' }}>
          Room code: {room_code}
        </h1>
        <p style={{ color: '#666' }}>Share this code with your friends so they can join your game!</p>
      </div>

      <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3>👥 Players at the table</h3>
        <ul style={{ listStyleType: 'none', padding: 0, fontSize: '18px' }}>
          <li style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            👑 {username} <span style={{ color: '#28a745', fontSize: '14px' }}>(Host - Ready)</span>
          </li>
          <li style={{ padding: '8px 0', color: '#999', fontStyle: 'italic' }}>
            Waiting for other players...
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '30px' }}>
        <button
          style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          disabled
        >
          Start the game (requires at least 2 players)
        </button>
      </div>
    </div>
  );
}
