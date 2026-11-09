import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Player';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Cieljo dashboard 🚀</h2>
      <p>Welcome back, <strong>{username}</strong>! You're logged in and ready to play.</p>

      <div style={{ margin: '30px 0', padding: '20px', border: '1px dashed #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <h3>🎮 Game actions</h3>
        {/* Future create/join game buttons go here */}
        <p style={{ color: '#666' }}>Coming soon: create a Skyjo game room.</p>
      </div>

      <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Log out
      </button>
    </div>
  );
}
