import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = 'http://localhost:3000/api/v1';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { email, password, username } })
      });
      const data = await response.json();

      if (response.ok) {
        setMessage("Compte créé avec succès ! Vous pouvez vous connecter.");
        setIsLoginMode(true);
      } else {
        setMessage(`Échec : ${data.status.errors.join(', ')}`);
      }
    } catch (error) {
      setMessage(`Erreur réseau lors de l'inscription: ${error}`);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { email, password } })
      });

      const data = await response.json();

      if (response.ok) {
        const jwtToken = data.data?.token;
        if (jwtToken) {
          localStorage.setItem('token', jwtToken);
          localStorage.setItem('username', data.data.username);
          navigate('/');
        }
      } else {
        setMessage(`Échec de la connexion : ${data.error || "Identifiants incorrects."}`);
      }
    } catch (error) {
      setMessage(`Erreur réseau lors de la connexion: ${error}`);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#007BFF' }}>← Retour à l'accueil</Link>

      <h2>{isLoginMode ? "Connexion" : "Créer un compte"}</h2>

      {message && <p style={{ color: 'red' }}>{message}</p>}

      {isLoginMode ? (
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} /><br/>
          <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '20px', boxSizing: 'border-box' }} /><br/>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Se connecter</button>
          <p style={{ textAlign: 'center', marginTop: '15px' }}>
            Nouveau sur Cieljo ? <span onClick={() => { setIsLoginMode(false); setMessage(''); }} style={{ color: '#007BFF', cursor: 'pointer' }}>Créez un compte ici</span>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Pseudo" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} /><br/>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} /><br/>
          <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '20px', boxSizing: 'border-box' }} /><br/>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007BFF', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>S'inscrire</button>
          <p style={{ textAlign: 'center', marginTop: '15px' }}>
            Déjà un compte ? <span onClick={() => { setIsLoginMode(true); setMessage(''); }} style={{ color: '#007BFF', cursor: 'pointer' }}>Connectez-vous ici</span>
          </p>
        </form>
      )}
    </div>
  );
}
