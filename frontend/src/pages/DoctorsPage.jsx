import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function DoctorsPage() {
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Booking Form State
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    api.get("/doctors/public")
      .then((res) => setDoctors(res.data.doctors || []))
      .catch((err) => console.error("Failed to fetch doctors", err))
      .finally(() => setLoading(false));
  }, []);

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
    setDate("");
    setTime("");
    setReason("");
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingMsg("");

    try {
      await api.post("/appointments", {
        doctorId: selectedDoctor.userId,
        doctorName: selectedDoctor.fullName,
        specialization: selectedDoctor.specialization,
        date,
        time,
        reason
      }, authHeaders);

      setBookingMsg("Appointment request sent successfully! Waiting for doctor's approval.");
      setTimeout(() => setSelectedDoctor(null), 3000);
    } catch (err) {
      setBookingMsg(err.response?.data?.message || "Failed to book appointment");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <main className="page">
      <section className="topbar">
        <h2>Doctors Listing</h2>
        <Link to={user ? `/${user.role}/dashboard` : "/"} className="btn-secondary">
          {user ? "Dashboard" : "Home"}
        </Link>
      </section>

      <section className="doctor-grid" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {loading ? (
          <p>Loading doctors...</p>
        ) : doctors.length === 0 ? (
          <p>No verified doctors available at the moment.</p>
        ) : (
          doctors.map((doctor) => (
            <article key={doctor._id} className="doctor-card" style={{ background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
              <h3 style={{ margin: "0 0 0.5rem 0", color: "#2c3e50" }}>{doctor.fullName}</h3>
              <p className="muted" style={{ fontWeight: "bold", color: "#3498db", margin: "0 0 0.5rem 0" }}>
                {doctor.specialization || "General Practitioner"}
              </p>

              {doctor.qualifications && doctor.qualifications.length > 0 && (
                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0 0 0.5rem 0" }}>
                  {doctor.qualifications.join(", ")}
                </p>
              )}

              {doctor.consultationFee > 0 && (
                <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "#27ae60", margin: "0 0 1rem 0" }}>
                  Fee: LKR {doctor.consultationFee}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleBookClick(doctor)}
                style={{ width: "100%", padding: "0.75rem", background: "#2ecc71", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
              >
                Book Appointment
              </button>
            </article>
          ))
        )}
      </section>

      {/* Booking Modal */}
      {selectedDoctor && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "#fff", padding: "2rem", borderRadius: "8px", width: "100%", maxWidth: "500px", position: "relative" }}>
            <button
              onClick={() => setSelectedDoctor(null)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer" }}
            >
              &times;
            </button>

            <h3 style={{ marginTop: 0 }}>Book Appointment with {selectedDoctor.fullName}</h3>
            {bookingMsg && (
              <div style={{ padding: "0.75rem", background: bookingMsg.includes("success") ? "#d4edda" : "#f8d7da", color: bookingMsg.includes("success") ? "#155724" : "#721c24", borderRadius: "4px", marginBottom: "1rem" }}>
                {bookingMsg}
              </div>
            )}

            <form onSubmit={handleBookingSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Date</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Time (Optional)</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }} />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Reason for Visit</label>
                <textarea rows="3" value={reason} onChange={e => setReason(e.target.value)} style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box", fontFamily: "inherit" }}></textarea>
              </div>

              <button
                type="submit"
                disabled={isBooking || bookingMsg.includes("success")}
                style={{ width: "100%", padding: "0.75rem", background: "#3498db", color: "white", border: "none", borderRadius: "4px", cursor: isBooking ? "not-allowed" : "pointer", fontWeight: "bold", opacity: isBooking ? 0.7 : 1 }}
              >
                {isBooking ? "Submitting..." : "Confirm Booking Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
