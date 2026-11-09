import { useNavigate } from 'react-router-dom';
import './Dashboard.scss';

export default function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Player';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div className="dashboard">
      <h2>Cieljo dashboard 🚀</h2>
      <p>Welcome back, <strong>{username}</strong>! You're logged in and ready to play.</p>

      <div className="dashboard__panel">
        <h3>🎮 Game actions</h3>
        {/* Future create/join game buttons go here */}
        <p className="dashboard__muted">Coming soon: create a Skyjo game room.</p>
      </div>

      <button onClick={handleLogout} className="btn btn--danger">
        Log out
      </button>
    </div>
  );
}
