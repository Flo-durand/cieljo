import { Navigate, useLocation } from 'react-router-dom';

// Wraps the pages that need a logged-in user: without a stored token, the login page opens,
// then brings the user back to this page once logged in (?next=...)
export default function RequireAuth({ children }) {
  const location = useLocation();

  if (!localStorage.getItem('token')) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  return children;
}
