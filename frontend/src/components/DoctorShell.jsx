import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import api from "../api/client";

const navItems = [
  { to: "/doctor/dashboard", label: "Overview", icon: "dashboard" },
  { to: "/doctor/availability", label: "Calendar", icon: "calendar_month" },
  { to: "/doctor/appointments", label: "Appointments", icon: "calendar_today" },
  { to: "/doctor/patients", label: "Patients", icon: "group" },
  { to: "/doctor/prescriptions", label: "Messages", icon: "mail" },
  { to: "/doctor/telemedicine", label: "Billing", icon: "payments" },
  { to: "/doctor/profile", label: "Settings", icon: "settings" },
];

const topNavLinks = [
  { to: "/doctor/dashboard", label: "Dashboard" },
  { to: "/doctor/appointments", label: "Schedule" },
  { to: "/doctor/patients", label: "Patients" },
  { to: "/doctor/availability", label: "Reports" },
];

export default function DoctorShell({ children }) {
  const { logout, authHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [doctorInfo, setDoctorInfo] = useState(null);

  useEffect(() => {
    api.get("/doctors/me", authHeaders).then((res) => {
      setDoctorInfo(res.data.doctor || {});
    }).catch(() => {});
  }, [authHeaders]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const portalName = doctorInfo?.clinicName || doctorInfo?.hospitalName || "MediFlow";

  return (
    <div className="flex min-h-screen bg-slate-100 text-on-surface">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white py-6 shadow-[1px_0_0_rgba(0,0,0,0.04)]">
        <div className="px-6 mb-10">
          <h1 className="font-headline font-bold text-teal-800 text-xl tracking-tight">{portalName}</h1>
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">Clinical Portal</p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navItems.map((item) => {
            const active =
              item.to === "/doctor/dashboard"
                ? location.pathname === "/doctor/dashboard"
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                  active
                    ? "-mr-4 rounded-r-full bg-emerald-50 pr-8 font-bold text-teal-700"
                    : "rounded-lg text-slate-600 hover:bg-slate-50 group"
                }`}
              >
                <span
                  className={`material-symbols-outlined ${
                    active ? "text-primary" : "text-slate-400 group-hover:text-primary"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 mt-auto space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-error px-4 py-3 font-headline text-sm font-bold text-white shadow-md shadow-error/25"
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              emergency
            </span>
            Emergency Room
          </button>
          <div className="space-y-3 border-t border-slate-200 pt-6">
            <Link
              to="/doctor/profile"
              className="mb-1 flex items-center gap-3 rounded-lg px-4 py-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary"
            >
              <span className="material-symbols-outlined text-[20px]">info</span>
              <span className="text-sm font-medium">Help Center</span>
            </Link>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col bg-slate-100">
        <header className="fixed left-64 right-0 top-0 z-50 flex h-20 w-full items-center justify-between border-b border-slate-200/80 bg-white px-8 shadow-sm">
          <div className="flex items-center gap-8">
            <div className="font-headline text-2xl font-black tracking-tight text-teal-800">Clinical Editorial</div>
            <nav className="hidden gap-6 md:flex">
              {topNavLinks.map((link) => {
                const active =
                  link.to === "/doctor/appointments"
                    ? location.pathname.startsWith("/doctor/appointments")
                    : location.pathname === link.to || location.pathname.startsWith(link.to + "/");
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-sm transition-colors ${
                      active
                        ? "border-b-2 border-blue-600 pb-1 font-bold text-blue-600"
                        : "font-medium text-slate-500 hover:text-blue-600"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-blue-600 p-2 text-white shadow-sm transition-colors hover:bg-blue-700"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
              </button>
              <Link
                to="/doctor/profile"
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              >
                <span className="material-symbols-outlined text-[22px]">settings</span>
              </Link>
            </div>
            <div className="mx-2 h-8 w-px bg-slate-200" />
            <Link
              to="/doctor/availability"
              className="rounded-full bg-blue-600 px-6 py-2.5 font-headline text-sm font-bold text-white shadow-md shadow-blue-600/25 transition-transform duration-150 hover:bg-blue-700 active:scale-95"
            >
              New Appointment
            </Link>
            <img
              alt="Doctor Profile"
              className="h-10 w-10 rounded-full border-2 border-primary-fixed object-cover ring-4 ring-primary/5"
              src={
                doctorInfo?.image ||
                "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=150&q=80"
              }
            />
          </div>
        </header>

        <div className="flex-1 pt-20">{children}</div>
      </main>
    </div>
  );
}
