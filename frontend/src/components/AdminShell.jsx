import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/admin/analytics", label: "Analytics", icon: "insights" },
  { to: "/admin/users", label: "Users", icon: "group" },
  { to: "/admin/doctors-verification", label: "Doctors", icon: "verified_user" },
  { to: "/admin/appointments", label: "Appointments", icon: "event" },
  { to: "/admin/payments", label: "Payments", icon: "payments" },
  { to: "/admin/notifications", label: "Notifications", icon: "notifications" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

const sidebarIcons = {
  dashboard: (
    <span className="material-symbols-outlined">grid_view</span>
  ),
  group: (
    <span className="material-symbols-outlined">group</span>
  ),
  verified_user: (
    <span className="material-symbols-outlined">medical_services</span>
  ),
  event: (
    <span className="material-symbols-outlined">event</span>
  ),
  payments: (
    <span className="material-symbols-outlined">payments</span>
  ),
  notifications: (
    <span className="material-symbols-outlined">notifications</span>
  ),
  insights: (
    <span className="material-symbols-outlined">analytics</span>
  ),
  settings: (
    <span className="material-symbols-outlined">settings</span>
  ),
};

export default function AdminShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const isAdminDashboard =
    location.pathname === "/admin/dashboard" ||
    location.pathname === "/admin/analytics" ||
    location.pathname === "/admin/users" ||
    location.pathname === "/admin/doctors-verification" ||
    location.pathname === "/admin/appointments" ||
    location.pathname === "/admin/payments" ||
    location.pathname === "/admin/notifications" ||
    location.pathname === "/admin/settings";

  return (
    <div className={`aura-shell${isAdminDashboard ? " aura-shell--admin-dashboard" : ""}`}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`aura-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="aura-sidebar-header">
          <div className="aura-brand">
            <h1 className="aura-brand-title">MediFlow</h1>
            <p className="aura-brand-subtitle">ENTERPRISE SUITE</p>
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
                onClick={() => setSidebarOpen(false)}
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
              navigate("/");
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
            <button
              className="aura-topbar-icon-btn lg:hidden mr-2"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined">
                {sidebarOpen ? "close" : "menu"}
              </span>
            </button>
            <span className="aura-logo">Admin Panel</span>
          </div>
          <div className="aura-topbar-right">
            <button className="aura-topbar-icon-btn">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link to="/admin/settings" className="aura-topbar-icon-btn">
              <span className="material-symbols-outlined">settings</span>
            </Link>
            <div className="aura-profile-wrap" ref={profileWrapRef}>
              <button
                type="button"
                className="aura-topbar-profile-btn"
                onClick={() => setProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
              >
                <span className="material-symbols-outlined">person</span>
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
                      navigate("/");
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

        <div className={`aura-content${isAdminDashboard ? " aura-content--admin-dashboard" : ""}`}>{children}</div>
      </main>
    </div>
  );
}

