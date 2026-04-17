import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminAppointmentsPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    today: 0,
    completed: 0,
    pending: 0,
    accepted: 0,
    cancelled: 0
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");

  const dateTimeLine = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) + " • " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const res = await api.get(`/appointments/admin/all?${params.toString()}`, authHeaders);
      setAppointments(res.data.appointments || []);
      setMetrics(res.data.metrics || {
        total: 0,
        today: 0,
        completed: 0,
        pending: 0,
        accepted: 0,
        cancelled: 0
      });
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders, statusFilter]);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString || "-";
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800",
      accepted: "bg-emerald-100 text-emerald-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      completed: "bg-blue-100 text-blue-800"
    };
    const icons = {
      pending: "schedule",
      accepted: "check_circle",
      rejected: "cancel",
      cancelled: "block",
      completed: "task_alt"
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[status] || styles.pending}`}>
        <span className="material-symbols-outlined text-[14px] mr-1">{icons[status] || "help"}</span>
        {status?.toUpperCase()}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    return type === "online" ? "videocam" : "person";
  };

  return (
    <div className="font-body text-on-surface pb-10">
      {message ? (
        <p className="mb-4 rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm font-medium border border-red-100">{message}</p>
      ) : null}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Appointments Management</h2>
          <p className="text-on-surface-variant font-medium mt-1">{dateTimeLine}</p>
        </div>
      </div>

      {/* Bento metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">calendar_month</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Total Bookings</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{metrics.total}</div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold">{metrics.pending} pending • {metrics.accepted} accepted</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">today</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Today</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{metrics.today}</div>
          <div className="mt-2 text-xs text-on-surface-variant">Scheduled for today</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">check_circle</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Completed</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{metrics.completed}</div>
          <div className="mt-2 text-xs text-on-surface-variant">{metrics.cancelled} cancelled/rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          className="bg-white border border-emerald-200/70 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm cursor-pointer appearance-none min-w-[140px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/50">
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Appointment</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Patient</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Doctor</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Status</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-on-surface-variant font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-5xl opacity-20 animate-spin">refresh</span>
                    <p>Loading appointments...</p>
                  </div>
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-on-surface-variant font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-5xl opacity-20">calendar_today</span>
                    <p>No appointments found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              appointments.map((apt) => (
                <tr key={apt._id} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                        {getTypeIcon(apt.appointmentType)}
                      </span>
                      <div>
                        <p className="font-semibold text-on-surface">{apt.specialization || "Consultation"}</p>
                        <p className="text-xs text-on-surface-variant capitalize">{apt.appointmentType || "physical"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{apt.patientName}</p>
                    <p className="text-xs text-on-surface-variant">{apt.patientEmail || "-"}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{apt.doctorName}</p>
                    <p className="text-xs text-on-surface-variant">{apt.doctorEmail || "-"}</p>
                  </td>
                  <td className="p-4">{getStatusBadge(apt.status)}</td>
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{formatDate(apt.date)}</p>
                    <p className="text-xs text-on-surface-variant">{apt.time || "-"}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

