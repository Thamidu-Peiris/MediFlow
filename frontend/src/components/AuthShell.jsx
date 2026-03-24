import { Link, NavLink } from "react-router-dom";

export default function AuthShell({ title, subtitle, children }) {
  return (
    <main className="page">
      <section className="hero-card">
        <div>
          <p className="brand">MediFlow</p>
          <h1>{title}</h1>
          <p className="muted">{subtitle}</p>
        </div>
        <nav className="tabs">
          <NavLink to="/login">Login</NavLink>
          <NavLink to="/register/patient">Patient Signup</NavLink>
          <NavLink to="/register/doctor">Doctor Signup</NavLink>
        </nav>
      </section>
      <section className="form-card">{children}</section>
      <p className="muted center">
        Admin accounts are created by system administrators only. <Link to="/login">Sign in</Link>
      </p>
    </main>
  );
}
