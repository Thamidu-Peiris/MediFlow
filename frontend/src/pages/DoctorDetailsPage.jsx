import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
];


export default function DoctorDetailsPage() {
  const { id } = useParams();
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingMsg, setBookingMsg] = useState("");

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await api.get(`/doctors/public`);
        const docs = res.data.doctors || [];
        const found = docs.find(d => d._id === id || d.userId === id);
        
        if (found) {
          const availableDays = (found.availability || [])
            .filter((a) => a.slots?.length > 0)
            .map((a) => a.day.slice(0, 3));
          setDoctor({
            ...found,
            image: found.image || "/doctor-placeholder.svg",
            about: found.bio || found.about || "",
            education: found.qualifications?.length ? found.qualifications : [],
            availableDays
          });
        }
      } catch (err) {
        console.error("Failed to fetch doctor", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctor();
  }, [id]);

  const handleBookClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role === "doctor") {
      alert("Doctors cannot book appointments as patients.");
      return;
    }
    setShowBookingModal(true);
    setBookingMsg("");
    setSelectedDate("");
    setSelectedTime("");
    setReason("");
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setBookingMsg("Please select both date and time");
      return;
    }
    
    setIsBooking(true);
    setBookingMsg("");

    try {
      await api.post("/appointments", {
        doctorId: doctor.userId || id,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        date: selectedDate,
        time: selectedTime,
        reason
      }, authHeaders);

      setBookingMsg("Appointment booked successfully!");
      setTimeout(() => {
        setShowBookingModal(false);
        navigate("/patient/appointments");
      }, 1500);
    } catch (err) {
      setBookingMsg(err.response?.data?.message || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg key={i} width="20" height="20" viewBox="0 0 24 24" fill={i <= Math.floor(rating) ? "#fbbf24" : "none"} stroke="#fbbf24" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className="aura-booking-page">
        <div className="aura-loading">
          <div className="aura-spinner"></div>
          <p>Loading doctor profile...</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="aura-booking-page">
        <div className="aura-empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <h3>Doctor not found</h3>
          <p>The doctor you're looking for doesn't exist or has been removed.</p>
          <Link to="/doctors" className="aura-btn-primary">
            Back to Doctors
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="aura-booking-page">
      {/* Header */}
      <header className="aura-booking-header">
        <div className="aura-booking-header-content">
          <Link to="/doctors" className="aura-back-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Doctors
          </Link>
          <Link to={user ? `/${user.role}/dashboard` : "/"} className="aura-btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {user ? "Dashboard" : "Home"}
          </Link>
        </div>
      </header>

      <main className="aura-doctor-details-main">
        {/* Profile Card */}
        <div className="aura-doctor-profile-card">
          <div className="aura-doctor-profile-image">
            <img src={doctor.image} alt={doctor.fullName} />
          </div>
          
          <div className="aura-doctor-profile-info">
            <h1>{doctor.fullName}</h1>
            <p className="aura-doctor-profile-specialty">{doctor.specialization || "General Practitioner"}</p>
            
            {doctor.rating && (
              <div className="aura-doctor-profile-rating">
                <div className="aura-stars">{renderStars(doctor.rating)}</div>
                <span className="aura-rating-value">{doctor.rating}</span>
                {doctor.reviewCount > 0 && <span className="aura-review-count">({doctor.reviewCount} reviews)</span>}
              </div>
            )}

            <div className="aura-doctor-profile-meta">
              <div className="aura-meta-item">
                <span>LKR {(doctor.consultationFee || 0).toLocaleString()} per session</span>
              </div>
              <div className="aura-meta-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>Available: {doctor.availableDays?.join(", ")}</span>
              </div>
            </div>

            <button className="aura-btn-book aura-btn-large" onClick={handleBookClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Book Appointment
            </button>
          </div>
        </div>

        {/* Details Grid */}
        <div className="aura-doctor-details-grid">
          {/* About Section */}
          <div className="aura-details-card">
            <h3>About</h3>
            <p>{doctor.about}</p>
          </div>

          {/* Education Section */}
          <div className="aura-details-card">
            <h3>Education & Qualifications</h3>
            <ul className="aura-qualifications-list">
              {doctor.education?.map((edu, idx) => (
                <li key={idx}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  {edu}
                </li>
              ))}
            </ul>
          </div>

          {/* Available Slots Section */}
          <div className="aura-details-card">
            <h3>Available Time Slots</h3>
            <div className="aura-slots-grid">
              {timeSlots.map(slot => (
                <span key={slot} className="aura-slot-item">{slot}</span>
              ))}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="aura-details-card aura-reviews-card">
            <h3>Patient Reviews</h3>
            <div className="aura-reviews-list">
              <p style={{ color: "#9ca3af", fontStyle: "italic" }}>No reviews yet.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="aura-modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="aura-modal" onClick={(e) => e.stopPropagation()}>
            <button className="aura-modal-close" onClick={() => setShowBookingModal(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="aura-modal-header">
              <img src={doctor.image} alt={doctor.fullName} className="aura-modal-doctor-img" />
              <div>
                <h3>Book Appointment</h3>
                <p>with {doctor.fullName}</p>
              </div>
            </div>

            {bookingMsg && (
              <div className={`aura-alert ${bookingMsg.includes("success") ? "success" : "error"}`}>
                {bookingMsg}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="aura-booking-form">
              <div className="aura-form-group">
                <label>Consultation Fee</label>
                <div className="aura-fee-display">
                  <span>LKR {(doctor.consultationFee || 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="aura-form-row">
                <div className="aura-form-group">
                  <label>Select Date *</label>
                  <input 
                    type="date" 
                    required 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="aura-form-group">
                  <label>Select Time *</label>
                  <select 
                    required
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                  >
                    <option value="">Choose a slot</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="aura-form-group">
                <label>Reason for Visit</label>
                <textarea 
                  rows="3" 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe your symptoms or reason for visit..."
                />
              </div>

              <button
                type="submit"
                disabled={isBooking}
                className="aura-btn-confirm"
              >
                {isBooking ? (
                  <>
                    <div className="aura-spinner-small"></div>
                    Booking...
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Confirm Booking
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
