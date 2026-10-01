import { useParams, useNavigate } from 'react-router-dom';

export default function GameRoom() {
  // Récupère dynamiquement le code de la room depuis l'URL (ex: /game/XF4G)
  const { room_code } = useParams();
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Joueur';

  const handleLeaveGame = () => {
    // Plus tard, nous préviendrons le backend Rails via l'API ou ActionCable
    navigate('/');
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h2>🎰 Table de Skyjo : Cieljo</h2>
        <button
          onClick={handleLeaveGame}
          style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Quitter la table
        </button>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h1 style={{ fontSize: '48px', color: '#007BFF', letterSpacing: '2px', margin: '10px 0' }}>
          Code du salon : {room_code}
        </h1>
        <p style={{ color: '#666' }}>Partagez ce code avec vos amis pour qu'ils rejoignent votre partie !</p>
      </div>

      <div style={{ maxWidth: '400px', margin: '40px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3>👥 Joueurs à la table</h3>
        <ul style={{ listStyleType: 'none', padding: 0, fontSize: '18px' }}>
          <li style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            👑 {username} <span style={{ color: '#28a745', fontSize: '14px' }}>(Hôte - Prêt)</span>
          </li>
          <li style={{ padding: '8px 0', color: '#999', fontStyle: 'italic' }}>
            En attente d'autres joueurs...
          </li>
        </ul>
      </div>

      <div style={{ marginTop: '30px' }}>
        <button
          style={{ padding: '12px 30px', fontSize: '16px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          disabled
        >
          Lancer la partie (Nécessite au moins 2 joueurs)
        </button>
      </div>
    </div>
  );
}
