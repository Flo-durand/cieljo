import { useEffect, useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, clearSession } from '../api';
import './Account.scss';

// Sends an account request and returns { ok, data }. A wrong current password or a refused value answers 422
// with `error` (never 401, which apiFetch treats as an expired session).
async function sendAccountRequest(method, user) {
  try {
    const response = await apiFetch('/me', { method, body: { user } });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, data };
  } catch (error) {
    return { ok: false, data: { error: `Could not reach the backend server. Details: ${error.message || error}` } };
  }
}

// The message under a form: green once saved, red for an error. role="status" lets screen readers read it.
function FormMessage({ message }) {
  if (!message) return null;
  return (
    <p role="status" className={`account__message account__message--${message.ok ? 'success' : 'error'}`}>
      {message.text}
    </p>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const fieldId = useId();

  // The account as saved on the server (to tell whether the email changed)
  const [account, setAccount] = useState(null);

  // Profile: username and email (the current password is only needed for a new email)
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileMessage, setProfileMessage] = useState(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Deletion: a first click shows the confirmation with the password field
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(null);
  const [deleted, setDeleted] = useState(false);

  const showAccount = user => {
    setAccount(user);
    setUsername(user.username);
    setEmail(user.email);
    localStorage.setItem('username', user.username);
  };

  useEffect(() => {
    let active = true;
    apiFetch('/me')
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        if (active && data) showAccount(data.data);
      })
      .catch(() => {
        if (active) setProfileMessage({ ok: false, text: 'Could not reach the backend server.' });
      });
    return () => {
      active = false;
    };
  }, []);

  const emailChanged = account !== null && email.trim().toLowerCase() !== account.email;

  const handleProfile = async e => {
    e.preventDefault();
    const user = { username: username.trim(), email: email.trim() };
    if (emailChanged) user.current_password = profilePassword;
    const { ok, data } = await sendAccountRequest('PATCH', user);
    if (ok) {
      showAccount(data.data);
      setProfilePassword('');
      setProfileMessage({ ok: true, text: 'Your profile is saved.' });
    } else {
      setProfileMessage({ ok: false, text: data.error || 'Could not save your profile.' });
    }
  };

  const handlePassword = async e => {
    e.preventDefault();
    const { ok, data } = await sendAccountRequest('PATCH', {
      password: newPassword,
      current_password: currentPassword,
    });
    if (ok) {
      // The old tokens are revoked on every device: this one keeps going with the new token
      localStorage.setItem('token', data.data.token);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMessage({ ok: true, text: 'Your password is changed. Your other devices are logged out.' });
    } else {
      setPasswordMessage({ ok: false, text: data.error || 'Could not change your password.' });
    }
  };

  const handleDelete = async e => {
    e.preventDefault();
    const { ok, data } = await sendAccountRequest('DELETE', { current_password: deletePassword });
    if (ok) {
      clearSession();
      setDeleted(true);
    } else {
      setDeleteMessage({ ok: false, text: data.error || 'Could not delete your account.' });
    }
  };

  const cancelDelete = () => {
    setConfirmingDelete(false);
    setDeletePassword('');
    setDeleteMessage(null);
  };

  if (deleted) {
    return (
      <div className="account">
        <h2>Account deleted</h2>
        <p role="status">Your account and your games are deleted. Thank you for playing Cieljo!</p>
        <button type="button" className="btn btn--primary account__submit" onClick={() => navigate('/')}>
          Back to the home page
        </button>
      </div>
    );
  }

  return (
    <div className="account">
      <Link to="/" className="account__back">← Back to home</Link>
      <h2>My account</h2>

      <section className="account__section" aria-labelledby={`${fieldId}-profile`}>
        <h3 id={`${fieldId}-profile`}>Profile</h3>
        <form onSubmit={handleProfile}>
          <label htmlFor={`${fieldId}-username`} className="account__label">Username</label>
          <input
            id={`${fieldId}-username`} type="text" autoComplete="username" minLength={3} maxLength={20}
            value={username} onChange={e => setUsername(e.target.value)} required className="account__input"
          />
          <label htmlFor={`${fieldId}-email`} className="account__label">Email</label>
          <input
            id={`${fieldId}-email`} type="email" autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)} required className="account__input"
          />
          {emailChanged && (
            <>
              <label htmlFor={`${fieldId}-profile-password`} className="account__label">
                Current password (needed to change your email)
              </label>
              <input
                id={`${fieldId}-profile-password`} type="password" autoComplete="current-password"
                value={profilePassword} onChange={e => setProfilePassword(e.target.value)} required
                className="account__input"
              />
            </>
          )}
          <button type="submit" className="btn btn--success account__submit" disabled={!account}>
            Save my profile
          </button>
        </form>
        <FormMessage message={profileMessage} />
      </section>

      <section className="account__section" aria-labelledby={`${fieldId}-password`}>
        <h3 id={`${fieldId}-password`}>Password</h3>
        <form onSubmit={handlePassword}>
          <label htmlFor={`${fieldId}-current-password`} className="account__label">Current password</label>
          <input
            id={`${fieldId}-current-password`} type="password" autoComplete="current-password"
            value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
            className="account__input"
          />
          <label htmlFor={`${fieldId}-new-password`} className="account__label">New password</label>
          <input
            id={`${fieldId}-new-password`} type="password" autoComplete="new-password" minLength={8}
            aria-describedby={`${fieldId}-new-password-hint`}
            value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="account__input"
          />
          <p id={`${fieldId}-new-password-hint`} className="account__hint">
            At least 8 characters. Your other devices will be logged out.
          </p>
          <button type="submit" className="btn btn--success account__submit">Change my password</button>
        </form>
        <FormMessage message={passwordMessage} />
      </section>

      <section className="account__section account__section--danger" aria-labelledby={`${fieldId}-delete`}>
        <h3 id={`${fieldId}-delete`}>Delete my account</h3>
        <p className="account__hint">
          You leave all your games (a game in progress goes on without you) and your account is deleted for good.
        </p>
        {confirmingDelete ? (
          <form onSubmit={handleDelete}>
            <label htmlFor={`${fieldId}-delete-password`} className="account__label">
              Enter your password to confirm
            </label>
            <input
              id={`${fieldId}-delete-password`} type="password" autoComplete="current-password" autoFocus
              value={deletePassword} onChange={e => setDeletePassword(e.target.value)} required
              className="account__input"
            />
            <div className="account__actions">
              <button type="button" className="btn btn--secondary" onClick={cancelDelete}>Cancel</button>
              <button type="submit" className="btn btn--danger">Delete my account for good</button>
            </div>
          </form>
        ) : (
          <button type="button" className="btn btn--danger" onClick={() => setConfirmingDelete(true)}>
            Delete my account…
          </button>
        )}
        <FormMessage message={deleteMessage} />
      </section>
    </div>
  );
}
