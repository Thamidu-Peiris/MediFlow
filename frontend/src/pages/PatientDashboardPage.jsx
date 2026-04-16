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

export default function PatientDashboardPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [reports, setReports] = useState([]);
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

  // Reports Category Data
  const reportsByCategory = useMemo(() => {
    const categories = {};
    reports.forEach(r => {
      const cat = r.category || "Other";
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [reports]);

  const CATEGORY_COLORS = [COLORS.teal, COLORS.indigo, COLORS.amber, COLORS.rose, COLORS.tealLight];

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

          <section className="aura-col-9">
            <div className="aura-report-left-grid">
              <div className="aura-chart-card">
                <h3 className="aura-chart-title">Reports Upload Trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={reportsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{fontSize: 10}} stroke="#9ca3af" />
                    <YAxis tick={{fontSize: 10}} stroke="#9ca3af" />
                    <Tooltip contentStyle={{borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="reports" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="aura-chart-card">
                <h3 className="aura-chart-title">Reports by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={reportsByCategory}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {reportsByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="aura-chart-card">
                <h3 className="aura-chart-title">Appointment Activity</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={appointmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{fontSize: 10}} stroke="#9ca3af" />
                    <YAxis tick={{fontSize: 10}} stroke="#9ca3af" />
                    <Tooltip contentStyle={{borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                    <Line type="monotone" dataKey="visits" stroke={COLORS.teal} strokeWidth={2} dot={{fill: COLORS.teal, strokeWidth: 1, r: 3}} activeDot={{r: 5}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Right Side Quick Actions */}
          <section className="aura-col-3 aura-col-right">
            <div className="aura-quick-side">
              <h3 className="aura-quick-side__title">Quick Actions</h3>
              <div className="aura-quick-side__list">
                {quickActions.map((action) => (
                  <Link key={action.to} to={action.to} className="aura-quick-side__item">
                    <span className={`aura-quick-side__icon aura-${action.color}`}>{quickIcons[action.icon]}</span>
                    <span className="aura-quick-side__label">{action.label}</span>
                    <span className="aura-quick-side__arrow" aria-hidden>›</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

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
