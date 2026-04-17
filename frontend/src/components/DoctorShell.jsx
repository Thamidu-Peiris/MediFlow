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
  
  return (
    <div className="aura-shell aura-shell--admin-dashboard flex flex-col md:flex-row min-h-screen w-full relative overflow-x-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-[#043927]/60 backdrop-blur-sm z-[60] md:hidden transition-all duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop & Mobile */}
      <aside 
        ref={mobileSidebarRef}
        className={`aura-sidebar fixed inset-y-0 left-0 z-[70] w-[280px] bg-[#043927] transition-transform duration-300 transform md:relative md:translate-x-0 !flex ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } pointer-events-auto`}
      >
        <div className="aura-sidebar-header flex items-center justify-between">
          <div className="aura-brand">
            <h1 className="aura-brand-title">MediFlow</h1>
            <p className="aura-brand-subtitle text-[#CBF79D]">CLINICAL PORTAL</p>
          </div>
          {/* Mobile Close Button */}
          <button 
            className="md:hidden text-white/60 hover:text-white p-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        <nav className="aura-sidebar-nav mt-8">
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

        <div className="aura-sidebar-footer p-6 mt-auto">
          <button
            className="aura-logout-btn w-full flex items-center gap-3 px-6 py-3.5 text-white/70 hover:text-white hover:bg-red-500/10 rounded-2xl transition-all font-bold text-sm"
            onClick={onLogout}
          >
            <span className="material-symbols-outlined">logout</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="aura-main flex-1 flex flex-col min-w-0 w-full max-w-none bg-[#c0fc92] ml-0 md:ml-[260px] !w-full md:!w-[calc(100vw-260px)]">
        <header className="aura-topbar aura-topbar-admin sticky top-0 z-50 bg-white border-b border-[#356600]/10 px-4 md:px-8 h-20 flex items-center justify-between w-full max-w-none mx-0 rounded-none shadow-sm">
          <div className="aura-topbar-left flex items-center gap-4 flex-1">
            {/* Hamburger Button */}
            <button 
              data-mobile-menu-toggle
              className="md:hidden p-2 text-[#043927] hover:bg-[#CBF79D]/20 rounded-xl transition-all"
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

        <div className="aura-content aura-content--admin-dashboard flex-1 w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
