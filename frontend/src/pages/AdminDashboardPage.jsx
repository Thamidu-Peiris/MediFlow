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

  const pendingCount = metrics?.pendingDoctorVerifications ?? 0;
  const revenueLkr = metrics?.grossRevenueLkr ?? 0;

  const loadDoctorDetails = async (pending) => {
    try {
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
      setDoctorDetailsByUserId({});
    }
  };

  function activityTimeAgo(dateStr) {
    if (!dateStr) return "recently";
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return "just now";
    const mins = Math.floor(diff / 60);
    if (diff < 3600) return mins + " min" + (mins > 1 ? "s" : "") + " ago";
    const hrs = Math.floor(diff / 3600);
    if (diff < 86400) return hrs + " hour" + (hrs > 1 ? "s" : "") + " ago";
    const days = Math.floor(diff / 86400);
    return days + " day" + (days > 1 ? "s" : "") + " ago";
  }

  const buildActivity = (allUsers, allAppointments) => {
    const events = [];

    const recentUsers = [...(allUsers || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);
    recentUsers.forEach((u) => {
      const isDoc = u.role === "doctor";
      const icon = isDoc ? (u.isDoctorVerified ? "verified" : "schedule") : "person_add";
      let title;
      if (isDoc) {
        title = u.isDoctorVerified
          ? "Doctor " + u.name + " approved"
          : "Doctor " + u.name + " pending review";
      } else {
        title = "Patient " + u.name + " registered";
      }
      events.push({ icon, title, when: activityTimeAgo(u.createdAt), _ts: new Date(u.createdAt).getTime() });
    });

    const recentApts = [...(allAppointments || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);
    recentApts.forEach((a) => {
      const done = a.status === "completed";
      const icon = done ? "task_alt" : "event";
      const patName = a.patientName || "Patient";
      const title = done
        ? "Appointment completed - " + patName
        : "Appointment booked - " + patName;
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

      const pending = (nextUsers || []).filter((u) => u.role === "doctor" && !u.isDoctorVerified);
      setActivity(buildActivity(nextUsers, nextAppointments));

      await loadDoctorDetails(pending);
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
      setActivity((prev) =>
        [
          {
            icon: verified ? "verified_user" : "cancel",
            title: verified ? "Doctor approved" : "Doctor rejected",
            when: "just now",
          },
          ...prev,
        ].slice(0, 7)
      );
      await loadData();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update doctor verification");
    }
  };

  const charts = useMemo(() => {
    const totalPatients = metrics?.totalPatients ?? 0;
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

    return { appointmentTrends, revenueAnalytics };
  }, [metrics, appointmentsCount]);

  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return { users: [], appointments: [] };

    const u = (users || []).filter((x) => {
      const name = String(x.name || "").toLowerCase();
      const email = String(x.email || "").toLowerCase();
      const role = String(x.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });

    const appts = (appointments || []).filter((a) => {
      const patientName = String(a.patientName || "").toLowerCase();
      const doctorName = String(a.doctorName || "").toLowerCase();
      return patientName.includes(q) || doctorName.includes(q);
    });

    return {
      users: u.slice(0, 7),
      appointments: appts.slice(0, 5),
    };
  }, [globalSearchQuery, users, appointments]);

  const dateTimeLine = useMemo(() => {
    try {
      const d = new Date();
      const dateStr = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
      const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${dateStr} • ${timeStr}`;
    } catch {
      return "";
    }
  }, []);

  const totalUsers = metrics?.totalUsers ?? 0;
  const totalDoctors = metrics?.totalDoctors ?? 0;
  const todayAptCount = todaysAppointments.length;

  return (
    <div className="font-body text-on-surface pb-4">
      {message ? (
        <p className="mb-4 rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm font-medium border border-red-100">{message}</p>
      ) : null}

      {/* Page header — editorial */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 mb-5 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Dashboard</h2>
          <p className="text-on-surface-variant font-medium mt-1 text-sm sm:text-base">{dateTimeLine}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/payments"
            className="group px-4 py-2 bg-white text-black font-semibold rounded-xl shadow-sm border border-emerald-200/70 flex items-center gap-2 transition-all hover:bg-emerald-100 hover:border-emerald-400 hover:text-emerald-950 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[20px] text-emerald-700 group-hover:text-emerald-800">
              payments
            </span>
            Payments
          </Link>
          <Link
            to="/admin/appointments"
            className="px-4 py-2 hero-chip-gradient text-white font-semibold rounded-xl shadow-md hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            Appointment
          </Link>
        </div>
      </div>

      {/* Search — emerald styling to match metric cards */}
      <div className="mb-5 sm:mb-8 w-full sm:max-w-md">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="search"
            className="w-full bg-white border border-emerald-200/70 rounded-xl py-2.5 pl-10 pr-4 text-sm text-black placeholder:text-black shadow-sm ring-1 ring-emerald-100/80 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-400 focus:outline-none transition-all"
            placeholder="users, doctors, appointments..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            aria-label="Search"
          />
        </div>
        {globalSearchQuery.trim() ? (
          <div className="mt-3 rounded-xl border border-emerald-200/60 bg-white p-4 shadow-sm ring-1 ring-emerald-100/60 space-y-3 text-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Users</p>
              {globalSearchResults.users.length ? (
                globalSearchResults.users.map((u) => (
                  <div key={u._id} className="py-2 border-b border-outline-variant/30 last:border-0">
                    <div className="font-semibold text-on-surface">{u.name}</div>
                    <div className="text-xs text-on-surface-variant">{u.email}</div>
                    <div className="text-xs text-emerald-700 font-semibold mt-0.5">{u.role}</div>
                  </div>
                ))
              ) : (
                <p className="text-on-surface-variant">No user matches.</p>
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">Appointments</p>
              {globalSearchResults.appointments.length ? (
                globalSearchResults.appointments.map((a) => (
                  <div key={a._id} className="py-2 border-b border-outline-variant/30 last:border-0">
                    <div className="font-semibold text-on-surface">
                      {a.patientName} → {a.doctorName}
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      {String(a.date || "").slice(0, 10)} • {a.time || "-"}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-on-surface-variant">No appointment matches.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Bento metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-6 mb-5 sm:mb-8">
        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800 text-[18px] sm:text-[24px]">group</span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Users</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-headline tracking-tight text-on-surface">{totalUsers}</div>
          <div className="mt-1.5 sm:mt-2 text-xs text-emerald-700 flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            Active accounts
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800 text-[18px] sm:text-[24px]">medical_services</span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-on-surface-variant">Doctors</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-headline tracking-tight text-on-surface">{totalDoctors}</div>
          <div className="mt-1.5 sm:mt-2 text-xs text-on-surface-variant">Active specialists</div>
        </div>

        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800 text-[18px] sm:text-[24px]">event_note</span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-on-surface-variant">Appointments</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black font-headline tracking-tight text-on-surface">{appointmentsCount}</div>
          <div className="mt-1.5 sm:mt-2 text-xs text-on-surface-variant">
            {todayAptCount === 0 ? "None scheduled today" : `${todayAptCount} today`}
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 sm:p-6 rounded-xl shadow-sm col-span-2 md:col-span-2 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-emerald-400/25 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 relative">
            <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800 text-[18px] sm:text-[24px]">payments</span>
            </div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Revenue</span>
          </div>
          <div className="text-2xl sm:text-4xl font-black font-headline tracking-tight text-on-surface relative">{formatLkr(revenueLkr)}</div>
          <div className="mt-1.5 sm:mt-2 text-xs text-error font-semibold flex items-center gap-1 relative">
            <span className="material-symbols-outlined text-sm">trending_flat</span>
            {revenueLkr === 0 ? "0% growth" : "Recorded revenue"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8">
        {/* Analytics */}
        <div className="lg:col-span-8 space-y-5 sm:space-y-8">
          <section className="bg-surface-container-lowest p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-xl font-bold font-headline text-on-surface">Appointment Trends</h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs font-medium px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                  Weekly
                </span>
                <span className="flex items-center gap-1 text-xs font-medium px-3 py-1 bg-black text-white rounded-full">Monthly</span>
              </div>
            </div>
            <div className="h-48 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.appointmentTrends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e3e5" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#000000" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-surface-container-lowest p-4 sm:p-6 lg:p-8 rounded-xl shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-xl font-bold font-headline text-on-surface">Revenue Analytics</h3>
              <Link
                to="/admin/reports"
                className="px-3 py-1 bg-[#0C9100] text-white text-xs font-bold rounded-lg flex items-center gap-1 hover:bg-[#097300] transition-colors shadow-sm"
              >
                Download Report <span className="material-symbols-outlined text-sm">download</span>
              </Link>
            </div>
            {revenueLkr === 0 ? (
              <div className="flex items-center justify-center h-48 border-2 border-dashed border-outline-variant/40 rounded-xl bg-surface">
                <div className="text-center px-4">
                  <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">bar_chart_4_bars</span>
                  <p className="text-on-surface-variant text-sm font-medium">Insufficient data for revenue modeling</p>
                </div>
              </div>
            ) : (
              <div className="h-44 sm:h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.revenueAnalytics} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e3e5" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="income" name="Income (LKR)" fill="#111c2d" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar column */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          <section className="bg-white p-4 sm:p-6 rounded-xl border border-red-200/70 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                warning
              </span>
              <h3 className="text-lg font-bold font-headline text-red-900">Critical Review</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-800 font-medium">Pending Doctor Approvals</span>
              <span className="text-2xl font-black font-headline text-error">
                {String(Math.min(99, pendingCount)).padStart(2, "0")}
              </span>
            </div>
            <Link
              to="/admin/doctors-verification"
              className="block w-full mt-6 py-3 bg-error text-on-error rounded-xl font-bold text-sm shadow-sm hover:opacity-90 active:scale-[0.98] transition-all text-center"
            >
              Review Applications
            </Link>
          </section>

          <section 
            className="p-4 sm:p-6 lg:p-8 rounded-[24px] sm:rounded-[32px] shadow-sm relative overflow-hidden transition-all"
            style={{ backgroundColor: '#9ae649' }}
          >
            <h3 className="text-xl sm:text-2xl font-bold font-headline text-[#043927] mb-5 sm:mb-8">
              Quick Actions
            </h3>
            
            <div className="space-y-4 relative">
              {[
                { to: "/admin/doctors-verification", icon: "verified_user", label: "Approve Doctors" },
                { to: "/admin/users", icon: "manage_accounts", label: "Manage Users" },
                { to: "/admin/appointments", icon: "calendar_month", label: "Appointments" },
                { to: "/admin/payments", icon: "payments", label: "Payments" },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-white/80 hover:bg-white transition-all duration-200"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#3d5a5c] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-white text-[22px]">
                        {item.icon}
                      </span>
                    </div>
                    <span className="text-base font-bold text-[#043927] truncate">{item.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[#043927]/30 group-hover:text-[#043927] shrink-0 transition-all mr-2">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Secondary sections — data tables */}
      <div className="mt-6 sm:mt-10 space-y-5 sm:space-y-8">
        <section>
          <h3 className="text-base sm:text-lg font-bold font-headline text-on-surface mb-3 sm:mb-4">Recent Activity</h3>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 divide-y divide-outline-variant/20">
            {activity.length ? (
              activity.map((a, idx) => (
                <div key={`${a.title}-${idx}`} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-emerald-50/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                    <span className="material-symbols-outlined text-[20px]">{a.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{a.title}</p>
                    <p className="text-xs text-on-surface-variant">{a.when}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="p-6 text-sm text-on-surface-variant">No recent activity.</p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
          <section>
            <h3 className="text-base sm:text-lg font-bold font-headline text-on-surface mb-3 sm:mb-4">Today&apos;s Appointments</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-100 bg-emerald-50/50">
                    <th className="text-left p-3 font-bold text-emerald-900">Patient</th>
                    <th className="text-left p-3 font-bold text-emerald-900">Doctor</th>
                    <th className="text-left p-3 font-bold text-emerald-900">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {todaysAppointments.length ? (
                    todaysAppointments.map((a) => (
                      <tr key={a._id} className="border-b border-outline-variant/20 last:border-0">
                        <td className="p-3 font-semibold">{a.patientName || "-"}</td>
                        <td className="p-3 text-on-surface-variant">{a.doctorName || "-"}</td>
                        <td className="p-3 font-medium">{a.time || "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-4 text-on-surface-variant">
                        No appointments found for today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="text-base sm:text-lg font-bold font-headline text-on-surface mb-3 sm:mb-4">Pending Doctor Requests</h3>
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 p-4 space-y-3">
              {pendingDoctors.length ? (
                pendingDoctors.slice(0, 6).map((doc) => {
                  const details = doctorDetailsByUserId[doc._id] || {};
                  return (
                    <div
                      key={doc._id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white border border-emerald-100 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0">
                          {String((details.fullName || doc.name || "D").charAt(0)).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-on-surface truncate">{details.fullName || doc.name}</div>
                          <div className="text-xs text-on-surface-variant truncate">
                            {details.specialization ? `Specialty: ${details.specialization}` : "Specialty unavailable"}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200"
                          onClick={() => approveRejectDoctor(doc._id, true)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-xs font-bold hover:bg-red-200"
                          onClick={() => approveRejectDoctor(doc._id, false)}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-on-surface-variant py-2">No pending doctor requests.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
