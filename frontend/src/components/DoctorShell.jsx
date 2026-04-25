import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import api from "../api/client";

const navItems = [
  { to: "/doctor/dashboard", label: "Dashboard", icon: "grid_view" },
  { to: "/doctor/availability", label: "Schedule", icon: "calendar_month" },
  { to: "/doctor/appointments", label: "Appointments", icon: "calendar_today" },
  { to: "/doctor/calendar", label: "Calendar", icon: "event" },
  { to: "/doctor/patients", label: "Patients", icon: "group" },
  { to: "/doctor/telemedicine", label: "Telemedicine", icon: "video_call" },
  { to: "/doctor/profile", label: "Settings", icon: "settings" },
];

export default function DoctorShell({ children }) {
  const { logout, authHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileWrapRef = useRef(null);
  const mobileSidebarRef = useRef(null);

  useEffect(() => {
    api.get("/doctors/me", authHeaders).then((res) => {
      setDoctorInfo(res.data.doctor || {});
    }).catch(() => {});

    const onDocClick = (e) => {
      // Profile menu outside click
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      // Mobile sidebar outside click
      // We check if the click target is NOT the sidebar and NOT the hamburger button
      const hamburgerBtn = document.querySelector('[data-mobile-menu-toggle]');
      if (
        mobileSidebarRef.current && 
        !mobileSidebarRef.current.contains(e.target) &&
        hamburgerBtn && !hamburgerBtn.contains(e.target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [authHeaders]);

  useEffect(() => {
    // Close mobile menu on route change
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const isDoctorDashboard =
    location.pathname === "/doctor/dashboard" || location.pathname === "/doctor/";

  const currentPageLabel =
    navItems.find(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(item.to + "/")
    )?.label || "Dashboard";

  return (
    <div className={`aura-shell${isDoctorDashboard ? " aura-shell--admin-dashboard" : ""} flex flex-col min-h-screen w-full relative overflow-x-hidden`}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside 
        ref={mobileSidebarRef}
        className={`aura-sidebar ${mobileMenuOpen ? "open" : ""}`}
      >
        <div className="aura-sidebar-header">
          <div className="aura-brand">
            <h1 className="aura-brand-title">MediFlow</h1>
            <p className="aura-brand-subtitle">CLINICAL PORTAL</p>
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
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="aura-nav-icon">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </span>
                <span className="aura-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="aura-sidebar-footer">
          <button
            className="aura-logout-btn"
            onClick={onLogout}
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="aura-main flex-1 flex flex-col min-w-0">
        <header className="aura-topbar aura-topbar-admin">
          {/* Left: hamburger (mobile) + current page title */}
          <div className="aura-topbar-left flex items-center gap-3 flex-1 min-w-0">
            <button
              data-mobile-menu-toggle
              className="lg:hidden p-2 text-[#043927] hover:bg-[#CBF79D]/20 rounded-xl transition-all shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(true);
              }}
            >
              <span className="material-symbols-outlined text-[28px]">menu</span>
            </button>
            <span className="text-[#0d7a5f] font-bold text-xl tracking-tight whitespace-nowrap">
              {currentPageLabel}
            </span>
          </div>

          {/* Right: icons → doctor info → avatar */}
          <div className="aura-topbar-right items-center">
            {/* Notification bell */}
            <button className="aura-topbar-icon-btn" title="Notifications">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>

            {/* Settings gear */}
            <Link to="/doctor/profile" className="aura-topbar-icon-btn" title="Settings">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </Link>

            {/* Help */}
            <button className="aura-topbar-icon-btn" title="Help">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>

            {/* Divider */}
            <div className="w-px h-7 bg-gray-200 mx-2 shrink-0" />

            {/* Doctor name + specialization */}
            <div className="hidden sm:flex flex-col items-end leading-tight mr-3">
              <span className="text-[#111827] font-semibold text-sm whitespace-nowrap">
                Dr. {doctorInfo?.fullName || "Doctor"}
              </span>
              {doctorInfo?.specialization && (
                <span className="text-[#0d7a5f] text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
                  {doctorInfo.specialization}
                </span>
              )}
            </div>

            {/* Avatar with dropdown */}
            <div className="aura-profile-wrap" ref={profileWrapRef}>
              <button
                type="button"
                className="aura-topbar-profile-btn"
                onClick={() => setProfileOpen((v) => !v)}
              >
                <img
                  alt="Doctor Profile"
                  className="w-full h-full object-cover rounded-full"
                  src={doctorInfo?.image || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=150&q=80"}
                />
              </button>

              {profileOpen && (
                <div className="aura-profile-menu" role="menu">
                  <Link
                    to="/doctor/profile"
                    className="aura-profile-item"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <span className="material-symbols-outlined">account_circle</span>
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="aura-profile-item aura-profile-logout"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
                    }}
                  >
                    <span className="material-symbols-outlined">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={`aura-content${isDoctorDashboard ? " aura-content--admin-dashboard" : ""} flex-1 w-full`}>
          {children}
        </div>
      </main>
    </div>
  );
}
