import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

export default function DoctorDashboardPage() {
    const { authHeaders } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        api.get("/appointments/doctor", authHeaders).then((r) => setAppointments(r.data.appointments || [])).catch(() => { });
        api.get("/doctors/prescriptions", authHeaders).then((r) => setPrescriptions(r.data.prescriptions || [])).catch(() => { });
        api.get("/telemedicine/my", authHeaders).then((r) => setSessions(r.data.sessions || [])).catch(() => { });
    }, [authHeaders]);

    const pending = appointments.filter((a) => a.status === "pending");
    const todaySessions = sessions.filter((s) => s.status !== "ended");

    return (
        <DoctorShell title="Doctor Dashboard" subtitle="Overview of your practice">
            <div className="pd-grid pd-grid-3">
                <article className="pd-card">
                    <h3>Pending Appointments</h3>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "#e67e22", margin: "0.5rem 0" }}>
                        {pending.length}
                    </p>
                    {pending.slice(0, 3).map((a) => (
                        <p key={a._id} style={{ fontSize: "0.85rem", color: "#666" }}>
                            {a.date} — {a.patientName || "Patient"}
                        </p>
                    ))}
                    <Link to="/doctor/appointments" className="mf-primary-btn" style={{ marginTop: "0.75rem", display: "inline-block" }}>
                        Manage Appointments
                    </Link>
                </article>

                <article className="pd-card">
                    <h3>Prescriptions Issued</h3>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "#27ae60", margin: "0.5rem 0" }}>
                        {prescriptions.length}
                    </p>
                    {[...prescriptions].reverse().slice(0, 3).map((p) => (
                        <p key={p._id} style={{ fontSize: "0.85rem", color: "#666" }}>
                            {p.patientName || p.patientId} — {p.medicines?.join(", ") || "—"}
                        </p>
                    ))}
                    <Link to="/doctor/prescriptions" className="mf-primary-btn" style={{ marginTop: "0.75rem", display: "inline-block" }}>
                        Issue Prescription
                    </Link>
                </article>

                <article className="pd-card">
                    <h3>Video Sessions</h3>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "#8e44ad", margin: "0.5rem 0" }}>
                        {todaySessions.length}
                    </p>
                    <p style={{ color: "#666", fontSize: "0.85rem" }}>
                        {todaySessions.length === 0 ? "No active sessions." : "Active / waiting sessions."}
                    </p>
                    <Link to="/doctor/telemedicine" className="mf-primary-btn" style={{ marginTop: "0.75rem", display: "inline-block" }}>
                        Start Consultation
                    </Link>
                </article>
            </div>

            <div className="pd-grid pd-grid-3" style={{ marginTop: "1.5rem" }}>
                <article className="pd-card">
                    <h3>Quick Actions</h3>
                    <div className="pd-actions">
                        <Link to="/doctor/profile" className="mf-secondary-btn">Edit Profile</Link>
                        <Link to="/doctor/availability" className="mf-secondary-btn">Set Availability</Link>
                        <Link to="/doctor/patients" className="mf-secondary-btn">Patient Reports</Link>
                    </div>
                </article>
            </div>
        </DoctorShell>
    );
}
