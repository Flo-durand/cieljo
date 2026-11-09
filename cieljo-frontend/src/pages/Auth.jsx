import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.scss';

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
        // Validation errors come in status.errors, auth errors in error
        const errors = data.status?.errors?.join(', ') || data.error || 'Sign-up failed.';
        setMessage(`Failed: ${errors}`);
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
    <div className="auth">
      <Link to="/" className="auth__back">← Back to home</Link>

      <h2>{isLoginMode ? "Log in" : "Create an account"}</h2>

      {message && <p className="auth__message">{message}</p>}

      {isLoginMode ? (
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="auth__input" /><br/>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="auth__input" /><br/>
          <button type="submit" className="btn btn--success auth__submit">Log in</button>
          <p className="auth__switch">
            New to Cieljo? <span onClick={() => { setIsLoginMode(false); setMessage(''); }} className="auth__switch-link">Create an account here</span>
          </p>
        </form>
      ) : (
        <form onSubmit={handleRegister}>
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className="auth__input" /><br/>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="auth__input" /><br/>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="auth__input" /><br/>
          <button type="submit" className="btn btn--primary auth__submit">Sign up</button>
          <p className="auth__switch">
            Already have an account? <span onClick={() => { setIsLoginMode(true); setMessage(''); }} className="auth__switch-link">Log in here</span>
          </p>
        </form>
      )}
    </div>
  );
}
