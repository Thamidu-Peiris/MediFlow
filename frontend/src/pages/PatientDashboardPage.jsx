import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PatientDashboardPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    api.get("/patients/appointments", authHeaders).then((res) => {
      setAppointments(res.data.appointments || []);
    }).catch(() => setAppointments([]));
    api.get("/patients/prescriptions", authHeaders).then((res) => {
      setPrescriptions(res.data.prescriptions || []);
    }).catch(() => setPrescriptions([]));
  }, [authHeaders]);

  const upcoming = appointments.filter((a) => a.status === "upcoming").slice(0, 3);
  const recentPrescriptions = [...prescriptions].reverse().slice(0, 3);

  return (
    <PatientShell title="Patient Dashboard" subtitle="Overview of your health account">
      <div className="pd-grid pd-grid-3">
        <article className="pd-card">
          <h3>Upcoming appointments</h3>
          {upcoming.length === 0 ? <p>No upcoming appointments.</p> : upcoming.map((item) => (
            <p key={item._id || `${item.doctorName}-${item.date}`}>
              {item.date || "TBA"} - {item.doctorName || "Doctor"}
            </p>
          ))}
        </article>
        <article className="pd-card">
          <h3>Recent prescriptions</h3>
          {recentPrescriptions.length === 0 ? <p>No prescriptions found.</p> : recentPrescriptions.map((item) => (
            <p key={item._id || item.createdAt}>{item.notes || "Prescription note"}</p>
          ))}
        </article>
        <article className="pd-card">
          <h3>Quick actions</h3>
          <div className="pd-actions">
            <Link to="/doctors" className="mf-primary-btn">Book appointment</Link>
            <Link to="/patient/reports" className="mf-secondary-btn">Upload report</Link>
          </div>
        </article>
      </div>
    </PatientShell>
  );
}
