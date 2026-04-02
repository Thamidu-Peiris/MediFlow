import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/users", label: "Users", icon: "group" },
  { to: "/admin/doctors-verification", label: "Doctors Verification", icon: "verified_user" },
  { to: "/admin/appointments", label: "Appointments", icon: "event" },
  { to: "/admin/payments", label: "Payments", icon: "payments" },
  { to: "/admin/reports", label: "Reports", icon: "description" },
  { to: "/admin/notifications", label: "Notifications", icon: "notifications" },
  { to: "/admin/analytics", label: "Analytics", icon: "insights" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

const sidebarIcons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  group: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  verified_user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4" />
      <path d="M2 12h4" />
      <path d="M20 16l-2 2-6-6-6 6-2-2 8-8z" />
      <path d="M12 22l4-4" />
    </svg>
  ),
  event: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  payments: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="14" rx="2" ry="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M6 16h6" />
    </svg>
  ),
  description: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  insights: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="3" y1="17" x2="21" y2="17" />
      <path d="M3 17l2-6 4 3 3-9 4 6 3-3" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1z" />
    </svg>
  ),
};

export default function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = useMemo(() => {
    if (!user) return "Admin";
    return user.name || user.email || "Admin";
  }, [user]);

  return (
    <div className="aura-shell">
      <aside className="aura-sidebar">
        <div className="aura-sidebar-header">
          <div className="aura-user-profile">
            <div className="aura-user-avatar">
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
                  color: "#0d9488",
                  fontWeight: 900,
                }}
              >
                {String(displayName).trim().slice(0, 1).toUpperCase()}
              </div>
            </div>
            <div className="aura-user-info">
              <p className="aura-welcome-text">Welcome back</p>
              <p className="aura-user-name">{displayName}</p>
            </div>
          </div>

          <Link to="/admin/dashboard" className="aura-book-btn">
            Admin Dashboard
          </Link>
        </div>

        <nav className="aura-sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + "/");

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`aura-nav-item ${isActive ? "active" : ""}`}
              >
                <span className="aura-nav-icon">{sidebarIcons[item.icon]}</span>
                <span className="aura-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="aura-sidebar-footer">
          <button
            className="aura-logout-btn"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="aura-main">
        <header className="aura-topbar">
          <div className="aura-topbar-left">
            <span className="aura-logo">MediFlow Admin</span>
          </div>
          <div className="aura-topbar-right">
            <span className="aura-user-name" style={{ fontSize: 13 }}>{displayName}</span>
          </div>
        </header>

        <div className="aura-content">{children}</div>
      </main>
    </div>
  );
}

