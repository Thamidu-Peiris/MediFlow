import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuthMediaSrc } from "../hooks/useAuthMediaSrc";

const navItems = [
  { to: "/patient/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/patient/appointments", label: "Appointments", icon: "calendar_month" },
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
  const { logout, authHeaders, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [patientInfo, setPatientInfo] = useState(null);
  const resolvedAvatar = useAuthMediaSrc(patientInfo?.avatar || "", token);
  const avatarImgSrc = resolvedAvatar || "";

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
    if (p === "/patient/doctors" || p.startsWith("/patient/doctors/")) return "Doctors";
    if (p === "/patient/reports" || p.startsWith("/patient/reports/")) return "Reports";
    if (p === "/ai-checker" || p.startsWith("/ai-checker/")) return "AI Checker";
    if (p === "/patient/prescriptions" || p.startsWith("/patient/prescriptions/")) return "Prescriptions";
    if (p === "/patient/profile" || p.startsWith("/patient/profile/")) return "Profile";
    return "Dashboard";
  })();
  return (
    <div className="flex min-h-screen bg-slate-100 text-on-surface">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white py-6 shadow-[1px_0_0_rgba(0,0,0,0.04)]">
        <div className="mb-8 px-6">
          <h1 className="font-headline text-xl font-bold tracking-tight text-teal-800">MediFlow</h1>
          <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant">Patient Portal</p>
        </div>

        <div className="mb-6 px-6">
          <Link
            to="/patient/doctors"
            className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Book Appointment
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const isActive =
              item.to === "/patient/dashboard"
                ? location.pathname === "/patient/dashboard"
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                  isActive
                    ? "-mr-4 rounded-r-full bg-emerald-50 pr-8 font-bold text-teal-700"
                    : "rounded-lg text-slate-600 hover:bg-slate-50 group"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    isActive ? "text-primary" : "text-slate-400 group-hover:text-primary"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-6">
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <Link
              to="/patient/profile"
              className="mb-1 flex items-center gap-3 rounded-lg px-4 py-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              <span className="material-symbols-outlined text-[20px]">info</span>
              <span className="text-sm font-medium">Help Center</span>
            </Link>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              onClick={onLogout}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col bg-slate-100">
        <header className="fixed left-64 right-0 top-0 z-50 flex min-h-[80px] items-center justify-between border-b border-slate-200/80 bg-white px-8 py-2 shadow-sm">
          <div className="font-headline text-2xl font-black tracking-tight text-teal-800">{activePageTitle}</div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center bg-transparent p-0 text-[#0B3B5B] shadow-none border-none transition-colors hover:bg-transparent hover:text-[#0B3B5B]"
              aria-label="Notifications"
            >
              <span className="material-symbols-rounded text-[22px]">notifications</span>
            </button>
            <Link
              to="/patient/profile"
              className="grid h-10 w-10 place-items-center bg-transparent p-0 text-[#0B3B5B] shadow-none border-none transition-colors hover:bg-transparent hover:text-[#0B3B5B]"
              aria-label="Profile settings"
            >
              <span className="material-symbols-rounded text-[22px]">settings</span>
            </Link>
            <Link
              to="/patient/profile"
              className="grid h-10 w-10 place-items-center rounded-full border border-slate-300 bg-slate-100 text-slate-700 transition-colors hover:border-primary hover:text-primary"
              aria-label="Profile"
              title="Profile"
            >
              <span className="material-symbols-rounded text-[22px]">person</span>
            </Link>
          </div>
        </header>

        <div className="flex-1 px-8 pt-24">
          {children}
        </div>
      </main>
    </div>
  );
}
