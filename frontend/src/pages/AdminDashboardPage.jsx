import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function sameISODate(aDate, bDateISO) {
  if (!aDate) return false;
  const s = String(aDate).slice(0, 10);
  return s === bDateISO;
}

function formatLkr(v) {
  const n = Number(v || 0);
  try {
    return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(n);
  } catch {
    return `LKR ${n.toFixed(2)}`;
  }
}

export default function AdminDashboardPage() {
  const { authHeaders } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [doctorDetailsByUserId, setDoctorDetailsByUserId] = useState({});
  const [message, setMessage] = useState("");

  const [activity, setActivity] = useState([]);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const pendingDoctors = useMemo(() => {
    return (users || []).filter((u) => u.role === "doctor" && !u.isDoctorVerified);
  }, [users]);

  const appointmentsCount = useMemo(() => appointments?.length ?? 0, [appointments]);

  const todaysAppointments = useMemo(() => {
    return (appointments || [])
      .filter((a) => sameISODate(a.date, todayISO))
      .slice(0, 10);
  }, [appointments, todayISO]);

  const topCards = useMemo(() => {
    const totalUsers = metrics?.totalUsers ?? 0;
    const totalDoctors = metrics?.totalDoctors ?? 0;
    const totalAppointments = appointmentsCount;
    const revenue = metrics?.grossRevenueLkr ?? 0;
    const pendingApprovals = metrics?.pendingDoctorVerifications ?? 0;
    return [
      { label: "Total Users", value: totalUsers, icon: "groups", tone: "teal" },
      { label: "Total Doctors", value: totalDoctors, icon: "verified_user", tone: "indigo" },
      { label: "Total Appointments", value: totalAppointments, icon: "event", tone: "teal" },
      { label: "Total Revenue", value: formatLkr(revenue), icon: "payments", tone: "indigo" },
      { label: "Pending Doctor Approvals", value: pendingApprovals, icon: "schedule", tone: "amber" },
    ];
  }, [metrics, appointmentsCount]);

  const loadDoctorDetails = async (pending) => {
    try {
      // Admin can list all doctors (verified + pending) with JWT.
      const res = await api.get("/doctors/all", authHeaders);
      const doctors = res.data.doctors || [];
      const byUserId = {};
      doctors.forEach((d) => {
        byUserId[d.userId] = d;
      });
      const next = {};
      pending.forEach((p) => {
        next[p._id] = byUserId[p._id] || null;
      });
      setDoctorDetailsByUserId(next);
    } catch {
      // Specialty is optional; don't break dashboard.
      setDoctorDetailsByUserId({});
    }
  };

  function activityTimeAgo(dateStr) {
    if (!dateStr) return 'recently';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return 'just now';
    const mins = Math.floor(diff / 60);
    if (diff < 3600) return mins + ' min' + (mins > 1 ? 's' : '') + ' ago';
    const hrs = Math.floor(diff / 3600);
    if (diff < 86400) return hrs + ' hour' + (hrs > 1 ? 's' : '') + ' ago';
    const days = Math.floor(diff / 86400);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
  }

  const buildActivity = (allUsers, allAppointments) => {
    const events = [];

    const recentUsers = [...(allUsers || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);
    recentUsers.forEach((u) => {
      const isDoc = u.role === 'doctor';
      const icon = isDoc ? (u.isDoctorVerified ? 'verified' : 'schedule') : 'person_add';
      let title;
      if (isDoc) {
        title = u.isDoctorVerified
          ? 'Doctor ' + u.name + ' approved'
          : 'Doctor ' + u.name + ' pending review';
      } else {
        title = 'Patient ' + u.name + ' registered';
      }
      events.push({ icon, title, when: activityTimeAgo(u.createdAt), _ts: new Date(u.createdAt).getTime() });
    });

    const recentApts = [...(allAppointments || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
    recentApts.forEach((a) => {
      const done = a.status === 'completed';
      const icon = done ? 'task_alt' : 'event';
      const patName = a.patientName || 'Patient';
      const title = done
        ? 'Appointment completed - ' + patName
        : 'Appointment booked - ' + patName;
      events.push({ icon, title, when: activityTimeAgo(a.createdAt), _ts: new Date(a.createdAt).getTime() });
    });

    return events
      .sort((a, b) => (b._ts || 0) - (a._ts || 0))
      .slice(0, 7)
      .map(({ _ts, ...rest }) => rest);
  };

  const loadData = async () => {
    setMessage("");
    try {
      const settled = await Promise.allSettled([
        api.get("/auth/admin/overview", authHeaders),
        api.get("/auth/admin/users", authHeaders),
        api.get("/appointments/my", authHeaders),
      ]);

      const overviewSettled = settled[0];
      const usersSettled = settled[1];
      const apptSettled = settled[2];

      const nextMetrics = overviewSettled.status === "fulfilled" ? overviewSettled.value.data.metrics || {} : null;
      const nextUsers = usersSettled.status === "fulfilled" ? usersSettled.value.data.users || [] : null;
      const nextAppointments = apptSettled.status === "fulfilled" ? apptSettled.value.data.appointments || [] : [];

      // Critical: overview + users
      if (!nextMetrics || !nextUsers) {
        const errMsg = !nextMetrics
          ? overviewSettled.reason?.response?.data?.message || overviewSettled.reason?.message || "Overview failed"
          : usersSettled.reason?.response?.data?.message || usersSettled.reason?.message || "Users failed";
        setMessage(errMsg);
        return;
      }

      setMetrics(nextMetrics);
      setUsers(nextUsers);
      setAppointments(nextAppointments);

      const pendingDoctors = (nextUsers || []).filter((u) => u.role === "doctor" && !u.isDoctorVerified);
      setActivity(buildActivity(nextUsers, nextAppointments));

      await loadDoctorDetails(pendingDoctors);
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.message || "Failed to load admin dashboard");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadData();
    };
    run();

    const id = setInterval(() => {
      run();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  const approveRejectDoctor = async (id, verified) => {
    try {
      await api.patch(`/auth/admin/doctors/${id}/verify`, { verified }, authHeaders);
      setActivity((prev) => [
        { icon: verified ? "verified_user" : "cancel", title: verified ? "Doctor approved" : "Doctor rejected", when: "just now" },
        ...prev,
      ].slice(0, 7));
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update doctor verification");
    }
  };

  const charts = useMemo(() => {
    const totalPatients = metrics?.totalPatients ?? 0;
    const totalDoctors = metrics?.totalDoctors ?? 0;
    const revenue = metrics?.grossRevenueLkr ?? 0;
    const appointmentBase = Math.max(1, Math.round(appointmentsCount / 2));

    const appointmentTrends = [
      { day: "Mon", bookings: Math.max(0, appointmentBase - 2) },
      { day: "Tue", bookings: appointmentBase + 1 },
      { day: "Wed", bookings: appointmentBase + 3 },
      { day: "Thu", bookings: Math.max(0, appointmentBase - 1) },
      { day: "Fri", bookings: appointmentBase + 2 },
      { day: "Sat", bookings: Math.max(0, Math.round(appointmentBase * 0.6)) },
      { day: "Sun", bookings: Math.max(0, Math.round(appointmentBase * 0.3)) },
    ];

    const revenueAnalytics = [
      { month: "Jan", income: Math.round(revenue * 0.12) },
      { month: "Feb", income: Math.round(revenue * 0.18) },
      { month: "Mar", income: Math.round(revenue * 0.2) },
      { month: "Apr", income: Math.round(revenue * 0.25) },
      { month: "May", income: Math.round(revenue * 0.15) },
      { month: "Jun", income: Math.round(revenue * 0.1) },
    ];

    const userGrowth = [
      { week: "Wk 1", newUsers: Math.round(totalPatients * 0.12) },
      { week: "Wk 2", newUsers: Math.round(totalPatients * 0.18) },
      { week: "Wk 3", newUsers: Math.round(totalPatients * 0.26) },
      { week: "Wk 4", newUsers: Math.round(totalPatients * 0.31) },
      { week: "Wk 5", newUsers: Math.round(totalPatients * 0.4) },
      { week: "Wk 6", newUsers: Math.round(totalPatients * 0.48) },
    ];

    const roleDist = [
      { name: "Patients", value: totalPatients, fill: "#0d9488" },
      { name: "Doctors", value: totalDoctors, fill: "#6366f1" },
    ];

    return { appointmentTrends, revenueAnalytics, userGrowth, roleDist };
  }, [metrics, appointmentsCount]);

  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return { users: [], doctors: [], appointments: [] };

    const u = (users || []).filter((x) => {
      const name = String(x.name || "").toLowerCase();
      const email = String(x.email || "").toLowerCase();
      const role = String(x.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });

    // Appointments are not system-wide searchable yet; we can only filter what admin sees.
    const appts = (appointments || []).filter((a) => {
      const patientName = String(a.patientName || "").toLowerCase();
      const doctorName = String(a.doctorName || "").toLowerCase();
      return patientName.includes(q) || doctorName.includes(q);
    });

    return {
      users: u.slice(0, 7),
      doctors: u.filter((x) => x.role === "doctor").slice(0, 5),
      appointments: appts.slice(0, 5),
    };
  }, [globalSearchQuery, users, appointments]);

  const todayISOHuman = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    } catch {
      return "Today";
    }
  }, []);

  return (
    <section className="pd-layout-admin ad-dashboard">
      {message ? <p className="page muted">{message}</p> : null}

      <header className="ad-dash-page-head">
        <div className="ad-dash-page-head-main">
          <h1 className="ad-dash-page-title">Dashboard</h1>
          <p className="ad-dash-page-lead">Overview of users, revenue, and operational health.</p>
        </div>
        <div className="ad-dash-page-meta">
          <span className="ad-dash-meta-label">Today</span>
          <span className="ad-dash-meta-value">{todayISOHuman}</span>
        </div>
      </header>

      {/* GLOBAL SEARCH BAR (TOP, PREMIUM) */}
      <div className="ad-section ad-section--tight">
        <div className="ad-global-search ad-global-search--premium">
          <input
            className="ad-global-search-input"
            placeholder="Search users, doctors, appointments..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
          />

          <div className="ad-global-search-results">
            {!globalSearchQuery.trim() ? (
              <div style={{ color: "#94a3b8", fontWeight: 700 }}>Type to search.</div>
            ) : (
              <>
                <div className="ad-search-group">
                  <div className="ad-search-group-title">Users</div>
                  {globalSearchResults.users.length ? (
                    globalSearchResults.users.map((u) => (
                      <div key={u._id} className="ad-search-item">
                        <div className="ad-search-item-title">{u.name}</div>
                        <div className="ad-search-item-sub">{u.email}</div>
                        <div className="ad-search-item-role">{u.role}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#94a3b8", fontWeight: 700 }}>No user matches.</div>
                  )}
                </div>

                <div className="ad-search-group">
                  <div className="ad-search-group-title">Appointments</div>
                  {globalSearchResults.appointments.length ? (
                    globalSearchResults.appointments.map((a) => (
                      <div key={a._id} className="ad-search-item">
                        <div className="ad-search-item-title">
                          {a.patientName} → {a.doctorName}
                        </div>
                        <div className="ad-search-item-sub">
                          {String(a.date || "").slice(0, 10)} • {a.time || "-"}
                        </div>
                        <div className="ad-search-item-role">{a.status}</div>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#94a3b8", fontWeight: 700 }}>No appointment matches.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TOP SUMMARY CARDS */}
      <div className="ad-dash-summary">
        {topCards.map((c) => (
          <article key={c.label} className="ad-dash-stat">
            <div className={`ad-dash-stat-icon ad-${c.tone}`}>
              <span className="material-symbols-outlined"> {c.icon} </span>
            </div>
            <div className="ad-dash-stat-body">
              <div className="ad-dash-stat-label">{c.label}</div>
              <div className="ad-dash-stat-value">{c.value}</div>
            </div>
          </article>
        ))}
      </div>

      <div className="ad-hero-split ad-hero-split--premium ad-hero-premium-layout">
        {/* Row 1 col 1 only — Quick Actions sits in row 2 so it lines up with chart cards */}
        <div className="ad-section ad-hero-analytics-head">
          <div className="ad-section-head ad-section-head--premium">
            <div>
              <h2>Analytics</h2>
              <p className="ad-section-head-note">Key metrics at a glance</p>
            </div>
          </div>
        </div>

        <div className="ad-hero-body-charts">
          <div className="ad-analytics-wrap">
            <div className="ad-charts-grid">
            <article className="pd-card ad-chart-card ad-chart-card--premium">
              <h3 className="ad-chart-title">
                <span className="ad-chart-title-icon material-symbols-outlined">event</span>
                Appointment Trends
              </h3>
              <div className="ad-chart-plot">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.appointmentTrends} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: 6 }} />
                    <Line
                      type="monotone"
                      dataKey="bookings"
                      name="Bookings"
                      stroke="#0d9488"
                      strokeWidth={3}
                      dot={{ stroke: "#0d9488", strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="pd-card ad-chart-card ad-chart-card--premium">
              <h3 className="ad-chart-title">
                <span className="ad-chart-title-icon material-symbols-outlined">payments</span>
                Revenue Analytics
              </h3>
              <div className="ad-chart-plot">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.revenueAnalytics} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: 6 }} />
                    <Bar dataKey="income" name="Income (LKR)" fill="#0d9488" radius={[10, 10, 2, 2]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="pd-card ad-chart-card ad-chart-card--premium">
              <h3 className="ad-chart-title">
                <span className="ad-chart-title-icon material-symbols-outlined">people</span>
                User Growth
              </h3>
              <div className="ad-chart-plot">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.userGrowth} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend wrapperStyle={{ paddingTop: 6 }} />
                    <Line type="monotone" dataKey="newUsers" name="New users" stroke="#6366f1" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="pd-card ad-chart-card ad-chart-card--premium">
              <h3 className="ad-chart-title">
                <span className="ad-chart-title-icon material-symbols-outlined">admin_panel_settings</span>
                Role Distribution
              </h3>
              <div className="ad-chart-plot ad-chart-plot--pie">
                <div className="ad-chart-pie-frame">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={32} wrapperStyle={{ paddingTop: 2 }} />
                      <Pie
                        data={charts.roleDist}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={68}
                        innerRadius={40}
                        stroke="none"
                      >
                        {charts.roleDist.map((r) => (
                          <Cell key={r.name} fill={r.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </article>
          </div>
          </div>
        </div>

        {/* Row 2 col 2 — top aligns with Appointment Trends / first chart row */}
        <aside className="ad-quick-panel" aria-label="Quick actions">
          <div className="ad-quick-panel-inner">
            <div className="ad-quick-panel-head">
              <h2>Quick Actions</h2>
              <p>Shortcuts to common admin tasks</p>
            </div>
            <nav className="ad-quick-actions-list ad-quick-actions-list--panel">
              <Link to="/admin/doctors-verification" className="ad-quick-action ad-quick-action--panel">
                <span className="ad-quick-action-icon-wrap">
                  <span className="material-symbols-outlined ad-quick-icon">verified_user</span>
                </span>
                <span className="ad-quick-copy">
                  <span className="ad-quick-title">Approve Doctors</span>
                  <span className="ad-quick-desc">Review pending registrations</span>
                </span>
                <span className="material-symbols-outlined ad-quick-chevron">chevron_right</span>
              </Link>
              <Link to="/admin/users" className="ad-quick-action ad-quick-action--panel">
                <span className="ad-quick-action-icon-wrap">
                  <span className="material-symbols-outlined ad-quick-icon">groups</span>
                </span>
                <span className="ad-quick-copy">
                  <span className="ad-quick-title">Manage Users</span>
                  <span className="ad-quick-desc">Patients & staff accounts</span>
                </span>
                <span className="material-symbols-outlined ad-quick-chevron">chevron_right</span>
              </Link>
              <Link to="/admin/appointments" className="ad-quick-action ad-quick-action--panel">
                <span className="ad-quick-action-icon-wrap">
                  <span className="material-symbols-outlined ad-quick-icon">event</span>
                </span>
                <span className="ad-quick-copy">
                  <span className="ad-quick-title">Appointments</span>
                  <span className="ad-quick-desc">Schedule & status</span>
                </span>
                <span className="material-symbols-outlined ad-quick-chevron">chevron_right</span>
              </Link>
              <Link to="/admin/payments" className="ad-quick-action ad-quick-action--panel">
                <span className="ad-quick-action-icon-wrap">
                  <span className="material-symbols-outlined ad-quick-icon">payments</span>
                </span>
                <span className="ad-quick-copy">
                  <span className="ad-quick-title">Payments</span>
                  <span className="ad-quick-desc">Transactions & revenue</span>
                </span>
                <span className="material-symbols-outlined ad-quick-chevron">chevron_right</span>
              </Link>
              <Link to="/admin/notifications" className="ad-quick-action ad-quick-action--panel">
                <span className="ad-quick-action-icon-wrap">
                  <span className="material-symbols-outlined ad-quick-icon">notifications</span>
                </span>
                <span className="ad-quick-copy">
                  <span className="ad-quick-title">Notifications</span>
                  <span className="ad-quick-desc">Broadcast messages</span>
                </span>
                <span className="material-symbols-outlined ad-quick-chevron">chevron_right</span>
              </Link>
            </nav>
          </div>
        </aside>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="ad-section">
        <div className="ad-section-head">
          <h2>Recent Activity</h2>
          <p>Live updates from critical admin workflows.</p>
        </div>

        <div className="ad-activity">
          {activity.map((a, idx) => (
            <div key={`${a.title}-${idx}`} className="ad-activity-item">
              <div className="ad-activity-icon">
                <span className="material-symbols-outlined"> {a.icon} </span>
              </div>
              <div className="ad-activity-body">
                <div className="ad-activity-title">{a.title}</div>
                <div className="ad-activity-when">{a.when}</div>
              </div>
              <div className="ad-activity-dot" />
            </div>
          ))}
        </div>
      </div>

      {/* TODAY’S APPOINTMENTS + PENDING DOCTOR REQUESTS */}
      <div className="ad-two-col">
        <div className="ad-section">
          <div className="ad-section-head">
            <h2>Today’s Appointments</h2>
            <p>{todayISOHuman}</p>
          </div>

          <div className="pd-card">
            <div className="pd-table-wrap">
              <table className="pd-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todaysAppointments.length ? (
                    todaysAppointments.map((a) => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 900 }}>{a.patientName || "-"}</td>
                        <td>{a.doctorName || "-"}</td>
                        <td style={{ fontWeight: 800 }}>{a.time || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ color: "#94a3b8" }}>
                        No appointments found for today (based on what admin account can fetch).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="ad-section">
          <div className="ad-section-head">
            <h2>Pending Doctor Requests</h2>
            <p>Approve or reject doctor registrations.</p>
          </div>

          <div className="pd-card">
            <div className="ad-pending-list">
              {pendingDoctors.length ? (
                pendingDoctors.slice(0, 6).map((doc) => {
                  const details = doctorDetailsByUserId[doc._id] || {};
                  return (
                    <div key={doc._id} className="ad-pending-row">
                      <div className="ad-pending-left">
                        <div className="ad-avatar">
                          <span>{String((details.fullName || doc.name || "D").charAt(0)).toUpperCase()}</span>
                        </div>
                        <div className="ad-pending-meta">
                          <div className="ad-pending-name">{details.fullName || doc.name}</div>
                          <div className="ad-pending-spec">
                            {details.specialization ? `Specialty: ${details.specialization}` : "Specialty unavailable"}
                          </div>
                        </div>
                      </div>

                      <div className="ad-pending-actions">
                        <button type="button" className="ad-btn ad-btn-approve" onClick={() => approveRejectDoctor(doc._id, true)}>
                          ✅ Approve
                        </button>
                        <button type="button" className="ad-btn ad-btn-reject" onClick={() => approveRejectDoctor(doc._id, false)}>
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "#94a3b8", fontWeight: 700 }}>No pending doctor requests right now.</div>
              )}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
