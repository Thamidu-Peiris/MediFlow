import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/patient/dashboard", label: "Dashboard" },
  { to: "/patient/profile", label: "Profile" },
  { to: "/patient/reports", label: "Medical Reports" },
  { to: "/patient/history", label: "Medical History" },
  { to: "/patient/prescriptions", label: "Prescriptions" },
  { to: "/patient/appointments", label: "Appointments" }
];

export default function PatientShell({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <main className="pd-page">
      <header className="pd-topbar">
        <div className="pd-brand">
          <h1>MediFlow Patient Portal</h1>
          <p>{subtitle || "Secure healthcare management for patients"}</p>
        </div>
        <div className="pd-topbar-actions">
          <span>{user?.name || user?.email}</span>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <section className="pd-layout">
        <aside className="pd-sidebar">
          <h3>Navigation</h3>
          <nav>
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="pd-content">
          <div className="pd-content-head">
            <h2>{title}</h2>
          </div>
          {children}
        </section>
      </section>
    </main>
  );
}
