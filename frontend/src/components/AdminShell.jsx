import { useEffect, useMemo, useRef, useState } from "react";
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
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dashboard</span>
  ),
  group: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>group</span>
  ),
  verified_user: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>verified_user</span>
  ),
  event: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>event</span>
  ),
  payments: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>payments</span>
  ),
  description: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
  ),
  notifications: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
  ),
  insights: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>insights</span>
  ),
  settings: (
    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
  ),
};

export default function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef(null);

  const displayName = useMemo(() => {
    if (!user) return "Admin";
    return user.name || user.email || "Admin";
  }, [user]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!profileWrapRef.current) return;
      if (!profileWrapRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="aura-main">
        <header className="aura-topbar aura-topbar-admin">
          <div className="aura-topbar-left">
            <span className="aura-logo">MediFlow Admin</span>
          </div>
          <div className="aura-topbar-right">
            <div className="aura-profile-wrap" ref={profileWrapRef}>
              <button
                type="button"
                className="aura-profile-btn"
                onClick={() => setProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="material-symbols-outlined">account_circle</span>
                <span className="aura-profile-name">{displayName.split(" ")[0]}</span>
              </button>

              {profileOpen ? (
                <div className="aura-profile-menu" role="menu">
                  <Link
                    to="/admin/settings"
                    className="aura-profile-item"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <span className="material-symbols-outlined">settings</span>
                    Settings
                  </Link>

                  <button
                    type="button"
                    className="aura-profile-item aura-profile-logout"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      navigate("/login");
                    }}
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="aura-content">{children}</div>
      </main>
    </div>
  );
}

