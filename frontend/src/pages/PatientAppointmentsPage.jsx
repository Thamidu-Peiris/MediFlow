import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";
import { firePaymentSuccessConfetti } from "../utils/paymentConfetti";

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
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentSuccessBanner, setPaymentSuccessBanner] = useState("");

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

  useEffect(() => {
    if (!location.state?.paymentJustSucceeded) return;
    firePaymentSuccessConfetti();
    setPaymentSuccessBanner(
      "Payment successful! Your appointment has been booked — see it under Upcoming."
    );
    setActiveTab("upcoming");
    const dismissTimer = window.setTimeout(() => setPaymentSuccessBanner(""), 10000);
    navigate(".", { replace: true, state: {} });
    return () => window.clearTimeout(dismissTimer);
  }, [location.state, navigate]);

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
      const res = await api.patch(`/appointments/${selectedAppointment._id}/cancel`, {}, authHeaders);
      const refund = res.data?.refund;

      let msg = "Appointment cancelled successfully.";
      if (refund?.refunded && refund.method === "stripe") {
        msg = `Appointment cancelled. A full refund of ${refund.currency} ${Number(refund.amount).toLocaleString()} has been issued to your payment method.`;
      } else if (refund?.method === "payhere" && refund.reason === "manual_required") {
        msg = `Appointment cancelled. Your PayHere/Helakuru payment of ${refund.currency} ${Number(refund.amount).toLocaleString()} will be refunded manually — please contact support.`;
      }

      setMessage(msg);
      setAppointments(prev => prev.map(app =>
        app._id === selectedAppointment._id ? { ...app, status: "cancelled" } : app
      ));
      setTimeout(() => {
        setShowCancelModal(false);
        setSelectedAppointment(null);
        setMessage("");
      }, 4000);
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
        // excludeId tells the backend to omit the appointment being rescheduled
        // so the patient's own slot is never blocked during reschedule.
        params: { date: newDate, excludeId: selectedAppointment._id },
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
      <div className="at-appointments-page">
        {/* Hero Header Section */}
        <header className="at-hero-header">
          <h1 className="at-hero-title">My Appointments</h1>
          <p className="at-hero-lead">
            Manage your upcoming clinical sessions, review past diagnoses, and coordinate your wellness journey through our dedicated atelier.
          </p>
        </header>

        {paymentSuccessBanner && (
          <div className="aura-alert success" style={{ marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderRadius: "16px", backgroundColor: "#dcfce7", border: "1px solid #b9f6ca" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span className="material-symbols-outlined" style={{ color: "#166534", fontVariationSettings: "'FILL' 1" }}>verified</span>
              <span style={{ color: "#166534", fontWeight: "600", fontSize: "14px" }}>{paymentSuccessBanner}</span>
            </div>
            <button onClick={() => setPaymentSuccessBanner("")} style={{ background: "white", color: "#166534", border: "none", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>Dismiss</button>
          </div>
        )}

        {/* Navigation Filters */}
        <section className="at-filter-section">
          <div className="at-tabs-container">
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
                  className={`at-tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span className="at-tab-count">{count}</span>
                </button>
              );
            })}
          </div>
          
          <div className="at-advanced-filter">
            <span className="material-symbols-outlined">filter_list</span>
            <span>Advanced Filter</span>
          </div>
        </section>

        {/* Appointments List */}
        <div className="at-appointments-content">
          {loading ? (
            <div className="aura-loading" style={{ padding: "100px 0", textAlign: "center" }}>
              <div className="aura-spinner" style={{ margin: "0 auto 20px" }}></div>
              <p style={{ color: "#64748b", fontWeight: "600" }}>Loading your schedule...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="aura-empty-state">
              <div style={{ width: "80px", height: "80px", background: "#f1f5f9", borderRadius: "24px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px", margin: "0 auto 24px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#94a3b8" }}>event_busy</span>
              </div>
              <h3>No {activeTab} appointments</h3>
              <p>You don't have any appointments in this category at the moment.</p>
              {activeTab === "upcoming" && (
                <Link to="/patient/doctors" className="at-btn-join" style={{ marginTop: "24px", textDecoration: "none", padding: "12px 24px" }}>
                  Book an Appointment
                </Link>
              )}
            </div>
          ) : (
            <div className="at-appointments-grid">
              {filteredAppointments.map(appointment => {
                const isUpcoming = UPCOMING_STATUSES.includes(String(appointment.status || "").toLowerCase());
                const isOnline = String(appointment.appointmentType || "").toLowerCase() === "online";
                const isAcceptedOrConfirmed = ["accepted", "confirmed"].includes(String(appointment.status || "").toLowerCase());

                return (
                  <div key={appointment._id} className="at-card-premium">
                    <div className="at-card-left">
                      <div className="at-doc-avatar-wrap">
                        <img 
                          src={appointment.doctorImage || "https://via.placeholder.com/150"} 
                          alt={appointment.doctorName} 
                          className="at-doc-img"
                        />
                        <div className="at-type-indicator">
                          <span className="material-symbols-outlined" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}>
                            {isOnline ? "videocam" : "location_on"}
                          </span>
                        </div>
                      </div>

                      <div className="at-doc-info">
                        <div className="at-name-row">
                          <h3 className="at-doc-name">{appointment.doctorName || "Doctor"}</h3>
                          <span className="at-status-pill">{appointment.status}</span>
                        </div>
                        <p className="at-specialty">{appointment.specialty}</p>
                        
                        <div className="at-meta-row">
                          <div className="at-meta-item">
                            <span className="material-symbols-outlined">calendar_today</span>
                            <span>{formatDate(appointment.date)}</span>
                          </div>
                          <div className="at-meta-item">
                            <span className="material-symbols-outlined">schedule</span>
                            <span>{appointment.time || "Time TBD"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="at-card-actions">
                      {isUpcoming && isOnline && isAcceptedOrConfirmed && (
                        <button
                          className="at-btn-join"
                          onClick={() => handleJoinVideoCall(appointment)}
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                          Join Video Call
                        </button>
                      )}
                      
                      {isUpcoming && !isOnline && appointment.status === "confirmed" && (
                        <button
                          className="at-btn-join"
                          onClick={() => handleJoinCall(appointment)}
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
                          Join Call
                        </button>
                      )}

                      {isUpcoming && (
                        <div className="at-bottom-actions">
                          <button 
                            className="at-btn-reschedule"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowRescheduleModal(true);
                              setNewDate(appointment.date);
                              setNewTime(appointment.time);
                              setMessage("");
                            }}
                          >
                            Reschedule
                          </button>
                          
                          <button 
                            className="at-btn-cancel"
                            onClick={() => {
                              setSelectedAppointment(appointment);
                              setShowCancelModal(true);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
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
          <div className="aura-modal-overlay" onClick={() => { setShowRescheduleModal(false); setMessage(""); }}>
            <div className="rs-modal" onClick={e => e.stopPropagation()}>

              {/* ── Header ── */}
              <div className="rs-modal-header">
                <div className="rs-modal-header-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                </div>
                <div>
                  <h3 className="rs-modal-title">Reschedule Appointment</h3>
                  <p className="rs-modal-sub">Pick a new date &amp; time for your visit</p>
                </div>
                <button className="rs-modal-close" onClick={() => { setShowRescheduleModal(false); setMessage(""); }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* ── Alert ── */}
              {message && (
                <div className={`aura-alert ${message.toLowerCase().includes("success") ? "success" : "error"}`} style={{ margin: "0 0 20px 0" }}>
                  {message}
                </div>
              )}

              {/* ── Current appointment card ── */}
              <div className="rs-current-card">
                <span className="rs-current-label">Currently booked</span>
                <div className="rs-current-row">
                  <img src={selectedAppointment.doctorImage} alt={selectedAppointment.doctorName} className="rs-doctor-avatar" />
                  <div className="rs-current-info">
                    <p className="rs-doctor-name">{selectedAppointment.doctorName || "Doctor"}</p>
                    <p className="rs-doctor-spec">{selectedAppointment.specialty || selectedAppointment.specialization}</p>
                  </div>
                  <div className="rs-current-datetime">
                    <span className="rs-current-date-val">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {formatDate(selectedAppointment.date)}
                    </span>
                    <span className="rs-current-time-val">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {selectedAppointment.time || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="rs-divider">
                <span className="rs-divider-line"/>
                <span className="rs-divider-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  Change to
                </span>
                <span className="rs-divider-line"/>
              </div>

              <form onSubmit={handleReschedule}>

                {/* ── Date picker ── */}
                <div className="rs-section">
                  <label className="rs-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Select New Date
                  </label>
                  <input
                    className="rs-date-input"
                    type="date"
                    required
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>

                {/* ── Time slots ── */}
                <div className="rs-section">
                  <label className="rs-section-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Select New Time
                    {!rescheduleSlotsLoading && newDate && rescheduleAvailableTimes.length > 0 && (
                      <span className="rs-slots-badge">{rescheduleAvailableTimes.length} available</span>
                    )}
                  </label>

                  {!newDate ? (
                    <div className="rs-slots-hint">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      Choose a date first to see available times
                    </div>
                  ) : rescheduleSlotsLoading ? (
                    <div className="rs-slots-loading">
                      <div className="rs-slots-loading-inner">
                        {[1,2,3,4,5,6].map(i => <div key={i} className="rs-slot-skeleton"/>)}
                      </div>
                    </div>
                  ) : rescheduleAvailableTimes.length === 0 ? (
                    <div className="rs-slots-empty">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      No available slots on this date
                    </div>
                  ) : (
                    <div className="rs-time-grid">
                      {rescheduleAvailableTimes.map(slot => (
                        <button
                          key={slot}
                          type="button"
                          className={`rs-time-chip ${newTime === slot ? "selected" : ""}`}
                          onClick={() => setNewTime(slot)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {slot}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Confirmation preview ── */}
                {newDate && newTime && (
                  <div className="rs-preview-card">
                    <div className="rs-preview-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div className="rs-preview-text">
                      <span className="rs-preview-heading">New appointment scheduled for</span>
                      <span className="rs-preview-value">{formatDate(newDate)} &nbsp;·&nbsp; {newTime}</span>
                    </div>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="rs-actions">
                  <button type="button" className="rs-btn-cancel" onClick={() => { setShowRescheduleModal(false); setMessage(""); }}>
                    Keep Current
                  </button>
                  <button
                    type="submit"
                    className="rs-btn-confirm"
                    disabled={actionLoading || !newDate || !newTime}
                  >
                    {actionLoading ? (
                      <>
                        <div className="aura-spinner-small" style={{ borderTopColor: "white" }}/>
                        Rescheduling…
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="20 6 9 17 4 12"/></svg>
                        Confirm Reschedule
                      </>
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
