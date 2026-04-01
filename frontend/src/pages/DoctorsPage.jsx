import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const specialties = [
  "All",
  "Cardiologist",
  "Dermatologist", 
  "Neurologist",
  "Orthopedist",
  "Pediatrician",
  "General Practitioner",
  "Psychiatrist",
  "Gynecologist"
];

const availabilityOptions = [
  { value: "all", label: "Any Time" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This Week" }
];

const priceRanges = [
  { value: "all", label: "Any Price" },
  { value: "low", label: "LKR 0 - 2,000" },
  { value: "medium", label: "LKR 2,000 - 5,000" },
  { value: "high", label: "LKR 5,000+" }
];

const timeSlots = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM"
];

export default function DoctorsPage() {
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  
  // Data states
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating"); // rating, price_low, price_high
  
  // Booking states
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Fetch doctors
  useEffect(() => {
    api.get("/doctors/public")
      .then((res) => {
        const docs = res.data.doctors || [];
        // Add mock data for demo
        const enhancedDocs = docs.map((doc, idx) => ({
          ...doc,
          rating: (4 + Math.random()).toFixed(1),
          reviewCount: Math.floor(Math.random() * 100) + 10,
          consultationFee: doc.consultationFee || [1500, 2500, 3500, 4500][idx % 4],
          image: doc.image || `https://images.unsplash.com/photo-${[
            "1612349317150-e413f6a5b16d",
            "1559839734-2b71ea197ec2",
            "1594824476967-48c8b964273f",
            "1622253692010-333f2da6031d"
          ][idx % 4]}?auto=format&fit=crop&w=300&q=80`,
          availableSlots: timeSlots.slice(0, 4 + (idx % 4))
        }));
        setDoctors(enhancedDocs);
        setFilteredDoctors(enhancedDocs);
      })
      .catch((err) => console.error("Failed to fetch doctors", err))
      .finally(() => setLoading(false));
  }, []);

  // Filter logic
  useEffect(() => {
    let filtered = [...doctors];
    
    // Search by name
    if (searchQuery) {
      filtered = filtered.filter(d => 
        d.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by specialty
    if (selectedSpecialty !== "All") {
      filtered = filtered.filter(d => 
        d.specialization?.toLowerCase().includes(selectedSpecialty.toLowerCase())
      );
    }
    
    // Filter by price range
    if (selectedPriceRange !== "all") {
      filtered = filtered.filter(d => {
        const fee = d.consultationFee || 0;
        if (selectedPriceRange === "low") return fee <= 2000;
        if (selectedPriceRange === "medium") return fee > 2000 && fee <= 5000;
        if (selectedPriceRange === "high") return fee > 5000;
        return true;
      });
    }
    
    // Filter by rating
    if (minRating > 0) {
      filtered = filtered.filter(d => parseFloat(d.rating || 0) >= minRating);
    }
    
    // Sort
    if (sortBy === "rating") {
      filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (sortBy === "price_low") {
      filtered.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
    } else if (sortBy === "price_high") {
      filtered.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));
    }
    
    setFilteredDoctors(filtered);
  }, [searchQuery, selectedSpecialty, selectedPriceRange, minRating, sortBy, doctors]);

  const handleBookClick = (doctor) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role === "doctor") {
      alert("Doctors cannot book appointments as patients.");
      return;
    }
    setSelectedDoctor(doctor);
    setBookingMsg("");
    setSelectedDate("");
    setSelectedTime("");
    setReason("");
  };

  const handleViewProfile = (doctor) => {
    navigate(`/doctors/${doctor._id}`);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      setBookingMsg("Please select both date and time slot");
      return;
    }
    
    setIsBooking(true);
    setBookingMsg("");

    try {
      await api.post("/appointments", {
        doctorId: selectedDoctor.userId,
        doctorName: selectedDoctor.fullName,
        specialization: selectedDoctor.specialization,
        date: selectedDate,
        time: selectedTime,
        reason
      }, authHeaders);

      setBookingMsg("Appointment booked successfully!");
      setTimeout(() => {
        setSelectedDoctor(null);
        setSelectedDate("");
        setSelectedTime("");
      }, 2000);
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
        <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= Math.floor(rating) ? "#fbbf24" : "none"} stroke="#fbbf24" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      );
    }
    return stars;
  };

  return (
    <div className="aura-booking-page">
      {/* Header */}
      <header className="aura-booking-header">
        <div className="aura-booking-header-content">
          <div>
            <h1 className="aura-booking-title">Find a Doctor</h1>
            <p className="aura-booking-subtitle">Book appointments with top specialists</p>
          </div>
          <Link to={user ? `/${user.role}/dashboard` : "/"} className="aura-btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {user ? "Dashboard" : "Home"}
          </Link>
        </div>
      </header>

      <main className="aura-booking-main">
        {/* Search & Filters */}
        <section className="aura-filters-section">
          {/* Search Bar */}
          <div className="aura-search-bar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search by doctor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Row */}
          <div className="aura-filters-row">
            <div className="aura-filter-group">
              <label>Specialty</label>
              <select value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
                {specialties.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="aura-filter-group">
              <label>Availability</label>
              <select value={selectedAvailability} onChange={(e) => setSelectedAvailability(e.target.value)}>
                {availabilityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="aura-filter-group">
              <label>Price Range</label>
              <select value={selectedPriceRange} onChange={(e) => setSelectedPriceRange(e.target.value)}>
                {priceRanges.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="aura-filter-group">
              <label>Min Rating: {minRating > 0 ? `${minRating}+ Stars` : "Any"}</label>
              <input 
                type="range" 
                min="0" max="5" step="1" 
                value={minRating}
                onChange={(e) => setMinRating(parseInt(e.target.value))}
                className="aura-rating-slider"
              />
            </div>
          </div>
        </section>

        {/* Results Count with Sort */}
        <div className="aura-results-bar">
          <div className="aura-results-count">
            <span>{filteredDoctors.length} doctors found</span>
            {(searchQuery || selectedSpecialty !== "All" || selectedPriceRange !== "all" || minRating > 0) && (
              <button 
                className="aura-clear-filters"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSpecialty("All");
                  setSelectedAvailability("all");
                  setSelectedPriceRange("all");
                  setMinRating(0);
                  setSortBy("rating");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
          
          <div className="aura-sort-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rating">Highest Rated</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Doctors Grid */}
        {loading ? (
          <div className="aura-loading">
            <div className="aura-spinner"></div>
            <p>Loading doctors...</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="aura-empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            <h3>No doctors found</h3>
            <p>Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="aura-doctors-grid">
            {filteredDoctors.map((doctor) => (
              <article key={doctor._id} className="aura-doctor-card">
                <div className="aura-doctor-image">
                  <img src={doctor.image} alt={doctor.fullName} />
                  <span className="aura-doctor-status online">Available</span>
                </div>
                
                <div className="aura-doctor-info">
                  <h3 className="aura-doctor-name">{doctor.fullName}</h3>
                  <p className="aura-doctor-specialty">{doctor.specialization || "General Practitioner"}</p>
                  
                  <div className="aura-doctor-rating">
                    <div className="aura-stars">{renderStars(doctor.rating)}</div>
                    <span className="aura-rating-value">{doctor.rating}</span>
                    <span className="aura-review-count">({doctor.reviewCount} reviews)</span>
                  </div>
                  
                  <div className="aura-doctor-fee">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <span>LKR {doctor.consultationFee?.toLocaleString()}</span>
                  </div>

                  {doctor.qualifications?.length > 0 && (
                    <p className="aura-doctor-qualifications">
                      {doctor.qualifications.slice(0, 2).join(", ")}
                    </p>
                  )}

                  {/* Available Time Slots */}
                  <div className="aura-timeslots">
                    <label>Available Today:</label>
                    <div className="aura-timeslot-list">
                      {doctor.availableSlots?.slice(0, 4).map((slot) => (
                        <span key={slot} className="aura-timeslot">{slot}</span>
                      ))}
                      {doctor.availableSlots?.length > 4 && (
                        <span className="aura-timeslot-more">+{doctor.availableSlots.length - 4} more</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="aura-doctor-actions">
                  <button 
                    className="aura-btn-view"
                    onClick={() => handleViewProfile(doctor)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    View Profile
                  </button>
                  <button 
                    className="aura-btn-book"
                    onClick={() => handleBookClick(doctor)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Book Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {selectedDoctor && !showProfileModal && (
        <div className="aura-modal-overlay" onClick={() => setSelectedDoctor(null)}>
          <div className="aura-modal" onClick={(e) => e.stopPropagation()}>
            <button className="aura-modal-close" onClick={() => setSelectedDoctor(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="aura-modal-header">
              <img src={selectedDoctor.image} alt={selectedDoctor.fullName} className="aura-modal-doctor-img" />
              <div>
                <h3>Book Appointment</h3>
                <p>with {selectedDoctor.fullName}</p>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  <span>LKR {selectedDoctor.consultationFee?.toLocaleString()}</span>
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
                disabled={isBooking || bookingMsg.includes("success")}
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

      {/* Profile Modal */}
      {selectedDoctor && showProfileModal && (
        <div className="aura-modal-overlay" onClick={() => { setSelectedDoctor(null); setShowProfileModal(false); }}>
          <div className="aura-modal aura-modal-large" onClick={(e) => e.stopPropagation()}>
            <button 
              className="aura-modal-close" 
              onClick={() => { setSelectedDoctor(null); setShowProfileModal(false); }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="aura-profile-header">
              <img src={selectedDoctor.image} alt={selectedDoctor.fullName} />
              <div className="aura-profile-info">
                <h2>{selectedDoctor.fullName}</h2>
                <p className="aura-profile-specialty">{selectedDoctor.specialization || "General Practitioner"}</p>
                <div className="aura-profile-rating">
                  <div className="aura-stars">{renderStars(selectedDoctor.rating)}</div>
                  <span>{selectedDoctor.rating}</span>
                  <span>({selectedDoctor.reviewCount} reviews)</span>
                </div>
                <div className="aura-profile-fee">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  LKR {selectedDoctor.consultationFee?.toLocaleString()} per session
                </div>
              </div>
            </div>

            <div className="aura-profile-details">
              {selectedDoctor.qualifications?.length > 0 && (
                <div className="aura-profile-section">
                  <h4>Qualifications</h4>
                  <ul>
                    {selectedDoctor.qualifications.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="aura-profile-section">
                <h4>Available Time Slots</h4>
                <div className="aura-profile-slots">
                  {timeSlots.map(slot => (
                    <span key={slot} className="aura-profile-slot">{slot}</span>
                  ))}
                </div>
              </div>

              <div className="aura-profile-actions">
                <button 
                  className="aura-btn-book"
                  onClick={() => {
                    setShowProfileModal(false);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  Book Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
