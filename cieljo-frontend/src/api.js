export const API_URL = 'http://localhost:3000/api/v1';

// Headers for public requests (sign-up, login)
export const jsonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Headers for authenticated requests (the JWT is stored in localStorage at login)
export const authHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return {
    ...jsonHeaders,
    // Safety: make sure the token starts with "Bearer "
    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
  };
};

// Forgets the local session (token and username)
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
}

// Logs out on the server too: the API revokes the user's tokens on all their devices. A plain fetch, so an
// already expired token does not show the "session expired" page; the local session is cleared in any case.
export async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, { method: 'DELETE', headers: authHeaders() });
  } catch {
    // The backend cannot be reached: the local session is cleared anyway
  }
  clearSession();
}

// Sends an authenticated request to the API (path like '/games') and returns the response.
// When the API answers 401, the session has expired or was revoked (for example after a logout on another
// device): the local session is cleared and the login page opens with a message, then brings the user back
// to the current page. The returned promise then
// never resolves, so the page that made the request shows no error while it is replaced.
export async function apiFetch(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    clearSession();
    // Come back to the current page once logged in again
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/auth?expired=1&next=${next}`);
    return new Promise(() => {});
  }
  return response;
}
