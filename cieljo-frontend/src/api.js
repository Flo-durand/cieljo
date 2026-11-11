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
