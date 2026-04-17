import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import api from "../api/client";

const navItems = [
  { to: "/doctor/dashboard", label: "Dashboard", icon: "grid_view" },
  { to: "/doctor/availability", label: "Schedule", icon: "calendar_month" },
  { to: "/doctor/appointments", label: "Appointments", icon: "calendar_today" },
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

  const portalName = doctorInfo?.clinicName || doctorInfo?.hospitalName || "MediFlow";
  
  const isDoctorDashboard =
    location.pathname === "/doctor/dashboard" || location.pathname === "/doctor/";

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
        <header className="aura-topbar aura-topbar-admin bg-white border-b border-[#356600]/10 px-4 lg:px-8 h-16 lg:h-20 flex items-center justify-between w-full shadow-sm">
          <div className="aura-topbar-left flex items-center gap-3 flex-1 min-w-0">
            {/* Hamburger Button */}
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
            <span className="aura-logo font-headline font-black text-xl text-[#043927] whitespace-nowrap">
              Dr. {doctorInfo?.fullName?.split(" ")[doctorInfo?.fullName?.split(" ").length - 1] || "Doctor"}
            </span>
            {doctorInfo?.specialization && (
              <span className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-full bg-[#CBF79D] text-[#043927] text-[10px] font-black uppercase tracking-[0.15em] border border-[#043927]/10 whitespace-nowrap shadow-sm">
                {doctorInfo.specialization}
              </span>
            )}
          </div>
          
          <div className="aura-topbar-right">
            <button className="aura-topbar-icon-btn">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link to="/doctor/profile" className="aura-topbar-icon-btn">
              <span className="material-symbols-outlined">settings</span>
            </Link>
            
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
