export const API_URL = 'http://localhost:3000/api/v1';

// Headers for authenticated requests (the JWT is stored in localStorage at login)
export const authHeaders = () => {
  const token = localStorage.getItem('token') || '';
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Safety: make sure the token starts with "Bearer "
    'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
  };
};
