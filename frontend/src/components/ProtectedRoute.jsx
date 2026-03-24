import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { token, user, loadingUser } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loadingUser) {
    return (
      <main className="page">
        <section className="form-card">
          <p className="muted">Loading your account...</p>
        </section>
      </main>
    );
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
