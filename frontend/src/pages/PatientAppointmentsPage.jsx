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
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  completed: { bg: "#dbeafe", color: "#1e40af", label: "Completed" },
  cancelled: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" }
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

  const timeSlots = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM",
    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
  ];

  useEffect(() => {
    fetchAppointments();
  }, [authHeaders]);

  const fetchAppointments = async () => {
    try {
      const res = await api.get("/patients/appointments", authHeaders);
      const apps = res.data.appointments || [];
      // Enhance with mock data for demo
      const enhanced = apps.map((app, idx) => ({
        ...app,
        status: app.status || ["confirmed", "pending", "completed", "cancelled"][idx % 4],
        doctorImage: app.doctorImage || `https://images.unsplash.com/photo-${[
          "1612349317150-e413f6a5b16d",
          "1559839734-2b71ea197ec2",
          "1594824476967-48c8b964273f"
        ][idx % 3]}?auto=format&fit=crop&w=150&q=80`,
        specialty: app.specialty || app.specialization || ["Cardiology", "Dermatology", "Neurology", "General"][idx % 4],
        consultationFee: app.consultationFee || [1500, 2500, 3500][idx % 3]
      }));
      setAppointments(enhanced);
    } catch (err) {
      console.error("Failed to fetch appointments", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(app => {
    if (activeTab === "upcoming") return ["confirmed", "pending", "scheduled", "upcoming"].includes(app.status);
    if (activeTab === "completed") return app.status === "completed" || app.status === "done";
    if (activeTab === "cancelled") return app.status === "cancelled";
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

  const getStatusStyle = (status) => {
    return statusColors[status] || statusColors.pending;
  };

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
              if (tab.id === "upcoming") return ["confirmed", "pending", "scheduled", "upcoming"].includes(app.status);
              if (tab.id === "completed") return app.status === "completed" || app.status === "done";
              if (tab.id === "cancelled") return app.status === "cancelled";
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
              <h3>No {activeTab} appointments</h3>
              <p>{activeTab === "upcoming" ? "Book a new appointment to get started" : "Your appointments will appear here"}</p>
              {activeTab === "upcoming" && (
                <Link to="/doctors" className="aura-btn-primary">
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
                const isUpcoming = ["confirmed", "pending", "scheduled", "upcoming"].includes(appointment.status);
                
                return (
                  <div key={appointment._id} className="aura-appointment-card">
                    <div className="aura-appointment-doctor">
                      <img src={appointment.doctorImage} alt={appointment.doctorName} />
                      <div className="aura-appointment-doctor-info">
                        <h4>{appointment.doctorName || "Doctor"}</h4>
                        <p>{appointment.specialty}</p>
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
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
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
                      {isUpcoming && appointment.status === "confirmed" && (
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
                    >
                      <option value="">Select time</option>
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
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
