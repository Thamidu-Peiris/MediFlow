import { Link } from "react-router-dom";

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <section className="auth-card auth-register-options">
        <p className="auth-chip">Create Account</p>
        <h2>Choose registration type</h2>
        <p className="auth-note">
          Admin accounts are created manually by system administrators.
        </p>
        <div className="auth-option-grid">
          <Link to="/register/patient" className="auth-option-card">
            <h3>Register as Patient</h3>
            <p>Manage profile, reports, prescriptions and appointment history.</p>
          </Link>
          <Link to="/register/doctor" className="auth-option-card">
            <h3>Register as Doctor</h3>
            <p>Create doctor account to manage availability and patient consultations.</p>
          </Link>
        </div>
        <p className="auth-note">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
