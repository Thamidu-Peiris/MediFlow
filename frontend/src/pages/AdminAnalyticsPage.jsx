import { useEffect, useMemo, useState } from "react";
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

export default function AdminAnalyticsPage() {
  const { authHeaders } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.get("/auth/admin/overview", authHeaders);
      setMetrics(res.data.metrics);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const charts = useMemo(() => {
    const totalPatients = metrics?.totalPatients ?? 0;
    const totalDoctors = metrics?.totalDoctors ?? 0;
    const revenue = metrics?.grossRevenueLkr ?? 0;

    const doctorBase = Math.max(1, Math.round(totalDoctors / 2));
    const appointmentBase = Math.max(1, Math.round(doctorBase * 2.2));

    const appointmentsPerDay = [
      { day: "Mon", count: appointmentBase - 2 },
      { day: "Tue", count: appointmentBase + 1 },
      { day: "Wed", count: appointmentBase + 3 },
      { day: "Thu", count: Math.max(0, appointmentBase - 1) },
      { day: "Fri", count: appointmentBase + 2 },
      { day: "Sat", count: Math.max(0, Math.round(appointmentBase * 0.6)) },
      { day: "Sun", count: Math.max(0, Math.round(appointmentBase * 0.3)) },
    ];

    const revenueData = [
      { month: "Jan", revenue: Math.round(revenue * 0.12) },
      { month: "Feb", revenue: Math.round(revenue * 0.18) },
      { month: "Mar", revenue: Math.round(revenue * 0.2) },
      { month: "Apr", revenue: Math.round(revenue * 0.25) },
      { month: "May", revenue: Math.round(revenue * 0.15) },
      { month: "Jun", revenue: Math.round(revenue * 0.1) },
    ];

    const userGrowth = [
      { month: "Jan", patients: Math.round(totalPatients * 0.35) },
      { month: "Feb", patients: Math.round(totalPatients * 0.42) },
      { month: "Mar", patients: Math.round(totalPatients * 0.5) },
      { month: "Apr", patients: Math.round(totalPatients * 0.6) },
      { month: "May", patients: Math.round(totalPatients * 0.72) },
      { month: "Jun", patients: Math.round(totalPatients * 0.82) },
    ];

    return { appointmentsPerDay, revenueData, userGrowth };
  }, [metrics]);

  return (
    <section className="pd-layout-admin">
      <div className="pd-card">
        <h3>System Analytics</h3>
        <p style={{ color: "#94a3b8", marginBottom: 14 }}>
          Charts use available backend metrics and demo trends.
        </p>

        {loading ? <p className="page muted">Loading...</p> : null}
        {message ? <p className="page muted">{message}</p> : null}

        <div className="pd-grid pd-grid-2">
          <article className="pd-card" style={{ margin: 0 }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Appointments per day</h4>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.appointmentsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Appointments" fill="#0d9488" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="pd-card" style={{ margin: 0 }}>
            <h4 style={{ margin: "0 0 10px 0" }}>Revenue chart</h4>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue (LKR)" stroke="#0d9488" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="pd-card" style={{ margin: 0, gridColumn: "span 2" }}>
            <h4 style={{ margin: "0 0 10px 0" }}>User growth</h4>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="patients" name="Patients" stroke="#6366f1" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

