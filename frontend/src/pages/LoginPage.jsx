import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", role: "patient" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loggedInUser = await login(form.email, form.password, form.role);
      if (loggedInUser.role === "patient") {
        navigate("/patient/dashboard");
      } else if (loggedInUser.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/doctors");
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ap-page">
      {/* Left Visual Panel */}
      <div className="ap-panel">
        <div className="ap-panel-bg" />
        <div className="ap-panel-content">
          <Link to="/" className="ap-logo">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="apLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="18" stroke="url(#apLogoGrad)" strokeWidth="2.5" fill="none"/>
              <rect x="18" y="10" width="4" height="20" rx="2" fill="url(#apLogoGrad)"/>
              <rect x="10" y="18" width="20" height="4" rx="2" fill="url(#apLogoGrad)"/>
            </svg>
            <span>MediFlow</span>
          </Link>
          <img
            src="https://images.unsplash.com/photo-1585842378054-ee2e52f94ba2?auto=format&fit=crop&w=800&q=80"
            alt="Doctor"
            className="ap-panel-img"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="ap-form-panel">
        <div className="ap-form-wrap">
          <div className="ap-form-header">
            <div className="ap-form-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <h1>Welcome Back</h1>
            <p>Sign in to your MediFlow account</p>
          </div>

          {message && (
            <div className="ap-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {message}
            </div>
          )}

          <form onSubmit={onSubmit} className="ap-form">
            <div className="ap-field">
              <label>Email Address</label>
              <div className="ap-input-wrap">
                <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  placeholder="you@email.com"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="ap-field">
              <label>Password</label>
              <div className="ap-input-wrap">
                <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
                <button type="button" className="ap-eye-btn" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="ap-field">
              <label>Login As</label>
              <div className="ap-input-wrap">
                <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  required
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="ap-forgot">
              <Link to="/forgot-password">Forgot Password?</Link>
            </div>

            <button type="submit" className="ap-submit-btn" disabled={loading}>
              {loading ? (
                <span className="ap-spinner" />
              ) : (
                <>
                  Sign In
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="ap-switch">
            Don't have an account? <Link to="/register">Create one free</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
