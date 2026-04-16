import { useEffect, useState } from "react";
import PatientShell from "../components/PatientShell";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { resolveApiFileUrl } from "../utils/mediaUrl";

export default function PatientTelemedicinePage() {
  const { authHeaders } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchSessions = async () => {
    setLoading(true);
    setMessage("");
    try {
      // Backend should return sessions with doctor info enriched
      const [sessionsRes, doctorsRes] = await Promise.all([
        api.get("/telemedicine/my", authHeaders),
        api.get("/doctors/public").catch(() => ({ data: { doctors: [] } }))
      ]);
      const rawSessions = sessionsRes.data?.sessions || [];
      const doctors = Array.isArray(doctorsRes.data?.doctors) ? doctorsRes.data.doctors : [];
      const doctorByUserId = doctors.reduce((acc, doctor) => {
        if (doctor?.userId) acc[String(doctor.userId)] = doctor;
        return acc;
      }, {});

      const enrichedSessions = rawSessions.map((session) => {
        const matchedDoctor =
          doctorByUserId[String(session.doctorId)] ||
          doctorByUserId[String(session.doctorUserId)] ||
          null;
        return {
          ...session,
          doctorImage: session.doctorImage || matchedDoctor?.image || "",
          doctorName: session.doctorName || matchedDoctor?.fullName || "Doctor",
          specialty: session.specialty || matchedDoctor?.specialization || "General Practitioner"
        };
      });

      setSessions(enrichedSessions);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
      setMessage("Failed to load video consultations. Please try again.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders]);

  const joinVideoCall = (session) => {
    const peerName = encodeURIComponent(session.doctorName || "Doctor");
    const videoCallUrl = `/video-call?channel=${session.roomId}&role=patient&peer=${peerName}`;
    window.open(videoCallUrl, '_blank');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  return (
    <PatientShell>
      <div className="at-tele-page">
        <header className="at-tele-header-hero">
          <h1 className="at-tele-page-title">Video Consultations</h1>
          <p className="at-tele-page-lead">
            Manage and join your digital healthcare sessions from our secure atelier.
          </p>
        </header>

        <div className="at-tele-layout">
          {/* Left Sidebar Info Card */}
          <aside className="at-tele-info-card">
            <div className="at-tele-graphic">
              <div className="at-tele-graphic-circle">
                <span className="material-symbols-outlined" style={{ fontSize: "32px", fontVariationSettings: "'FILL' 1" }}>videocam</span>
              </div>
            </div>
            <h2 className="at-tele-side-title">Attend Video Consultation</h2>
            <p className="at-tele-side-desc">
              Access your scheduled medical sessions with high-definition clarity. Please ensure your microphone and camera are functional before joining.
            </p>
            <button className="at-btn-refresh-tele" onClick={fetchSessions} disabled={loading}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>refresh</span>
              Refresh Sessions
            </button>
          </aside>

          {/* Right Side Main Content */}
          <main className="at-tele-main">
            <header className="at-tele-section-header">
              <h2 className="at-tele-list-title">My Video Sessions</h2>
              <div className="at-live-sync-indicator">
                <div className="at-pulse-dot"></div>
                <span>Live Sync Enabled</span>
              </div>
            </header>

            <div className="at-session-stack">
              {loading ? (
                <div className="aura-loading" style={{ padding: "60px 0", textAlign: "center" }}>
                  <div className="aura-spinner" style={{ margin: "0 auto 20px" }}></div>
                  <p style={{ color: "#64748b", fontWeight: "600" }}>Syncing your sessions...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="aura-empty-state" style={{ padding: "60px 0" }}>
                  <div style={{ width: "80px", height: "80px", background: "white", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", margin: "0 auto 24px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#94a3b8" }}>videocam_off</span>
                  </div>
                  <h3>No video sessions found</h3>
                  <p>Your upcoming telemedicine appointments will appear here.</p>
                </div>
              ) : (
                sessions.map(session => {
                  const status = String(session.status || "").toLowerCase();
                  const isEnded = status === 'completed' || status === 'cancelled' || status === 'ended';
                  const isWaiting = status === 'pending' || status === 'waiting';
                  const isActive = status === 'accepted' || status === 'confirmed' || status === 'active';
                  const doctorImageSrc = session.doctorImage ? resolveApiFileUrl(session.doctorImage) : "/default-profile-avatar.png";

                  return (
                    <div key={session._id} className="at-session-bento">
                      <div className="at-session-left-area">
                        <img 
                          src={doctorImageSrc}
                          alt={session.doctorName || "Doctor"} 
                          className="at-session-doc-img"
                          onError={(e) => { e.target.src = "/default-profile-avatar.png"; }}
                        />
                        <div className="at-session-details-box">
                          <div className="at-session-name-row">
                            <h3 className="at-session-doctor-name">{session.doctorName || "Doctor"}</h3>
                            <span className={`at-status-pill-tele ${isActive ? 'active' : isWaiting ? 'waiting' : 'ended'}`}>
                              {isActive ? 'Active' : isWaiting ? 'Waiting' : 'Ended'}
                            </span>
                          </div>
                          <p className="at-session-specialty">{session.specialty || "General Practitioner"}</p>
                          <div className="at-session-meta-row">
                            <div className="at-session-meta-pill">
                              <span className="material-symbols-outlined">schedule</span>
                              <span>{session.time || "Time TBD"}</span>
                            </div>
                            <div className="at-session-meta-pill">
                              <span className="material-symbols-outlined">calendar_today</span>
                              <span>{isToday(session.date) ? 'Today, ' : ''}{formatDate(session.date)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="at-session-action-area">
                        {isActive && (
                          <button className="at-btn-call-active" onClick={() => joinVideoCall(session)}>
                            <span className="material-symbols-outlined" style={{ fontSize: "20px", fontVariationSettings: "'FILL' 1" }}>videocam</span>
                            Join Video Call
                          </button>
                        )}
                        {isWaiting && (
                          <button className="at-btn-room-waiting" onClick={() => joinVideoCall(session)}>
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>login</span>
                            Join Waiting Room
                          </button>
                        )}
                        {isEnded && (
                          <button className="at-btn-notes-ended">
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>description</span>
                            View Notes
                          </button>
                        )}
                        
                        <button className="at-btn-dots-more">
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </main>
        </div>
      </div>
    </PatientShell>
  );
}

