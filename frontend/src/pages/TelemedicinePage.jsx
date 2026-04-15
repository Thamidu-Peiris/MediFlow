import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

export default function TelemedicinePage() {
    const { authHeaders, user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRoom, setActiveRoom] = useState(null);

    // Create form
    const [createForm, setCreateForm] = useState({ appointmentId: "", patientId: "", patientName: "" });

    const fetchSessions = () => {
        setLoading(true);
        api.get("/telemedicine/my", authHeaders)
            .then((res) => setSessions(res.data.sessions || []))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line
    }, [authHeaders]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post("/telemedicine", createForm, authHeaders);
            setCreateForm({ appointmentId: "", patientId: "", patientName: "" });
            fetchSessions();
        } catch (err) {
            alert("Failed to create session");
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === "start" || action === "end") {
                await api.patch(`/telemedicine/${id}/${action}`, {}, authHeaders);
                fetchSessions();
            }
        } catch (err) {
            alert(`Failed to ${action} session`);
        }
    };

    const joinVideoCall = (session) => {
        const peerName = encodeURIComponent(session.patientName || "Patient");
        const videoCallUrl = `/video-call?channel=${session.roomId}&role=doctor&peer=${peerName}`;
        window.open(videoCallUrl, '_blank');
    };

    if (activeRoom) {
        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#111" }}>
                <div style={{ background: "#222", color: "#fff", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Telemedicine Session</h2>
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", opacity: 0.7 }}>Room ID: {activeRoom}</p>
                    </div>
                    <button
                        onClick={() => setActiveRoom(null)}
                        style={{ padding: "0.5rem 1rem", background: "#e74c3c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                        Leave Video
                    </button>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#ffffff",
                        textAlign: "center"
                    }}>
                        <div style={{
                            background: "rgba(255,255,255,0.1)",
                            padding: "2rem",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.2)",
                            maxWidth: "400px"
                        }}>
                            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem" }}>In Video Call</h3>
                            <p style={{ margin: "0 0 1.5rem 0", opacity: 0.8 }}>
                                You are currently conducting a video consultation.
                            </p>
                            <p style={{ fontSize: "0.9rem", opacity: 0.6 }}>
                                Room ID: <strong>{activeRoom}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DoctorShell title="Video Consultations" subtitle="Manage and start telemedicine sessions">
            <div className="pd-grid pd-grid-2">
                <section>
                    <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #eee" }}>
                        <h3>Create New Session</h3>
                        <form onSubmit={handleCreate} className="mf-form">
                            <div className="mf-form-group">
                                <label>Patient ID</label>
                                <input type="text" value={createForm.patientId} onChange={e => setCreateForm({ ...createForm, patientId: e.target.value })} required />
                            </div>
                            <div className="mf-form-group">
                                <label>Patient Name</label>
                                <input type="text" value={createForm.patientName} onChange={e => setCreateForm({ ...createForm, patientName: e.target.value })} />
                            </div>
                            <div className="mf-form-group">
                                <label>Appointment ID (Optional)</label>
                                <input type="text" value={createForm.appointmentId} onChange={e => setCreateForm({ ...createForm, appointmentId: e.target.value })} />
                            </div>
                            <button type="submit" className="mf-primary-btn">Create Meeting Room</button>
                        </form>
                    </div>
                </section>

                <section>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        <h3>Your Sessions</h3>
                        {loading ? <p>Loading...</p> : sessions.length === 0 ? <p>No sessions found.</p> : (
                            sessions.map((s) => (
                                <article key={s._id} className="pd-card" style={{ borderLeft: `4px solid ${s.status === 'active' ? '#27ae60' : s.status === 'ended' ? '#95a5a6' : '#f39c12'}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <h4 style={{ margin: "0 0 0.5rem 0" }}>{s.patientName || s.patientId}</h4>
                                        <span style={{ fontSize: "0.8rem", textTransform: "uppercase", fontWeight: "bold", color: s.status === 'active' ? '#27ae60' : s.status === 'ended' ? '#95a5a6' : '#f39c12' }}>{s.status}</span>
                                    </div>
                                    <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 1rem 0" }}>Created: {new Date(s.createdAt).toLocaleString()}</p>

                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                                        {s.status === "waiting" && (
                                            <button onClick={() => handleAction(s._id, "start")} className="mf-primary-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>Start Session</button>
                                        )}

                                        {(s.status === "waiting" || s.status === "active") && (
                                            <button onClick={() => joinVideoCall(s)} className="mf-secondary-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", background: "#8e44ad", color: "white", borderColor: "#8e44ad" }}>Join Video Call</button>
                                        )}

                                        {s.status === "active" && (
                                            <button onClick={() => handleAction(s._id, "end")} className="mf-secondary-btn" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem", color: "red", borderColor: "red" }}>End Session</button>
                                        )}
                                    </div>

                                    <div style={{ marginTop: "1rem", fontSize: "0.8rem", background: "#f8f9fa", padding: "0.5rem", borderRadius: "4px", wordBreak: "break-all" }}>
                                        <strong>Room Link to share:</strong><br />
                                        <span style={{ userSelect: "all", color: "#2980b9" }}>/telemedicine/{s.roomId}</span>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </DoctorShell>
    );
}
