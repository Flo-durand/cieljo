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
        setMessage("Account created successfully! You can now log in.");
        setIsLoginMode(true);
      } else {
        setMessage(`Failed: ${data.status.errors.join(', ')}`);
      }
    } catch (error) {
      setMessage(`Network error during sign-up: ${error}`);
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
        setMessage(`Login failed: ${data.error || "Invalid credentials."}`);
      }
    } catch (error) {
      setMessage(`Network error during login: ${error}`);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#007BFF' }}>← Back to home</Link>

      <h2>{isLoginMode ? "Log in" : "Create an account"}</h2>

      {message && <p style={{ color: 'red' }}>{message}</p>}

      {isLoginMode ? (
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} /><br/>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '20px', boxSizing: 'border-box' }} /><br/>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Log in</button>
          <p style={{ textAlign: 'center', marginTop: '15px' }}>
            New to Cieljo? <span onClick={() => { setIsLoginMode(false); setMessage(''); }} style={{ color: '#007BFF', cursor: 'pointer' }}>Create an account here</span>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} /><br/>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }} /><br/>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '20px', boxSizing: 'border-box' }} /><br/>
          <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#007BFF', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sign up</button>
          <p style={{ textAlign: 'center', marginTop: '15px' }}>
            Already have an account? <span onClick={() => { setIsLoginMode(true); setMessage(''); }} style={{ color: '#007BFF', cursor: 'pointer' }}>Log in here</span>
          </p>
        </form>
      )}
    </div>
  );
}
