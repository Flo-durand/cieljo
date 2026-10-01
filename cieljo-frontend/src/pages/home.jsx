import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/v1';

export default function Home() {
  const navigate = useNavigate();

  // Initialisation propre et directe à partir du localStorage
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));
  console.log(token)
  // Utilisation unique de 'message' pour centraliser les retours utilisateur
  const [message, setMessage] = useState('');

  const handleCreateGame = async () => {
    try {
    // Sécurité : On s'assure que le token commence bien par "Bearer "
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;


      const response = await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': authToken // Envoi du Token JWT obligatoire
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(''); // On nettoie les messages en cas de succès
        navigate(`/game/${data.data.room_code}`); // Redirection flash vers le salon
      } else {
        setMessage("Erreur lors de la création de la partie.");
      }
    } catch (error) {
      setMessage(`Impossible de joindre le serveur backend. Détails : ${error.message || error}`);
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
      <h1>🃏 Bienvenue sur Cieljo</h1>

      {/* Affichage du message s'il y en a un (erreur d'authentification ou réseau) */}
      {message && <p style={{ color: '#dc3545', fontWeight: 'bold' }}>{message}</p>}

      {!token ? (
        <div>
          <p style={{ fontSize: '18px', color: '#555' }}>
            Le jeu de cartes stratégique et palpitant, directement dans votre navigateur.
          </p>
          <div style={{ marginTop: '30px' }}>
            <button
              onClick={() => navigate('/auth')}
              style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', borderRadius: '5px', backgroundColor: '#007BFF', color: '#fff', border: 'none' }}
            >
              Rejoindre l'aventure (Connexion / Inscription)
            </button>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <p style={{ fontSize: '20px', color: '#28a745' }}>
            Ravi de vous revoir, <strong>{username}</strong> ! 🟢
          </p>

          <div style={{ margin: '40px 0', padding: '30px', border: '1px dashed #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h3>🎮 Vos Actions de Jeu</h3>
            <p>Le salon est prêt. Vous pouvez maintenant créer ou rejoindre une table de Skyjo.</p>

            <button
              onClick={handleCreateGame}
              style={{ padding: '10px 20px', fontSize: '15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', marginRight: '10px' }}
            >
              Créer une partie
            </button>

            <button style={{ padding: '10px 20px', fontSize: '15px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              Rejoindre une partie
            </button>
          </div>

          <button onClick={handleLogout} style={{ padding: '8px 16px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
