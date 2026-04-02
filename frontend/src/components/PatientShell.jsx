import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuthMediaSrc } from "../hooks/useAuthMediaSrc";

const navItems = [
  { to: "/patient/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/patient/appointments", label: "Appointments", icon: "calendar" },
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

const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80";

export default function PatientShell({ children }) {
  const { user, logout, authHeaders, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [patientInfo, setPatientInfo] = useState(null);
  const resolvedAvatar = useAuthMediaSrc(patientInfo?.avatar || "", token);
  const avatarImgSrc = resolvedAvatar || DEFAULT_AVATAR;

  useEffect(() => {
    api.get("/patients/me", authHeaders).then((res) => {
      setPatientInfo(res.data.patient || {});
    }).catch(() => {});
  }, [authHeaders]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="aura-shell">
      {/* Sidebar */}
      <aside className="aura-sidebar">
        <div className="aura-sidebar-header">
          {/* User Profile Section */}
          <div className="aura-user-profile">
            <div className="aura-user-avatar">
              <img 
                src={avatarImgSrc} 
                alt={patientInfo?.fullName || user?.name} 
              />
            </div>
            <div className="aura-user-info">
              <p className="aura-welcome-text">Welcome back</p>
              <p className="aura-user-name">{patientInfo?.fullName || user?.name || "Sarah Jenkins"}</p>
            </div>
          </div>
          
          {/* Book Appointment Button */}
          <Link to="/doctors" className="aura-book-btn">
            Book Appointment
          </Link>
        </div>

        {/* Navigation */}
        <nav className="aura-sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
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

        {/* Logout */}
        <div className="aura-sidebar-footer">
          <button className="aura-logout-btn" onClick={onLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="aura-main">
        {/* Top Navigation Bar */}
        <header className="aura-topbar">
          <div className="aura-topbar-left">
            <span className="aura-logo">MediFlow</span>
          </div>
          <div className="aura-topbar-right">
            <button className="aura-icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <button className="aura-icon-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <div className="aura-user-menu">
              <img 
                src={avatarImgSrc} 
                alt="User" 
                className="aura-user-thumb"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="aura-content">
          {children}
        </div>
      </main>
    </div>
  );
}
