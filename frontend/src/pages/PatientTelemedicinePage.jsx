import { useEffect, useMemo, useState } from "react";
import PatientShell from "../components/PatientShell";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function PatientTelemedicinePage() {
  const { authHeaders, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);
  const [message, setMessage] = useState("");

  const fetchSessions = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.get("/telemedicine/my", authHeaders);
      setSessions(res.data.sessions || []);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load video consultations");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  const openRoomByCode = async (roomCode) => {
    if (!roomCode) return;
    try {
      await api.get(`/telemedicine/room/${roomCode}`, authHeaders);
      setActiveRoom(roomCode);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Invalid or unavailable room");
    }
  };

  const roomUrl = useMemo(() => {
    if (!activeRoom) return "";
    const safeName = encodeURIComponent(user?.name || "Patient");
    return `https://meet.jit.si/MediFlow_${activeRoom}#userInfo.displayName="${safeName}"`;
  }, [activeRoom, user?.name]);

  if (activeRoom) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#111827" }}>
        <div
          style={{
            background: "#0f172a",
            color: "#ffffff",
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Video Consultation</h2>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", opacity: 0.75 }}>Room: {activeRoom}</p>
          </div>
          <button
            onClick={() => setActiveRoom(null)}
            style={{
              padding: "0.55rem 1rem",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Leave Call
          </button>
        </div>

        <div style={{ flex: 1 }}>
          <iframe
            src={roomUrl}
            allow="camera; microphone; fullscreen; display-capture"
            style={{ width: "100%", height: "100%", border: "none" }}
            title="Patient Telemedicine"
          />
        </div>
      </div>
    );
  }

  return (
    <PatientShell>
      <main className="pd-grid pd-grid-2">
        <section className="pd-card">
          <h3 style={{ marginBottom: 6 }}>Attend Video Consultation</h3>
          <p style={{ color: "#64748b", marginBottom: 14 }}>
            Join your doctor’s online consultation room when your session is active.
          </p>

          {message ? <p className="muted">{message}</p> : null}

          <div className="pd-form">
            <button type="button" className="btn-primary" onClick={fetchSessions}>
              Refresh Sessions
            </button>
          </div>
        </section>

        <section className="pd-card">
          <h3 style={{ marginBottom: 12 }}>My Video Sessions</h3>
          {loading ? (
            <p className="muted">Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p className="muted">No video sessions available yet.</p>
          ) : (
            <div className="pd-list">
              {sessions.map((s) => (
                <article
                  key={s._id}
                  className="pd-card"
                  style={{
                    borderLeft: `4px solid ${
                      s.status === "active" ? "#22c55e" : s.status === "ended" ? "#94a3b8" : "#f59e0b"
                    }`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <strong>{s.doctorName || "Doctor"}</strong>
                    <span style={{ textTransform: "uppercase", fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                      {s.status}
                    </span>
                  </div>
                  <p style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
                    Created: {new Date(s.createdAt).toLocaleString()}
                  </p>
                  <div className="pd-actions" style={{ marginTop: 8 }}>
                    {(s.status === "waiting" || s.status === "active") && (
                      <button type="button" onClick={() => openRoomByCode(s.roomId)}>
                        Join Room
                      </button>
                    )}
                    {s.status === "ended" && <span className="muted">Session ended</span>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </PatientShell>
  );
}

