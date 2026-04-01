import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = {
  upcoming: { bg: "#f0fdfa", color: "#0d9488", label: "Upcoming" },
  completed: { bg: "#eff6ff", color: "#2563eb", label: "Completed" },
  cancelled: { bg: "#fef2f2", color: "#dc2626", label: "Cancelled" },
  pending: { bg: "#fefce8", color: "#ca8a04", label: "Pending" },
};

export default function AppointmentHistoryPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadAppointments();
  }, [authHeaders]);

  const loadAppointments = async () => {
    try {
      const res = await api.get("/patients/appointments", authHeaders);
      setAppointments(res.data.appointments || []);
    } catch {
      setAppointments([]);
    }
  };

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    
    if (activeTab !== "all") {
      filtered = filtered.filter(a => a.status === activeTab);
    }
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(a => 
        (a.doctorName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.specialty || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort by date (upcoming first for upcoming tab, most recent for others)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return activeTab === "upcoming" ? dateA - dateB : dateB - dateA;
    });
  }, [appointments, activeTab, searchQuery]);

  const stats = useMemo(() => ({
    all: appointments.length,
    upcoming: appointments.filter(a => a.status === "upcoming").length,
    completed: appointments.filter(a => a.status === "completed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
  }), [appointments]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Date TBA";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      weekday: "short", 
      day: "numeric", 
      month: "short",
      year: "numeric"
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "Time TBA";
    return timeStr;
  };

  const getStatusStyle = (status) => {
    return STATUS_COLORS[status] || STATUS_COLORS.pending;
  };

  const cancelAppointment = async (id) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.put(`/patients/appointments/${id}/cancel`, {}, authHeaders);
      setMessage("Appointment cancelled successfully");
      loadAppointments();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to cancel appointment");
    }
  };

  return (
    <PatientShell>
      <div className="appointments-page">
        {message && (
          <div className={`message-toast ${message.includes("success") ? "success" : "error"}`}>
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div className="appointments-stats">
          <div className="stat-card">
            <div className="stat-icon purple">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.upcoming}</span>
              <span className="stat-label">Upcoming</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.completed}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon red">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.cancelled}</span>
              <span className="stat-label">Cancelled</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.all}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="appointments-toolbar">
          <div className="appointments-tabs">
            <button 
              className={`tab ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Appointments
            </button>
            <button 
              className={`tab ${activeTab === "upcoming" ? "active" : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming
            </button>
            <button 
              className={`tab ${activeTab === "completed" ? "active" : ""}`}
              onClick={() => setActiveTab("completed")}
            >
              Completed
            </button>
            <button 
              className={`tab ${activeTab === "cancelled" ? "active" : ""}`}
              onClick={() => setActiveTab("cancelled")}
            >
              Cancelled
            </button>
          </div>
          
          <div className="search-appointments">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search by doctor or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Book New Appointment CTA */}
        <div className="book-appointment-cta">
          <div className="cta-content">
            <div className="cta-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="cta-text">
              <h4>Need to see a doctor?</h4>
              <p>Book a new appointment with our experienced healthcare providers</p>
            </div>
          </div>
          <Link to="/doctors" className="book-cta-btn">
            Book Appointment
          </Link>
        </div>

        {/* Appointments List */}
        <div className="appointments-list">
          {filteredAppointments.length === 0 ? (
            <div className="no-appointments">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h4>No appointments found</h4>
              <p>{searchQuery ? "Try adjusting your search" : "Book your first appointment to get started"}</p>
              {!searchQuery && (
                <Link to="/doctors" className="book-btn-large">
                  Book Appointment
                </Link>
              )}
            </div>
          ) : (
            filteredAppointments.map((appointment) => {
              const statusStyle = getStatusStyle(appointment.status);
              return (
                <div className="appointment-card" key={appointment._id || appointment.date}>
                  <div className="appointment-date">
                    <span className="date-day">{new Date(appointment.date).getDate()}</span>
                    <span className="date-month">{new Date(appointment.date).toLocaleDateString("en-US", { month: "short" })}</span>
                  </div>
                  
                  <div className="appointment-details">
                    <div className="appointment-header">
                      <div className="doctor-info">
                        <div className="doctor-avatar">
                          <img 
                            src={appointment.doctorAvatar || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=150&q=80"} 
                            alt={appointment.doctorName}
                          />
                        </div>
                        <div className="doctor-text">
                          <h4>Dr. {appointment.doctorName || "Doctor"}</h4>
                          <span className="specialty">{appointment.specialty || "General Medicine"}</span>
                        </div>
                      </div>
                      <span 
                        className="status-badge"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    
                    <div className="appointment-meta">
                      <div className="meta-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>{formatTime(appointment.time)}</span>
                      </div>
                      <div className="meta-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{appointment.location || "MediFlow Clinic"}</span>
                      </div>
                      {appointment.type && (
                        <div className="meta-item">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          <span>{appointment.type}</span>
                        </div>
                      )}
                    </div>
                    
                    {appointment.notes && (
                      <div className="appointment-notes">
                        <p>{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="appointment-actions">
                    {appointment.status === "upcoming" && (
                      <>
                        <button 
                          className="action-btn primary"
                          onClick={() => window.open(`/telemedicine/${appointment._id}`, "_blank")}
                        >
                          Join Call
                        </button>
                        <button 
                          className="action-btn secondary"
                          onClick={() => cancelAppointment(appointment._id)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {appointment.status === "completed" && (
                      <button className="action-btn secondary">
                        View Details
                      </button>
                    )}
                    {appointment.status === "cancelled" && (
                      <button className="action-btn secondary" disabled>
                        Cancelled
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </PatientShell>
  );
}
