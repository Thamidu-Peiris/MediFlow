import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";
import { normalizeReportsList } from "../utils/normalizePatientReports";

// Chart colors
const COLORS = {
  teal: "#0d9488",
  tealLight: "#5eead4",
  gray: "#9ca3af",
  rose: "#e11d48",
  indigo: "#6366f1",
  amber: "#f59e0b"
};

// Quick Actions Data
const quickActions = [
  { to: "/doctors", label: "Book Appointment", icon: "calendar", color: "teal" },
  { to: "/patient/reports", label: "Upload Report", icon: "upload", color: "indigo" },
  { to: "/patient/appointments", label: "View Appointments", icon: "clock", color: "amber" },
  { to: "/patient/prescriptions", label: "View Prescriptions", icon: "pill", color: "rose" },
  { to: "/patient/profile", label: "Edit Profile", icon: "user", color: "gray" },
  { to: "/patient/ai-checker", label: "AI Symptom Check", icon: "brain", color: "teal" },
];

const quickIcons = {
  calendar: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  upload: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  clock: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  pill: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
    </svg>
  ),
  user: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  brain: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/><path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/><path d="M12 16v4"/><path d="M8 21h8"/>
    </svg>
  ),
};

// Health Tips
const healthTips = [
  "Drink 8 glasses of water daily 💧",
  "Schedule regular checkups 📅",
  "Take breaks every 30 mins 🧘",
  "Get 7-8 hours of sleep 😴",
  "Walk 10,000 steps daily 🚶",
  "Eat more fruits & veggies 🥗",
];

// Calculate time until next appointment
function getTimeUntil(date) {
  const now = new Date();
  const diff = date - now;
  if (diff <= 0) return "Starting now";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `In ${days} day${days > 1 ? "s" : ""}`;
  }
  return `In ${hours}h ${minutes}m`;
}

