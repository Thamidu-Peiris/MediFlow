import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import api from "../api/client";

const navItems = [
  { to: "/doctor/dashboard", label: "Dashboard", icon: "grid_view" },
  { to: "/doctor/availability", label: "Schedule", icon: "calendar_month" },
  { to: "/doctor/appointments", label: "Appointments", icon: "calendar_today" },
  { to: "/doctor/patients", label: "Patients", icon: "group" },
  { to: "/doctor/prescriptions", label: "Prescriptions", icon: "prescriptions" },
  { to: "/doctor/telemedicine", label: "Telemedicine", icon: "video_call" },
  { to: "/doctor/profile", label: "Settings", icon: "settings" },
];

export default function DoctorShell({ children }) {
  const { logout, authHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef(null);

  useEffect(() => {
    api.get("/doctors/me", authHeaders).then((res) => {
      setDoctorInfo(res.data.doctor || {});
    }).catch(() => {});

    const onDocClick = (e) => {
      if (!profileWrapRef.current) return;
      if (!profileWrapRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [authHeaders]);

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const portalName = doctorInfo?.clinicName || doctorInfo?.hospitalName || "MediFlow";
  
  return (
    <div className="aura-shell aura-shell--admin-dashboard">
      <aside className="aura-sidebar">
        <div className="aura-sidebar-header">
          <div className="aura-brand">
            <h1 className="aura-brand-title">MediFlow</h1>
            <p className="aura-brand-subtitle text-[#CBF79D]">CLINICAL PORTAL</p>
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

      <main className="aura-main">
        <header className="aura-topbar aura-topbar-admin">
          <div className="aura-topbar-left">
            <span className="aura-logo truncate max-w-[200px]">Dr. {doctorInfo?.fullName || "Doctor"}</span>
            {doctorInfo?.specialization && (
              <span className="ml-3 hidden sm:inline-block px-3 py-1 rounded-full bg-[#CBF79D]/20 text-[#CBF79D] text-[10px] font-bold uppercase tracking-widest border border-[#CBF79D]/10">
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

        <div className="aura-content aura-content--admin-dashboard bg-[#c0fc92]">
          {children}
        </div>
      </main>
    </div>
  );
}
