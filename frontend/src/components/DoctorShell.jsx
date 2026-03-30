import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/doctor/dashboard", label: "Dashboard" },
    { to: "/doctor/profile", label: "My Profile" },
    { to: "/doctor/availability", label: "Availability" },
    { to: "/doctor/appointments", label: "Appointments" },
    { to: "/doctor/prescriptions", label: "Prescriptions" },
    { to: "/doctor/patients", label: "Patient Reports" },
    { to: "/doctor/telemedicine", label: "Video Consultation" }
];

export default function DoctorShell({ title, subtitle, children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const onLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <main className="pd-page">
            <header className="pd-topbar" style={{ background: "linear-gradient(135deg, #0f4c81 0%, #1a6bb5 100%)" }}>
                <div className="pd-brand">
                    <h1>MediFlow Doctor Portal</h1>
                    <p>{subtitle || "Manage your practice and patients"}</p>
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
