import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

export default function DoctorAppointmentsPage() {
    const { authHeaders } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAppointments = () => {
        setLoading(true);
        api.get("/appointments/doctor", authHeaders)
            .then((res) => setAppointments(res.data.appointments || []))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAppointments();
        // eslint-disable-next-line
    }, [authHeaders]);

    const handleStatusUpdate = async (id, action) => {
        try {
            await api.patch(`/appointments/${id}/${action}`, {}, authHeaders);
            fetchAppointments();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    return (
        <DoctorShell title="Appointments" subtitle="Manage patient booking requests">
            {loading ? (
                <p>Loading appointments...</p>
            ) : appointments.length === 0 ? (
                <div style={{ padding: "2rem", background: "#f8f9fa", borderRadius: "8px", textAlign: "center" }}>
                    No appointments found.
                </div>
            ) : (
                <div className="pd-grid pd-grid-2">
                    {appointments.map((appt) => (
                        <article key={appt._id} className="pd-card" style={{ borderLeft: `4px solid ${getStatusColor(appt.status)}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <h3 style={{ margin: "0 0 0.25rem 0" }}>{appt.date} {appt.time && `at ${appt.time}`}</h3>
                                    <p style={{ margin: 0, fontWeight: "600" }}>{appt.patientName}</p>
                                </div>
                                <span style={{
                                    padding: "0.25rem 0.75rem",
                                    borderRadius: "1rem",
                                    fontSize: "0.8rem",
                                    background: getStatusBg(appt.status),
                                    color: getStatusColor(appt.status),
                                    fontWeight: "bold",
                                    textTransform: "capitalize"
                                }}>
                                    {appt.status}
                                </span>
                            </div>

                            <div style={{ marginTop: "1rem" }}>
                                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 0.5rem 0" }}>
                                    <strong>Reason:</strong> {appt.reason || "Not specified"}
                                </p>
                                {appt.notes && (
                                    <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 0.5rem 0" }}>
                                        <strong>Notes:</strong> {appt.notes}
                                    </p>
                                )}
                            </div>

                            <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                {appt.status === "pending" && (
                                    <>
                                        <button onClick={() => handleStatusUpdate(appt._id, "accept")} className="mf-primary-btn" style={{ padding: "0.5rem 1rem" }}>
                                            Accept
                                        </button>
                                        <button onClick={() => handleStatusUpdate(appt._id, "reject")} className="mf-secondary-btn" style={{ padding: "0.5rem 1rem", color: "red", borderColor: "red" }}>
                                            Reject
                                        </button>
                                    </>
                                )}
                                {appt.status === "accepted" && (
                                    <button onClick={() => handleStatusUpdate(appt._id, "complete")} className="mf-primary-btn" style={{ padding: "0.5rem 1rem", background: "#27ae60" }}>
                                        Mark Completed
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </DoctorShell>
    );
}

function getStatusColor(status) {
    switch (status) {
        case "pending": return "#e67e22";
        case "accepted": return "#2980b9";
        case "completed": return "#27ae60";
        case "rejected":
        case "cancelled": return "#c0392b";
        default: return "#7f8c8d";
    }
}

function getStatusBg(status) {
    switch (status) {
        case "pending": return "#fdf2e9";
        case "accepted": return "#eaf2f8";
        case "completed": return "#e9f7ef";
        case "rejected":
        case "cancelled": return "#fdedec";
        default: return "#f2f4f4";
    }
}
