import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <main className="ap-page">
      {/* Left Visual Panel */}
      <div className="ap-panel">
        <div className="ap-panel-bg" />
        <div className="ap-panel-content">
          <Link to="/" className="ap-logo">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="apLogoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="18" stroke="url(#apLogoGrad2)" strokeWidth="2.5" fill="none"/>
              <rect x="18" y="10" width="4" height="20" rx="2" fill="url(#apLogoGrad2)"/>
              <rect x="10" y="18" width="20" height="4" rx="2" fill="url(#apLogoGrad2)"/>
            </svg>
            <span>MediFlow</span>
          </Link>
          <div className="ap-panel-hero">
            <img
              src="https://images.unsplash.com/photo-1638202993928-7267aad84c31?auto=format&fit=crop&w=800&q=80"
              alt="Healthcare"
              className="ap-panel-img"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
          <div className="ap-panel-text">
            <h2>Join MediFlow Today</h2>
            <p>Connect with top medical professionals and manage your healthcare journey seamlessly.</p>
          </div>
          <div className="ap-features">
            <div className="ap-feature-item">
              <div className="ap-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span>Book appointments instantly</span>
            </div>
            <div className="ap-feature-item">
              <div className="ap-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span>Access digital prescriptions</span>
            </div>
            <div className="ap-feature-item">
              <div className="ap-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span>HD video consultations</span>
            </div>
            <div className="ap-feature-item">
              <div className="ap-feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <span>Secure medical records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="ap-form-panel">
        <div className="ap-form-wrap">
          <div className="ap-form-header">
            <div className="ap-form-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <h1>Create Account</h1>
            <p>Choose how you want to join MediFlow</p>
          </div>

          <div className="ap-role-grid">
            <Link to="/register/patient" className="ap-role-card">
              <div className="ap-role-icon ap-role-icon--patient">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="ap-role-body">
                <h3>Patient</h3>
                <p>Book appointments, manage prescriptions, and track your health records.</p>
              </div>
              <div className="ap-role-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>

            <Link to="/register/doctor" className="ap-role-card">
              <div className="ap-role-icon ap-role-icon--doctor">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <div className="ap-role-body">
                <h3>Doctor</h3>
                <p>Manage patient consultations, set availability, and handle prescriptions.</p>
              </div>
              <div className="ap-role-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </Link>
          </div>

          <div className="ap-admin-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Admin accounts are created manually by system administrators.
          </div>

          <p className="ap-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
