import { useEffect, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PatientProfilePage() {
  const { authHeaders } = useAuth();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    bloodType: "O+",
    age: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/patients/me", authHeaders).then((res) => {
      const p = res.data.patient || {};
      setProfile({
        fullName: p.fullName || "",
        email: p.email || "",
        phone: p.phone || "",
        dob: p.dob || "",
        gender: p.gender || "",
        address: p.address || "",
        bloodType: p.bloodType || "O+",
        age: p.age || "",
      });
    }).catch(() => {});
  }, [authHeaders]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/patients/update-profile", profile, authHeaders);
      setMessage("Profile updated successfully");
      setIsEditing(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update profile");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toISOString().split("T")[0];
  };

  return (
    <PatientShell>
      <div className="profile-dashboard">
        {/* Profile Header Card */}
        <div className="profile-header-card">
          <div className="profile-avatar-large">
            <img 
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" 
              alt={profile.fullName} 
            />
          </div>
          <div className="profile-header-info">
            <div className="profile-name-section">
              <h2>{profile.fullName || "Patient Name"}</h2>
              <span className="role-badge">Patient</span>
            </div>
            <p className="profile-email">{profile.email || "email@example.com"} • {profile.phone || "+94 77 234 5678"}</p>
            <div className="profile-tags">
              <span className="tag blood">Blood: {profile.bloodType || "O+"}</span>
              <span className="tag gender">{profile.gender || "Female"}</span>
              <span className="tag member">Member since 2024</span>
            </div>
          </div>
          <button 
            className="edit-profile-btn" 
            onClick={() => setIsEditing(!isEditing)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {message && (
          <div className={`message-toast ${message.includes("success") ? "success" : "error"}`}>
            {message}
          </div>
        )}

        <div className="profile-grid">
          {/* Personal Information */}
          <div className="profile-section">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <h3>Personal Information</h3>
            </div>
            
            {isEditing ? (
              <form className="edit-form" onSubmit={onSubmit}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      value={profile.fullName} 
                      onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={profile.email} 
                      onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      value={profile.phone} 
                      onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Date of Birth</label>
                    <input 
                      type="date" 
                      value={formatDate(profile.dob)} 
                      onChange={(e) => setProfile(p => ({ ...p, dob: e.target.value }))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Gender</label>
                    <select 
                      value={profile.gender} 
                      onChange={(e) => setProfile(p => ({ ...p, gender: e.target.value }))}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="form-field full-width">
                    <label>Address</label>
                    <textarea 
                      value={profile.address} 
                      onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">Save Changes</button>
                  <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{profile.fullName || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">{profile.email || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone Number</span>
                  <span className="info-value">{profile.phone || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Date of Birth</span>
                  <span className="info-value">{profile.dob || "-"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Gender</span>
                  <span className="info-value">{profile.gender || "-"}</span>
                </div>
                <div className="info-item full-width">
                  <span className="info-label">Address</span>
                  <span className="info-value">{profile.address || "-"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Health Summary Sidebar */}
          <div className="profile-sidebar">
            <div className="health-summary">
              <h3>Health Summary</h3>
              <div className="health-stats">
                <div className="health-stat">
                  <div className="stat-icon calendar">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-number">14</span>
                    <span className="stat-text">Total Appointments</span>
                  </div>
                </div>
                <div className="health-stat">
                  <div className="stat-icon file">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-number">9</span>
                    <span className="stat-text">Medical Reports</span>
                  </div>
                </div>
                <div className="health-stat">
                  <div className="stat-icon pill">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-number">3</span>
                    <span className="stat-text">Active Prescriptions</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="symptom-checker-card">
              <div className="checker-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h4>Try Symptom Checker</h4>
              <p>Check your symptoms and get instant AI-powered insights</p>
              <button className="checker-btn">Start Check</button>
            </div>
          </div>
        </div>

        {/* Health Information Section */}
        <div className="profile-section health-info">
          <div className="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <h3>Health Information</h3>
          </div>
          <p className="section-desc">Your medical history and conditions will appear here</p>
        </div>
      </div>
    </PatientShell>
  );
}
