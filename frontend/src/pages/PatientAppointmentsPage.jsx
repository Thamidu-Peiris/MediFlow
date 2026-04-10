import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

const tabs = [
  { id: "upcoming", label: "Upcoming", icon: "calendar" },
  { id: "completed", label: "Completed", icon: "check" },
  { id: "cancelled", label: "Cancelled", icon: "x" }
];

const tabIcons = {
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
};

const statusColors = {
  confirmed: { bg: "#dcfce7", color: "#166534", label: "Confirmed" },
  accepted: { bg: "#dcfce7", color: "#166534", label: "Accepted" },
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  pending_payment: { bg: "#fef3c7", color: "#92400e", label: "Pending Payment" },
  approved: { bg: "#dcfce7", color: "#166534", label: "Approved" },
  scheduled: { bg: "#dbeafe", color: "#1e40af", label: "Scheduled" },
  completed: { bg: "#dbeafe", color: "#1e40af", label: "Completed" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
  rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  failed: { bg: "#fee2e2", color: "#991b1b", label: "Failed" },
  expired: { bg: "#fee2e2", color: "#991b1b", label: "Expired" }
};

const UPCOMING_STATUSES = ["confirmed", "accepted", "pending", "pending_payment", "approved", "scheduled", "upcoming"];
const COMPLETED_STATUSES = ["completed", "done"];
const CANCELLED_STATUSES = ["cancelled", "rejected", "failed", "expired"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toMinutes12h = (timeLabel = "") => {
  const m = String(timeLabel).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3].toUpperCase();
  if (h === 12) h = 0;
  if (ampm === "PM") h += 12;
  return h * 60 + min;
};

const slotContainsTime = (slot, timeLabel) => {
  const mins = toMinutes12h(timeLabel);
  if (mins == null) return false;
  const [sh, sm] = String(slot?.start || "").split(":").map(Number);
  const [eh, em] = String(slot?.end || "").split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return false;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return mins >= start && mins < end;
};

export default function PatientAppointmentsPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Reschedule form state
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleAvailableTimes, setRescheduleAvailableTimes] = useState([]);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);

  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "01:00 PM", "02:00 PM",
    "03:00 PM", "04:00 PM", "05:00 PM"
  ];

  useEffect(() => {
    fetchAppointments();
  }, [authHeaders]);

  const fetchAppointments = async () => {
    try {
      // Prefer appointment-service source used by current booking flow.
      // Keep /patients/appointments as graceful fallback.
      const res = await api.get("/appointments/my", authHeaders).catch(() =>
        api.get("/patients/appointments", authHeaders)
      );
      const apps = res.data?.appointments || [];
      const enhanced = apps.map((app) => ({
        ...app,
        doctorImage: app.doctorImage || "/doctor-placeholder.svg",
        specialty: app.specialty || app.specialization || "",
        consultationFee: app.consultationFee || 0
      }));
      setAppointments(enhanced);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(app => {
    const status = String(app.status || "").toLowerCase();
    if (activeTab === "upcoming") return UPCOMING_STATUSES.includes(status);
    if (activeTab === "completed") return COMPLETED_STATUSES.includes(status);
    if (activeTab === "cancelled") return CANCELLED_STATUSES.includes(status);
    return true;
  });

  const handleCancel = async () => {
    if (!selectedAppointment) return;
    setActionLoading(true);
    try {
      await api.patch(`/appointments/${selectedAppointment._id}/cancel`, {}, authHeaders);
      setMessage("Appointment cancelled successfully");
      setAppointments(prev => prev.map(app => 
        app._id === selectedAppointment._id ? { ...app, status: "cancelled" } : app
      ));
      setTimeout(() => {
        setShowCancelModal(false);
        setSelectedAppointment(null);
        setMessage("");
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to cancel appointment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!selectedAppointment || !newDate || !newTime) return;
    if (!rescheduleAvailableTimes.includes(newTime)) {
      setMessage("Selected time is not available for this doctor on the selected date.");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/appointments/${selectedAppointment._id}/reschedule`, {
        date: newDate,
        time: newTime
      }, authHeaders);
      setMessage("Appointment rescheduled successfully");
      setAppointments(prev => prev.map(app => 
        app._id === selectedAppointment._id ? { ...app, date: newDate, time: newTime } : app
      ));
      setTimeout(() => {
        setShowRescheduleModal(false);
        setSelectedAppointment(null);
        setNewDate("");
        setNewTime("");
        setMessage("");
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to reschedule appointment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinCall = (appointment) => {
    navigate(`/telemedicine/${appointment._id}`);
  };

  const handleJoinVideoCall = async (appointment) => {
    try {
      const res = await api.get(
        `/telemedicine/by-appointment/${appointment._id}`,
        authHeaders
      );
      const roomId = res.data?.session?.roomId;
      if (!roomId) {
        setMessage("The doctor hasn't started the video call yet. Please wait.");
        return;
      }
      const peer = encodeURIComponent(appointment.doctorName || "Doctor");
      window.open(`/video-call?channel=${roomId}&role=patient&peer=${peer}`, "_blank");
    } catch {
      setMessage("The doctor hasn't started the video call yet. Please try again shortly.");
    }
  };

  const getStatusStyle = (status) => {
    return statusColors[String(status || "").toLowerCase()] || statusColors.pending;
  };

  useEffect(() => {
    if (!showRescheduleModal || !selectedAppointment || !newDate) {
      setRescheduleAvailableTimes([]);
      return;
    }

    let cancelled = false;
    setRescheduleSlotsLoading(true);
    setMessage("");

    Promise.all([
      api.get("/doctors/public"),
      api.get(`/appointments/public/doctor/${encodeURIComponent(selectedAppointment.doctorId)}/occupied`, {
        params: { date: newDate },
      }).catch(() => ({ data: { occupiedTimes: [] } })),
      api.get("/payments/doctor-occupied", {
        params: { doctorUserId: selectedAppointment.doctorId, date: newDate },
      }).catch(() => ({ data: { occupiedTimes: [] } })),
    ])
      .then(([docsRes, occupiedRes, pendingRes]) => {
        if (cancelled) return;

        const doctors = Array.isArray(docsRes.data?.doctors) ? docsRes.data.doctors : [];
        const doctor = doctors.find((d) => d.userId === selectedAppointment.doctorId);
        if (!doctor) {
          setRescheduleAvailableTimes([]);
          setMessage("Doctor availability not found.");
          return;
        }

        const dateObj = new Date(`${newDate}T12:00:00`);
        if (Number.isNaN(dateObj.getTime())) {
          setRescheduleAvailableTimes([]);
          return;
        }

        const dayName = DAY_NAMES[dateObj.getDay()];
        const dayAvailability = (doctor.availability || []).find((a) => a.day === dayName);
        if (!dayAvailability?.slots?.length) {
          setRescheduleAvailableTimes([]);
          setMessage(`Doctor is not available on ${dayName}.`);
          return;
        }

        const occupiedApt = Array.isArray(occupiedRes.data?.occupiedTimes) ? occupiedRes.data.occupiedTimes : [];
        const occupiedPending = Array.isArray(pendingRes.data?.occupiedTimes) ? pendingRes.data.occupiedTimes : [];
        const blocked = new Set(
          [...occupiedApt, ...occupiedPending].map((t) => String(t || "").trim().toUpperCase())
        );

        // Allow keeping the current same slot when date/time is unchanged.
        if (newDate === selectedAppointment.date && selectedAppointment.time) {
          blocked.delete(String(selectedAppointment.time).trim().toUpperCase());
        }

        const allowed = timeSlots.filter(
          (slotLabel) =>
            dayAvailability.slots.some((slot) => slotContainsTime(slot, slotLabel)) &&
            !blocked.has(String(slotLabel).trim().toUpperCase())
        );

        setRescheduleAvailableTimes(allowed);
        if (newTime && !allowed.includes(newTime)) {
          setNewTime("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRescheduleAvailableTimes([]);
          setMessage("Failed to load available times. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setRescheduleSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showRescheduleModal, selectedAppointment, newDate]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Date TBD";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <PatientShell>
      <div className="aura-appointments-page">
        <header className="aura-appointments-header">
          <h1 className="aura-title">My Appointments</h1>
          <p className="aura-subtitle">Manage your bookings and consultations</p>
        </header>

        {/* Tabs */}
        <div className="aura-tabs">
          {tabs.map(tab => {
            const count = appointments.filter(app => {
              const status = String(app.status || "").toLowerCase();
              if (tab.id === "upcoming") return UPCOMING_STATUSES.includes(status);
              if (tab.id === "completed") return COMPLETED_STATUSES.includes(status);
              if (tab.id === "cancelled") return CANCELLED_STATUSES.includes(status);
              return false;
            }).length;
            
            return (
              <button
                key={tab.id}
                className={`aura-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tabIcons[tab.icon]}
                <span>{tab.label}</span>
                <span className="aura-tab-count">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Appointments List */}
        <div className="aura-appointments-content">
          {loading ? (
            <div className="aura-loading">
              <div className="aura-spinner"></div>
              <p>Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="aura-empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h3 style={{ marginBottom: '12px' }}>No {activeTab} appointments</h3>
              <p style={{ marginBottom: '24px' }}>{activeTab === "upcoming" ? "Book a new appointment to get started" : "Your appointments will appear here"}</p>
              {activeTab === "upcoming" && (
                <Link to="/patient/doctors" className="aura-btn-primary" style={{ marginTop: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Book Appointment
                </Link>
              )}
            </div>
          ) : (
            <div className="aura-appointments-list">
              {filteredAppointments.map(appointment => {
                const statusStyle = getStatusStyle(appointment.status);
                const isUpcoming = UPCOMING_STATUSES.includes(String(appointment.status || "").toLowerCase());
                
                const isOnline = String(appointment.appointmentType || "").toLowerCase() === "online";
                const isAcceptedOrConfirmed = ["accepted", "confirmed"].includes(String(appointment.status || "").toLowerCase());

                return (
                  <div key={appointment._id} className="aura-appointment-card">
                    <div className="aura-appointment-doctor">
                      <img src={appointment.doctorImage} alt={appointment.doctorName} />
                      <div className="aura-appointment-doctor-info">
                        <h4>{appointment.doctorName || "Doctor"}</h4>
                        <p>{appointment.specialty}</p>
                        {/* Appointment type pill */}
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "4px",
                            padding: "2px 10px",
                            borderRadius: "999px",
                            fontSize: "10px",
                            fontWeight: 800,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            ...(isOnline
                              ? { background: "rgba(124,58,237,0.1)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.2)" }
                              : { background: "rgba(0,106,97,0.08)", color: "#006a61", border: "1px solid rgba(0,106,97,0.15)" }),
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "11px", fontVariationSettings: "'FILL' 1" }}>
                            {isOnline ? "videocam" : "local_hospital"}
                          </span>
                          {isOnline ? "Online" : "In-Person"}
                        </span>
                      </div>
                    </div>

                    <div className="aura-appointment-details">
                      <div className="aura-appointment-datetime">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>{formatDate(appointment.date)}</span>
                      </div>
                      <div className="aura-appointment-datetime">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{appointment.time || "Time TBD"}</span>
                      </div>
                      <div className="aura-appointment-fee">
                        <span>LKR {appointment.consultationFee?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="aura-appointment-status">
                      <span
                        className="aura-status-badge"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>

                    <div className="aura-appointment-actions">
                      {/* ── Online + accepted → Join Video Call via Agora ── */}
                      {isUpcoming && isOnline && isAcceptedOrConfirmed && (
                        <button
                          className="aura-btn-join"
                          onClick={() => handleJoinVideoCall(appointment)}
                          style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "17px", fontVariationSettings: "'FILL' 1" }}>videocam</span>
                          Join Video Call
                        </button>
                      )}

                      {/* ── Physical + confirmed → legacy join flow ── */}
                      {isUpcoming && !isOnline && appointment.status === "confirmed" && (
                        <button
                          className="aura-btn-join"
                          onClick={() => handleJoinCall(appointment)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3"/>
                          </svg>
                          Join Call
                        </button>
                      )}
                      
                      {isUpcoming && (
                        <>
                          <button 
                            className="aura-btn-reschedule"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowRescheduleModal(true);
                              setNewDate(appointment.date);
                              setNewTime(appointment.time);
                              setMessage("");
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                            Reschedule
                          </button>
                          
                          <button 
                            className="aura-btn-cancel"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowCancelModal(true);
                            }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="aura-modal-overlay" onClick={() => setShowCancelModal(false)}>
            <div className="aura-modal aura-modal-small" onClick={e => e.stopPropagation()}>
              <div className="aura-modal-header-center">
                <div className="aura-warning-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <h3>Cancel Appointment</h3>
                <p>Are you sure you want to cancel your appointment with {selectedAppointment.doctorName}?</p>
              </div>

              {message && (
                <div className={`aura-alert ${message.includes("success") ? "success" : "error"}`}>
                  {message}
                </div>
              )}

              <div className="aura-modal-actions">
                <button className="aura-btn-secondary" onClick={() => setShowCancelModal(false)}>
                  Keep Appointment
                </button>
                <button 
                  className="aura-btn-danger"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <div className="aura-spinner-small"></div>
                      Cancelling...
                    </>
                  ) : (
                    "Yes, Cancel"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedAppointment && (
          <div className="aura-modal-overlay" onClick={() => setShowRescheduleModal(false)}>
            <div className="aura-modal" onClick={e => e.stopPropagation()}>
              <button className="aura-modal-close" onClick={() => setShowRescheduleModal(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              <div className="aura-modal-header">
                <h3>Reschedule Appointment</h3>
                <p>with {selectedAppointment.doctorName}</p>
              </div>

              {message && (
                <div className={`aura-alert ${message.includes("success") ? "success" : "error"}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleReschedule} className="aura-booking-form">
                <div className="aura-form-row">
                  <div className="aura-form-group">
                    <label>New Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="aura-form-group">
                    <label>New Time *</label>
                    <select 
                      required
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      disabled={!newDate || rescheduleSlotsLoading || rescheduleAvailableTimes.length === 0}
                    >
                      <option value="">
                        {rescheduleSlotsLoading ? "Loading available times..." : "Select time"}
                      </option>
                      {rescheduleAvailableTimes.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                    {!rescheduleSlotsLoading && newDate && (
                      <small style={{ color: "#6b7280", marginTop: 6, display: "block" }}>
                        {rescheduleAvailableTimes.length > 0
                          ? `${rescheduleAvailableTimes.length} available slot(s) on selected date`
                          : "No available slots on selected date"}
                      </small>
                    )}
                  </div>
                </div>

                <div className="aura-modal-actions">
                  <button type="button" className="aura-btn-secondary" onClick={() => setShowRescheduleModal(false)}>
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="aura-btn-confirm"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <div className="aura-spinner-small"></div>
                        Rescheduling...
                      </>
                    ) : (
                      "Confirm Reschedule"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PatientShell>
  );
}
