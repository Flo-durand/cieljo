import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Joueur';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Tableau de bord de Cieljo 🚀</h2>
      <p>Ravi de vous revoir, <strong>{username}</strong> ! Vous êtes connecté et prêt à jouer.</p>

      <div style={{ margin: '30px 0', padding: '20px', border: '1px dashed #ccc', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
        <h3>🎮 Vos Actions de Jeu</h3>
        {/* Les futurs boutons pour créer/rejoindre une partie se placeront ici */}
        <p style={{ color: '#666' }}>Bientôt disponible : Créer un salon de jeu Skyjo.</p>
      </div>

      <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Se déconnecter
      </button>
    </div>
  );
}
