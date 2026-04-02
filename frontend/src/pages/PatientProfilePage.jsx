import { useEffect, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";
import { useAuthMediaSrc } from "../hooks/useAuthMediaSrc";

const DEFAULT_PROFILE_AVATAR =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80";

export default function PatientProfilePage() {
  const { authHeaders, token } = useAuth();
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    bloodType: "O+",
    age: "",
    avatar: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const heroAvatarSrc = useAuthMediaSrc(profile.avatar || "", token) || DEFAULT_PROFILE_AVATAR;

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
        avatar: p.avatar || "",
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

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const calculateAge = (dateStr) => {
    if (!dateStr) return null;
    const birthDate = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage("Password must be at least 6 characters");
      return;
    }
    try {
      await api.put("/patients/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, authHeaders);
      setMessage("Password changed successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setIsChangingPassword(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to change password");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setAvatarUploading(true);
    try {
      const res = await api.post("/patients/upload-avatar", formData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000
      });
      setProfile((p) => ({ ...p, avatar: res.data.avatarUrl || p.avatar }));
      setMessage("Profile picture updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to upload avatar");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  return (
    <PatientShell>
      <div className="profile-dashboard-modern">
        {/* Profile Header Card - Professional Design */}
        <div className="profile-hero-card">
          <div className="profile-hero-content">
            <div className="profile-avatar-section">
              <div className="avatar-container-large">
                <img 
                  src={heroAvatarSrc} 
                  alt={profile.fullName}
                  className="avatar-image"
                />
                <button 
                  type="button"
                  className="avatar-edit-btn" 
                  onClick={() => !avatarUploading && document.getElementById("avatar-input").click()}
                  disabled={avatarUploading}
                  title="Change profile picture"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </button>
                <input 
                  id="avatar-input"
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            
            <div className="profile-info-section">
              <div className="profile-title-row">
                <div className="profile-name-block">
                  <h1>{profile.fullName || "Patient Name"}</h1>
                  <span className="role-badge-professional">Patient</span>
                </div>
                <button 
                  className={`edit-profile-btn-professional ${isEditing ? 'active' : ''}`}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {isEditing ? (
                      <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                    ) : (
                      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>
                    )}
                  </svg>
                  {isEditing ? "Cancel" : "Edit Profile"}
                </button>
              </div>
              
              <div className="profile-contact-row">
                <span className="contact-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {profile.email || "email@example.com"}
                </span>
                <span className="contact-divider">•</span>
                <span className="contact-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  {profile.phone || "+94 77 234 5678"}
                </span>
              </div>
              
              <div className="profile-badges-row">
                <span className="info-badge blood">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  Blood: {profile.bloodType || "O+"}
                </span>
                <span className="info-badge gender">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M8 12h8"/>
                  </svg>
                  {profile.gender || "Not specified"}
                </span>
                {profile.dob && (
                  <span className="info-badge age">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {calculateAge(profile.dob)} years old
                  </span>
                )}
                <span className="info-badge member">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  </svg>
                  Member since 2024
                </span>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`message-toast-modern ${message.includes("success") ? "success" : "error"}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {message.includes("success") ? (
                <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
              ) : (
                <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
              )}
            </svg>
            {message}
          </div>
        )}

        <div className="profile-content-grid">
          {/* Main Content - Personal Information */}
          <div className="profile-main-content">
            <div className="content-card">
              <div className="card-header">
                <div className="card-header-icon personal">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="card-header-text">
                  <h3>Personal Information</h3>
                  <p>Your basic information and contact details</p>
                </div>
              </div>
              
              <div className="card-body">
                {isEditing ? (
                  <form className="edit-form-modern" onSubmit={onSubmit}>
                    <div className="form-row-modern">
                      <div className="form-field-modern">
                        <label>Full Name</label>
                        <input 
                          type="text" 
                          value={profile.fullName} 
                          onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="form-field-modern">
                        <label>Email Address</label>
                        <input 
                          type="email" 
                          value={profile.email} 
                          onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>
                    
                    <div className="form-row-modern">
                      <div className="form-field-modern">
                        <label>Phone Number</label>
                        <input 
                          type="tel" 
                          value={profile.phone} 
                          onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                          placeholder="+94 77 234 5678"
                        />
                      </div>
                      <div className="form-field-modern">
                        <label>Date of Birth</label>
                        <input 
                          type="date" 
                          value={formatDate(profile.dob)} 
                          onChange={(e) => setProfile(p => ({ ...p, dob: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row-modern">
                      <div className="form-field-modern">
                        <label>Gender</label>
                        <select 
                          value={profile.gender} 
                          onChange={(e) => setProfile(p => ({ ...p, gender: e.target.value }))}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="form-field-modern">
                        <label>Blood Type</label>
                        <select
                          value={profile.bloodType}
                          onChange={(e) => setProfile(p => ({ ...p, bloodType: e.target.value }))}
                        >
                          <option value="">Select Blood Type</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="form-field-modern full-width">
                      <label>Address</label>
                      <textarea 
                        value={profile.address} 
                        onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                        placeholder="Enter your complete address"
                        rows={3}
                      />
                    </div>
                    
                    <div className="form-actions-modern">
                      <button type="submit" className="save-btn-modern">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Save Changes
                      </button>
                      <button type="button" className="cancel-btn-modern" onClick={() => setIsEditing(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="info-display-modern">
                    <div className="info-row-modern">
                      <div className="info-item-modern">
                        <span className="info-label-modern">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          Full Name
                        </span>
                        <span className="info-value-modern">{profile.fullName || "-"}</span>
                      </div>
                      <div className="info-item-modern">
                        <span className="info-label-modern">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Date of Birth
                        </span>
                        <span className="info-value-modern">{formatDisplayDate(profile.dob)}</span>
                      </div>
                    </div>
                    
                    <div className="info-row-modern">
                      <div className="info-item-modern">
                        <span className="info-label-modern">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                          </svg>
                          Email Address
                        </span>
                        <span className="info-value-modern">{profile.email || "-"}</span>
                      </div>
                      <div className="info-item-modern">
                        <span className="info-label-modern">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                          </svg>
                          Phone Number
                        </span>
                        <span className="info-value-modern">{profile.phone || "-"}</span>
                      </div>
                    </div>
                    
                    <div className="info-row-modern">
                      <div className="info-item-modern">
                        <span className="info-label-modern">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/>
                          </svg>
                          Gender
                        </span>
                        <span className="info-value-modern">{profile.gender || "-"}</span>
                      </div>
                      <div className="info-item-modern">
                        <span className="info-label-modern">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                          Blood Type
                        </span>
                        <span className="info-value-modern">{profile.bloodType || "-"}</span>
                      </div>
                    </div>
                    
                    <div className="info-item-modern full-width">
                      <span className="info-label-modern">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        Address
                      </span>
                      <span className="info-value-modern">{profile.address || "-"}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
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

            <div className="symptom-checker-card clickable" onClick={() => window.location.href = '/ai-checker'}>
              <div className="checker-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h4>Try Symptom Checker</h4>
              <p>Check your symptoms and get instant AI-powered insights</p>
              <button className="checker-btn" onClick={(e) => { e.stopPropagation(); window.location.href = '/ai-checker'; }}>Start Check</button>
            </div>
          </div>
        </div>

        {/* Health Information Section */}
        <div className="profile-section-modern health-section">
          <div className="section-header-modern">
            <div className="section-icon health">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <div className="section-title">
              <h3>Health Information</h3>
              <p>Medical records and health conditions</p>
            </div>
          </div>
          
          <div className="health-info-grid">
            <div className="health-card">
              <div className="health-card-icon allergies">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                  <path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/>
                  <path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/>
                </svg>
              </div>
              <h4>Allergies</h4>
              <p className="health-value">No known allergies</p>
              <button className="add-health-btn">Add Allergy</button>
            </div>
            
            <div className="health-card">
              <div className="health-card-icon conditions">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h4>Medical Conditions</h4>
              <p className="health-value">None recorded</p>
              <button className="add-health-btn">Add Condition</button>
            </div>
            
            <div className="health-card">
              <div className="health-card-icon medications">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                  <path d="m8.5 8.5 7 7"/>
                </svg>
              </div>
              <h4>Current Medications</h4>
              <p className="health-value">No active medications</p>
              <button className="add-health-btn">Add Medication</button>
            </div>
            
            <div className="health-card">
              <div className="health-card-icon emergency">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h4>Emergency Contact</h4>
              <p className="health-value">Not set</p>
              <button className="add-health-btn">Set Contact</button>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="profile-section-modern security-section">
          <div className="section-header-modern">
            <div className="section-icon security">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="section-title">
              <h3>Security</h3>
              <p>Password and account protection</p>
            </div>
          </div>
          
          {!isChangingPassword ? (
            <div className="security-card">
              <div className="security-info">
                <div className="security-icon-large">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <div className="security-text">
                  <h4>Password Protection</h4>
                  <p>Your account is protected with a secure password. We recommend changing it regularly for enhanced security.</p>
                </div>
              </div>
              <button 
                className="change-password-btn-modern"
                onClick={() => setIsChangingPassword(true)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Change Password
              </button>
            </div>
          ) : (
            <div className="password-change-card">
              <h4>Change Your Password</h4>
              <p className="password-hint">Please enter your current password and choose a new secure password.</p>
              <form className="password-form-modern" onSubmit={handlePasswordChange}>
                <div className="password-fields">
                  <div className="password-field">
                    <label>Current Password</label>
                    <input 
                      type="password" 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(d => ({ ...d, currentPassword: e.target.value }))}
                      placeholder="Enter your current password"
                      required
                    />
                  </div>
                  <div className="password-field">
                    <label>New Password</label>
                    <input 
                      type="password" 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(d => ({ ...d, newPassword: e.target.value }))}
                      placeholder="Enter new password (min 6 characters)"
                      required
                    />
                  </div>
                  <div className="password-field">
                    <label>Confirm New Password</label>
                    <input 
                      type="password" 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(d => ({ ...d, confirmPassword: e.target.value }))}
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                </div>
                <div className="password-actions">
                  <button type="submit" className="save-password-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Update Password
                  </button>
                  <button 
                    type="button" 
                    className="cancel-password-btn"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </PatientShell>
  );
}
