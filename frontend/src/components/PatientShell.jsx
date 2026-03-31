import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../api/client";

const navItems = [
  { to: "/patient/dashboard", label: "My Profile", icon: "user" },
  { to: "/patient/appointments", label: "My Appointments", icon: "calendar" },
  { to: "/patient/reports", label: "Medical Reports", icon: "file" },
  { to: "/patient/prescriptions", label: "Prescriptions", icon: "pill" },
];

const sidebarIcons = {
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  file: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  pill: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
    </svg>
  ),
};

export default function PatientShell({ children }) {
  const { user, logout, authHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({ visits: 0, reports: 0, prescriptions: 0 });
  const [patientInfo, setPatientInfo] = useState(null);

  useEffect(() => {
    api.get("/patients/me", authHeaders).then((res) => {
      const p = res.data.patient || {};
      setPatientInfo(p);
      setStats({
        visits: p.appointments?.length || 0,
        reports: p.reports?.length || 0,
        prescriptions: p.prescriptions?.length || 0,
      });
    }).catch(() => {});
  }, [authHeaders]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="patient-layout">
      {/* Sidebar */}
      <aside className="patient-sidebar">
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="#14b8a6" strokeWidth="2.5" fill="none"/>
              <rect x="18" y="10" width="4" height="20" rx="2" fill="#14b8a6"/>
              <rect x="10" y="18" width="20" height="4" rx="2" fill="#14b8a6"/>
            </svg>
            <span>MediFlow</span>
          </Link>
        </div>

        {/* Patient Profile Card */}
        <div className="patient-card">
          <div className="patient-avatar">
            <img 
              src={patientInfo?.avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"} 
              alt={patientInfo?.fullName || user?.name} 
            />
          </div>
          <div className="patient-info">
            <h4>{patientInfo?.fullName || user?.name || "Patient"}</h4>
            <span className="patient-role">Patient</span>
          </div>
          <div className="patient-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.visits}</span>
              <span className="stat-label">Visits</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.reports}</span>
              <span className="stat-label">Reports</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.prescriptions}</span>
              <span className="stat-label">Rx Active</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-section">
          <span className="section-label">Patient Portal</span>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link 
                  key={item.to} 
                  to={item.to} 
                  className={`nav-item ${isActive ? "active" : ""}`}
                >
                  <span className="nav-icon">{sidebarIcons[item.icon]}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={onLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="patient-main">
        {/* Top Header */}
        <header className="patient-header">
          <div className="header-left">
            <h1>My Profile</h1>
            <p>Manage your personal and health information</p>
          </div>
          <div className="header-right">
            <div className="header-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" placeholder="Search..." />
            </div>
            <button className="notification-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span className="badge">2</span>
            </button>
            <Link to="/doctors" className="book-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Book Appointment
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="patient-content">
          {children}
        </div>
      </main>
    </div>
  );
}
