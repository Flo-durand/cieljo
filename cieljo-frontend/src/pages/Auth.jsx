import { useId, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { API_URL, jsonHeaders } from '../api';
import './Auth.scss';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  // The API sends here with ?expired=1 when the session has expired or was revoked (see apiFetch in api.js)
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState(
    searchParams.get('expired') ? 'Your session has expired. Please log in again.' : ''
  );
  // Where to go once logged in (a protected page sends here with ?next=/game/ABCD). Only a path of this site
  // is accepted ("/..." but not "//..."), so a crafted link cannot send the user to another site.
  const next = searchParams.get('next') ?? '';
  const nextPage = next.startsWith('/') && !next.startsWith('//') ? next : '/';
  const [isLoginMode, setIsLoginMode] = useState(true);

  const navigate = useNavigate();
  const fieldId = useId();

  const switchMode = loginMode => {
    setIsLoginMode(loginMode);
    setMessage('');
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: jsonHeaders,
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
        headers: jsonHeaders,
        body: JSON.stringify({ user: { email, password } })
      });

      const data = await response.json();

      if (response.ok) {
        const jwtToken = data.data?.token;
        if (jwtToken) {
          localStorage.setItem('token', jwtToken);
          localStorage.setItem('username', data.data.username);
          navigate(nextPage);
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

      {/* role="alert": screen readers read the message as soon as it shows */}
      {message && <p className="auth__message" role="alert">{message}</p>}

      <form onSubmit={isLoginMode ? handleLogin : handleRegister}>
        {!isLoginMode && (
          <>
            <label htmlFor={`${fieldId}-username`} className="auth__label">Username</label>
            <input
              id={`${fieldId}-username`} type="text" autoComplete="username"
              value={username} onChange={e => setUsername(e.target.value)} required className="auth__input"
            />
          </>
        )}
        <label htmlFor={`${fieldId}-email`} className="auth__label">Email</label>
        <input
          id={`${fieldId}-email`} type="email" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)} required className="auth__input"
        />
        <label htmlFor={`${fieldId}-password`} className="auth__label">Password</label>
        <input
          id={`${fieldId}-password`} type="password"
          autoComplete={isLoginMode ? 'current-password' : 'new-password'}
          minLength={isLoginMode ? undefined : 8}
          aria-describedby={isLoginMode ? undefined : `${fieldId}-password-hint`}
          value={password} onChange={e => setPassword(e.target.value)} required className="auth__input"
        />
        {!isLoginMode && <p id={`${fieldId}-password-hint`} className="auth__hint">At least 8 characters.</p>}
        <button type="submit" className={`btn ${isLoginMode ? 'btn--success' : 'btn--primary'} auth__submit`}>
          {isLoginMode ? 'Log in' : 'Sign up'}
        </button>
      </form>

      <p className="auth__switch">
        {isLoginMode ? 'New to Cieljo? ' : 'Already have an account? '}
        <button type="button" onClick={() => switchMode(!isLoginMode)} className="auth__switch-link">
          {isLoginMode ? 'Create an account here' : 'Log in here'}
        </button>
      </p>
    </div>
  );
}
