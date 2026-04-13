import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState, useRef } from "react";
import api from "../api/client";
import { useAuthMediaSrc } from "../hooks/useAuthMediaSrc";

const navItems = [
  { to: "/patient/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/patient/appointments", label: "Appointments", icon: "calendar_month" },
  { to: "/patient/telemedicine", label: "Video Consultations", icon: "videocam" },
  { to: "/patient/doctors", label: "Doctors", icon: "medical_services" },
  { to: "/patient/reports", label: "Reports", icon: "description" },
  { to: "/ai-checker", label: "AI Checker", icon: "psychology" },
  { to: "/patient/prescriptions", label: "Prescriptions", icon: "medication" },
  { to: "/patient/profile", label: "Profile", icon: "person" },
];

const sidebarIcons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  medical_services: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  description: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  psychology: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/><path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/><path d="M12 16v4"/><path d="M8 21h8"/>
    </svg>
  ),
  medication: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
    </svg>
  ),
  person: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
};

const pageTitles = {
  "/patient/dashboard": { title: "Dashboard", subtitle: "Overview of your health account" },
  "/patient/doctors": { title: "Find Doctors", subtitle: "Browse and book appointments with specialists" },
  "/patient/profile": { title: "My Profile", subtitle: "Manage your personal and health information" },
  "/patient/appointments": { title: "My Appointments", subtitle: "View and manage your appointments" },
  "/patient/reports": { title: "Medical Reports", subtitle: "Upload, view and manage your medical documents" },
  "/patient/prescriptions": { title: "Prescriptions", subtitle: "View your prescriptions and medications" },
  "/patient/history": { title: "Medical History", subtitle: "View your medical history and diagnoses" },
  "/ai-checker": { title: "AI Symptom Checker", subtitle: "AI-powered symptom analysis and health insights" },
};

export default function PatientShell({ children }) {
  const { user, logout, authHeaders, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [patientInfo, setPatientInfo] = useState(null);
  const resolvedAvatar = useAuthMediaSrc(patientInfo?.avatar || "", token);
  const avatarImgSrc = resolvedAvatar || "";

  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef(null);

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

  useEffect(() => {
    api
      .get("/patients/me", authHeaders)
      .then((res) => {
        setPatientInfo(res.data.patient || null);
      })
      .catch(() => {
        setPatientInfo(null);
      });
  }, [authHeaders]);

  const onLogout = () => {
    logout();
    navigate("/");
  };

  const activePageTitle = (() => {
    const p = location.pathname;
    if (p === "/patient/dashboard" || p.startsWith("/patient/dashboard/")) return "Dashboard";
    if (p === "/patient/appointments" || p.startsWith("/patient/appointments/")) return "Appointments";
    if (p === "/patient/telemedicine" || p.startsWith("/patient/telemedicine/")) return "Video Consultations";
    if (p === "/patient/doctors" || p.startsWith("/patient/doctors/")) return "Doctors";
    if (p === "/patient/reports" || p.startsWith("/patient/reports/")) return "Reports";
    if (p === "/ai-checker" || p.startsWith("/ai-checker/")) return "AI Checker";
    if (p === "/patient/prescriptions" || p.startsWith("/patient/prescriptions/")) return "Prescriptions";
    if (p === "/patient/profile" || p.startsWith("/patient/profile/")) return "Profile";
    return "Dashboard";
  })();

  const isPatientDashboard = location.pathname.startsWith("/patient/") || location.pathname === "/ai-checker";

  return (
    <div className={`aura-shell${isPatientDashboard ? " aura-shell--admin-dashboard" : ""}`}>
      <aside className="aura-sidebar">
        <div className="aura-sidebar-header">
          <div className="aura-brand">
            <h1 className="aura-brand-title">MediFlow</h1>
            <p className="aura-brand-subtitle">PATIENT PORTAL</p>
          </div>
        </div>

        <div className="mb-6 px-2">
          <Link
            to="/patient/doctors"
            className="aura-book-btn"
          >
            <span className="material-symbols-outlined">calendar_month</span>
            <span>Book Appointment</span>
          </Link>
        </div>

        <nav className="aura-sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.to === "/patient/dashboard"
                ? location.pathname === "/patient/dashboard"
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
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
            type="button"
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
            <span className="aura-logo" style={{ fontSize: "24px", fontWeight: 400 }}>
              {activePageTitle}
            </span>
          </div>
          <div className="aura-topbar-right">
            <button className="aura-topbar-icon-btn">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link to="/patient/profile" className="aura-topbar-icon-btn">
              <span className="material-symbols-outlined">settings</span>
            </Link>
            <div className="aura-profile-wrap" ref={profileWrapRef}>
              <button
                type="button"
                className="aura-topbar-profile-btn"
                onClick={() => setProfileOpen((v) => !v)}
              >
                {avatarImgSrc ? (
                  <img
                    src={avatarImgSrc}
                    alt="Profile"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined">person</span>
                )}
              </button>

              {profileOpen ? (
                <div className="aura-profile-menu">
                  <Link
                    to="/patient/profile"
                    className="aura-profile-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <span className="material-symbols-outlined">person</span>
                    Profile
                  </Link>
                  <button
                    type="button"
                    className="aura-profile-item aura-profile-logout"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout();
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

        <div className={`aura-content${isPatientDashboard ? " aura-content--admin-dashboard" : ""}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