export default function PatientDashboardPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [reports, setReports] = useState([]);
  const [healthTip, setHealthTip] = useState(healthTips[0]);

  useEffect(() => {
    const tipInterval = setInterval(() => {
      setHealthTip(healthTips[Math.floor(Math.random() * healthTips.length)]);
    }, 10000);
    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.get("/patients/me", authHeaders),
      api.get("/patients/appointments", authHeaders),
      api.get("/patients/prescriptions", authHeaders),
      api.get("/patients/reports", authHeaders),
      api.get("/doctors", authHeaders),
    ])
      .then(([meRes, appointmentsRes, prescriptionsRes, reportsRes, doctorsRes]) => {
        if (!mounted) return;

        setPatientInfo(meRes.status === "fulfilled" ? (meRes.value.data.patient || null) : null);
        setAppointments(appointmentsRes.status === "fulfilled" ? (appointmentsRes.value.data.appointments || []) : []);
        setPrescriptions(prescriptionsRes.status === "fulfilled" ? (prescriptionsRes.value.data.prescriptions || []) : []);
        setReports(
          reportsRes.status === "fulfilled"
            ? normalizeReportsList(reportsRes.value.data.reports || [])
            : []
        );
        setDoctors(doctorsRes.status === "fulfilled" ? (doctorsRes.value.data.doctors?.slice(0, 3) || []) : []);
      });

    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  const upcoming = appointments.filter((a) => a.status === "upcoming" || a.status === "scheduled");
  const completed = appointments.filter((a) => a.status === "completed" || a.status === "done");
  const nextAppointment = upcoming[0];
  const recentPrescriptions = [...prescriptions].reverse().slice(0, 3);

  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', options);

  // Chart Data — computed from real appointments (last 6 months)
  const appointmentData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const visits = appointments.filter((a) => {
        const ad = new Date(a.date || a.createdAt);
        return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth();
      }).length;
      return { month, visits };
    });
  }, [appointments]);

  // Prescription Status Data
  const activePrescriptions = prescriptions.filter(p => p.status === "active" || !p.endDate || new Date(p.endDate) > new Date()).length;
  const completedPrescriptions = prescriptions.filter(p => p.status === "completed" || (p.endDate && new Date(p.endDate) <= new Date())).length;
  const prescriptionData = [
    { name: "Active", value: activePrescriptions, color: COLORS.teal },
    { name: "Completed", value: completedPrescriptions, color: COLORS.gray },
  ];

  // Reports Upload Trend — computed from real reports (last 6 months)
  const reportsData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const month = d.toLocaleDateString("en-US", { month: "short" });
      const count = reports.filter((r) => {
        const rd = new Date(r.uploadedAt || r.createdAt);
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth();
      }).length;
      return { month, reports: count };
    });
  }, [reports]);

  // Summary stats
  const totalVisits = appointments.length;
  const totalReports = reports.length;
  const totalPrescriptions = prescriptions.length;
  const firstName = (patientInfo?.fullName || "").trim().split(/\s+/)[0] || "";

  return (
    <PatientShell>
      <div className="aura-dashboard">
        <header className="aura-header">
          <div>
            <h1 className="aura-title">
              {firstName ? `Good morning, ${firstName}` : "Good morning"}
            </h1>
            <p className="aura-subtitle">{formattedDate} • You have {upcoming.length} appointment{upcoming.length !== 1 ? 's' : ''} today.</p>
          </div>
        </header>

        <div className="aura-grid">
          {/* Summary Cards */}
          <section className="aura-col-12">
            <div className="aura-summary-cards">
              <div className="aura-summary-card">
                <div className="aura-summary-icon teal">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div className="aura-summary-info">
                  <p className="aura-summary-value">{totalVisits}</p>
                  <p className="aura-summary-label">Total Visits</p>
                </div>
              </div>
              <div className="aura-summary-card">
                <div className="aura-summary-icon indigo">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="aura-summary-info">
                  <p className="aura-summary-value">{totalReports}</p>
                  <p className="aura-summary-label">Reports</p>
                </div>
              </div>
              <div className="aura-summary-card">
                <div className="aura-summary-icon rose">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                  </svg>
                </div>
                <div className="aura-summary-info">
                  <p className="aura-summary-value">{totalPrescriptions}</p>
                  <p className="aura-summary-label">Prescriptions</p>
                </div>
              </div>
              <div className="aura-summary-card">
                <div className="aura-summary-icon amber">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                </div>
                <div className="aura-summary-info">
                  <p className="aura-summary-value">{upcoming.length}</p>
                  <p className="aura-summary-label">Upcoming</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Actions Grid */}
          <section className="aura-col-12">
            <h3 className="aura-section-title">Quick Actions</h3>
            <div className="aura-quick-actions-grid">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className={`aura-quick-action-card aura-${action.color}`}>
                  <span className="aura-quick-action-icon">{quickIcons[action.icon]}</span>
                  <span className="aura-quick-action-label">{action.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Next Appointment Card */}
          <section className="aura-col-8">
            <div className="aura-consultation-card">
              <div className="aura-consultation-glow"></div>
              <div className="aura-consultation-content">
                <div className="aura-consultation-info">
                  <span className="aura-badge" style={{ color: 'white' }}>Next Appointment</span>
                  {nextAppointment ? (
                    <>
                      <h2 className="aura-doctor-name" style={{ color: 'white' }}>{nextAppointment.doctorName}</h2>
                      <p className="aura-doctor-specialty" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {nextAppointment.specialty || nextAppointment.specialization || ''}{nextAppointment.time ? ` • ${nextAppointment.time}` : ''}
                      </p>
                      <p className="aura-countdown" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {getTimeUntil(new Date(nextAppointment.date))}
                      </p>
                    </>
                  ) : (
                    <h2 className="aura-doctor-name" style={{ color: 'white' }}>No upcoming appointments</h2>
                  )}
                  <div className="aura-consultation-actions">
                    <Link to={nextAppointment ? `/patient/appointments` : '/doctors'} className="aura-btn-primary">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                      {nextAppointment ? 'Join Video Call' : 'Book Appointment'}
                    </Link>
                  </div>
                </div>
                <div className="aura-doctor-image">
                  <img src={nextAppointment?.doctorImage || "/doctor-placeholder.svg"} alt="Doctor" />
                </div>
              </div>
            </div>
          </section>

          {/* Smart Widgets */}
          <section className="aura-col-4">
            {/* Health Tips Widget */}
            <div className="aura-widget">
              <div className="aura-widget-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <span>Health Tip</span>
              </div>
              <p className="aura-widget-text">{healthTip}</p>
            </div>

            {/* AI Suggestion Widget */}
            <div className="aura-widget ai">
              <div className="aura-widget-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/><path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/>
                </svg>
                <span>AI Suggestion</span>
              </div>
              <p className="aura-widget-text">Try our AI symptom checker to get instant health insights.</p>
              <Link to="/patient/ai-checker" className="aura-widget-link">Check Symptoms →</Link>
            </div>
          </section>

          {/* Charts Section */}
          <section className="aura-col-4">
            <div className="aura-chart-card">
              <h3 className="aura-chart-title">Appointment Activity</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={appointmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{fontSize: 12}} stroke="#9ca3af" />
                  <YAxis tick={{fontSize: 12}} stroke="#9ca3af" />
                  <Tooltip contentStyle={{borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Line type="monotone" dataKey="visits" stroke={COLORS.teal} strokeWidth={3} dot={{fill: COLORS.teal, strokeWidth: 2, r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="aura-col-4">
            <div className="aura-chart-card">
              <h3 className="aura-chart-title">Prescription Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={prescriptionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {prescriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="aura-col-4">
            <div className="aura-chart-card">
              <h3 className="aura-chart-title">Reports Upload Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={reportsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{fontSize: 12}} stroke="#9ca3af" />
                  <YAxis tick={{fontSize: 12}} stroke="#9ca3af" />
                  <Tooltip contentStyle={{borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="reports" fill={COLORS.indigo} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Recent Documents */}
          <section className="aura-col-7">
            <div className="aura-card">
              <div className="aura-card-header">
                <h3 className="aura-card-title">Recent Documents</h3>
                <Link to="/patient/reports" className="aura-view-all">View All</Link>
              </div>
              <div className="aura-documents-list">
                {recentPrescriptions.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                    No documents yet.
                  </div>
                ) : (
                  recentPrescriptions.map((item, idx) => (
                    <div key={item._id || idx} className="aura-document-item">
                      <div className="aura-doc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                        </svg>
                      </div>
                      <div className="aura-doc-info">
                        <p className="aura-doc-name">{item.notes || "Prescription"}</p>
                        <p className="aura-doc-meta">{new Date(item.createdAt).toLocaleDateString()} • {item.doctorName || "Doctor"}</p>
                      </div>
                      <button className="aura-doc-action">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Medical Team */}
          <section className="aura-col-5">
            <div className="aura-card">
              <h3 className="aura-card-title" style={{ marginBottom: '24px' }}>My Medical Team</h3>
              <div className="aura-doctors-grid">
                {doctors.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                    No doctors assigned yet.
                  </div>
                ) : (
                  doctors.map((doctor) => (
                    <div key={doctor._id} className="aura-doctor-item">
                      <div className="aura-doctor-avatar">
                        <img src={doctor.image || "/doctor-placeholder.svg"} alt={doctor.fullName} />
                        <span className={`aura-status ${doctor.status === 'online' ? 'online' : 'offline'}`}></span>
                      </div>
                      <div className="aura-doctor-info-sm">
                        <p className="aura-doctor-name-sm">{doctor.fullName}</p>
                        <p className="aura-doctor-spec">{doctor.specialization}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link to="/doctors" className="aura-directory-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Directory
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PatientShell>
  );
}
