import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [message, setMessage] = useState('');

  const API_URL = 'http://localhost:3000/api/v1';

  // 1. Tester l'Inscription
const handleRegister = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // /!\ ATTENTION : C'est cet objet 'user' qui englobe tout qui est obligatoire pour Devise !
        user: {
          email: email,
          password: password,
          username: username
        }
      })
    });
    const data = await response.json();

    if (response.ok) {
      setMessage("Compte créé avec succès ! Vous pouvez vous connecter.");
    } else {
      setMessage(`Échec : ${data.status.errors.join(', ')}`);
    }
  } catch (error) {
    setMessage("Erreur réseau lors de l'inscription");
  }
};

  // 2. Tester la Connexion (Récupération du JWT)
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/users/sign_in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { email, password } })
      });

      const data = await response.json();

      // Extraction du token JWT depuis le header Authorization
      const jwtToken = response.headers.get('Authorization');

      if (jwtToken) {
        localStorage.setItem('token', jwtToken);
        setToken(jwtToken);
        setMessage(`Connecté en tant que ${data.data.username} !`);
      } else {
        setMessage("Connexion réussie mais aucun Token reçu (Vérifiez les CORS)");
      }
    } catch (error) {
      setMessage("Erreur lors de la connexion");
    }
  };

  // 3. Tester la Déconnexion
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/users/sign_out`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        }
      });
      localStorage.removeItem('token');
      setToken('');
      setMessage('Déconnecté avec succès.');
    } catch (error) {
      setMessage("Erreur lors de la déconnexion");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Cieljo - Test Auth</h1>
      {message && <p style={{ color: 'blue' }}><strong>{message}</strong></p>}

      {token ? (
        <div>
          <p>Vous êtes connecté ! Votre Token JWT est stocké.</p>
          <button onClick={handleLogout}>Se déconnecter</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '40px' }}>
          {/* Formulaire Inscription */}
          <form onSubmit={handleRegister}>
            <h3>Créer un compte</h3>
            <input type="text" placeholder="Pseudo" value={username} onChange={e => setUsername(e.target.value)} required /><br/><br/>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /><br/><br/>
            <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required /><br/><br/>
            <button type="submit">S'inscrire</button>
          </form>

          {/* Formulaire Connexion */}
          <form onSubmit={handleLogin}>
            <h3>Se connecter</h3>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required /><br/><br/>
            <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required /><br/><br/>
            <button type="submit">Se connecter</button>
          </form>
        </div>
      )}
    </div>
  );
}


export default App
