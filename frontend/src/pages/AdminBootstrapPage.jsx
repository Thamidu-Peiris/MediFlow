import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminBootstrapPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    bootstrapKey: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await api.post("/auth/admin/bootstrap", {
        name: form.name,
        email: form.email,
        password: form.password,
        bootstrapKey: form.bootstrapKey,
      });

      await login(form.email, form.password, "admin");
      navigate("/admin/dashboard");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ap-page">
      <div className="ap-panel">
        <div className="ap-panel-bg" />
        <div className="ap-panel-content">
          <Link to="/" className="ap-logo">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="apLogoGradAdmin" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="18" stroke="url(#apLogoGradAdmin)" strokeWidth="2.5" fill="none" />
              <rect x="18" y="10" width="4" height="20" rx="2" fill="url(#apLogoGradAdmin)" />
              <rect x="10" y="18" width="20" height="4" rx="2" fill="url(#apLogoGradAdmin)" />
            </svg>
            <span>MediFlow</span>
          </Link>
          <img
            src="https://images.unsplash.com/photo-1580281658628-59a2aa2c2f89?auto=format&fit=crop&w=800&q=80"
            alt="Admin"
            className="ap-panel-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>

      <div className="ap-form-panel">
        <div className="ap-form-wrap">
          <div className="ap-form-header">
            <div
              className="ap-form-icon"
              style={{ background: "linear-gradient(135deg, #d1fae5, #a7f3d0)", color: "#0d9488" }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z" />
                <polyline points="9 12 12 15 17 10" />
              </svg>
            </div>
            <h1>Admin Bootstrap</h1>
            <p>Create an admin account using the backend bootstrap key.</p>
          </div>

          {message ? (
            <div className="ap-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {message}
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="ap-form" noValidate>
            <div className="ap-field">
              <label>Admin Name</label>
              <div className="ap-input-wrap">
                <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="ap-field">
              <label>Email</label>
              <div className="ap-input-wrap">
                <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v16H4z" />
                  <path d="M4 6l8 6 8-6" />
                </svg>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="ap-field">
              <label>Password</label>
              <div className="ap-input-wrap">
                <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  placeholder="Create password"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="ap-field">
              <label>Bootstrap Key</label>
              <div className="ap-input-wrap">
                <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73L13 3l-8 3.27A2 2 0 0 0 4 8v8l8 3 9-3z" />
                  <polyline points="13 3 13 11 21 16" />
                  <polyline points="4 8 13 11 13 19" />
                </svg>
                <input
                  type="password"
                  placeholder="Paste ADMIN_BOOTSTRAP_KEY"
                  value={form.bootstrapKey}
                  onChange={(e) => setForm((p) => ({ ...p, bootstrapKey: e.target.value }))}
                  required
                />
              </div>
            </div>

            <button type="submit" className="ap-submit-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Admin"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>

            <p className="ap-switch" style={{ marginTop: 16 }}>
              Use this only for development. <Link to="/login">Back to Login</Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

