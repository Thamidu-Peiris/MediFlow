import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const ROLE_CONFIG = {
  patient: {
    image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=80",
    label: "Patient Account",
    heading: "Create Patient Account",
    sub: "Start managing your health with MediFlow",
    perks: ["Book doctor appointments", "View prescriptions & reports", "Track medical history", "24/7 health support"],
    accentFrom: "#2563eb",
    accentTo: "#1e40af",
    iconBg: "linear-gradient(135deg,#dbeafe,#bfdbfe)",
    iconColor: "#2563eb",
  },
  doctor: {
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80",
    label: "Doctor Account",
    heading: "Create Doctor Account",
    sub: "Join MediFlow's network of trusted professionals",
    perks: ["Manage patient consultations", "Set your availability", "Issue digital prescriptions", "Access patient records"],
    accentFrom: "#059669",
    accentTo: "#065f46",
    iconBg: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
    iconColor: "#059669",
  },
};

function getPasswordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { level: 1, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { level: 2, label: "Fair", color: "#f59e0b" };
  if (score <= 4) return { level: 3, label: "Good", color: "#3b82f6" };
  return { level: 4, label: "Strong", color: "#10b981" };
}

const SPECIALIZATIONS = [
  "Cardiology", "Dermatology", "Endocrinology", "Gastroenterology",
  "General Practice", "Neurology", "Obstetrics & Gynecology", "Oncology",
  "Ophthalmology", "Orthopedics", "Pediatrics", "Psychiatry",
  "Pulmonology", "Radiology", "Surgery", "Urology"
];

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function validate(form, confirmPassword, doctorForm, patientForm, selectedRole) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Full name is required";
  else if (form.name.trim().length < 3) errors.name = "Name must be at least 3 characters";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid email address";
  if (!form.password) errors.password = "Password is required";
  else if (form.password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (!/[A-Z]/.test(form.password)) errors.password = "Must include at least one uppercase letter";
  else if (!/[a-z]/.test(form.password)) errors.password = "Must include at least one lowercase letter";
  else if (!/[0-9]/.test(form.password)) errors.password = "Must include at least one number";
  else if (!/[^A-Za-z0-9]/.test(form.password)) errors.password = "Must include at least one special character";
  if (!confirmPassword) errors.confirm = "Please confirm your password";
  else if (form.password !== confirmPassword) errors.confirm = "Passwords do not match";
  if (selectedRole === "doctor") {
    if (!doctorForm.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^[\d\s+\-()]{7,15}$/.test(doctorForm.phone.trim())) errors.phone = "Enter a valid phone number";
    if (!doctorForm.specialization) errors.specialization = "Please select a specialization";
    if (!doctorForm.qualifications.trim()) errors.qualifications = "Qualifications are required (e.g. MBBS, MD)";
    if (doctorForm.consultationFee !== "" && (isNaN(doctorForm.consultationFee) || Number(doctorForm.consultationFee) < 0))
      errors.consultationFee = "Enter a valid fee";
  }
  if (selectedRole === "patient") {
    if (!patientForm.phone.trim()) errors.phone = "Phone number is required";
    else if (!/^[\d\s+\-()]{7,15}$/.test(patientForm.phone.trim())) errors.phone = "Enter a valid phone number";
    if (!patientForm.dob) errors.dob = "Date of birth is required";
    else {
      const age = calcAge(patientForm.dob);
      if (age < 1 || age > 120) errors.dob = "Enter a valid date of birth";
    }
    if (!patientForm.gender) errors.gender = "Please select your gender";
  }
  return errors;
}

export default function RegisterRolePage() {
  const { role } = useParams();
  const selectedRole = useMemo(() => (role === "doctor" ? "doctor" : "patient"), [role]);
  const cfg = ROLE_CONFIG[selectedRole];
  const navigate = useNavigate();
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [doctorForm, setDoctorForm] = useState({ phone: "", specialization: "", qualifications: "", bio: "", consultationFee: "" });
  const [patientForm, setPatientForm] = useState({ phone: "", dob: "", gender: "", address: "" });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const errors = validate(form, confirmPassword, doctorForm, patientForm, selectedRole);
  const strength = form.password ? getPasswordStrength(form.password) : null;

  const touch = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const step1Errors = { ...( errors.name ? { name: errors.name } : {}), ...(errors.email ? { email: errors.email } : {}), ...(errors.password ? { password: errors.password } : {}), ...(errors.confirm ? { confirm: errors.confirm } : {}) };

  const handleNext = () => {
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(step1Errors).length > 0) return;
    setStep(2);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) { handleNext(); return; }
    const allTouched = { name: true, email: true, password: true, confirm: true,
      ...(selectedRole === "doctor" ? { phone: true, specialization: true, qualifications: true, consultationFee: true } : {}),
      ...(selectedRole === "patient" ? { phone: true, dob: true, gender: true } : {})
    };
    setTouched(allTouched);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      const user = await register({ ...form, role: selectedRole });
      const token = localStorage.getItem("token");
      if (selectedRole === "doctor") {
        await api.put("/doctors/update-profile", {
          fullName: form.name,
          email: form.email,
          phone: doctorForm.phone,
          specialization: doctorForm.specialization,
          qualifications: doctorForm.qualifications.split(",").map(q => q.trim()).filter(Boolean),
          bio: doctorForm.bio,
          consultationFee: doctorForm.consultationFee ? Number(doctorForm.consultationFee) : 0
        }, { headers: { Authorization: `Bearer ${token}` } });
        navigate("/doctors");
      } else {
        await api.put("/patients/update-profile", {
          fullName: form.name,
          email: form.email,
          phone: patientForm.phone,
          age: calcAge(patientForm.dob),
          gender: patientForm.gender,
          address: patientForm.address
        }, { headers: { Authorization: `Bearer ${token}` } });
        navigate("/patient/dashboard");
      }
    } catch (err) {
      setServerError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ap-page">
      {/* Left Visual Panel */}
      <div className="ap-panel">
        <div className="ap-panel-bg" />
        <div className="ap-panel-content">
          <Link to="/" className="ap-logo">
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="rrLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <circle cx="20" cy="20" r="18" stroke="url(#rrLogoGrad)" strokeWidth="2.5" fill="none"/>
              <rect x="18" y="10" width="4" height="20" rx="2" fill="url(#rrLogoGrad)"/>
              <rect x="10" y="18" width="20" height="4" rx="2" fill="url(#rrLogoGrad)"/>
            </svg>
            <span>MediFlow</span>
          </Link>
          <img
            src={cfg.image}
            alt={cfg.label}
            className="ap-panel-img"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="ap-form-panel">
        <div className="ap-form-wrap">
          <div className="ap-form-header">
            <div className="ap-form-icon" style={{ background: cfg.iconBg, color: cfg.iconColor }}>
              {selectedRole === "patient" ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              )}
            </div>
            <h1>{step === 2 ? (selectedRole === "doctor" ? "Professional Details" : "Personal Details") : cfg.heading}</h1>
            <p>{step === 2 ? (selectedRole === "doctor" ? "Tell us about your medical background" : "Help us personalise your experience") : cfg.sub}</p>
          </div>

          {/* Step indicator — both roles */}
          <div className="rr-steps">
            <div className={`rr-step${step >= 1 ? " rr-step-active" : ""}`}>
              <div className="rr-step-dot" style={{ background: step >= 1 ? cfg.accentFrom : undefined }}>
                {step > 1 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : "1"}
              </div>
              <span>Account</span>
            </div>
            <div className="rr-step-line" style={{ background: step > 1 ? cfg.accentFrom : undefined }} />
            <div className={`rr-step${step === 2 ? " rr-step-active" : ""}`}>
              <div className="rr-step-dot" style={{ background: step === 2 ? cfg.accentFrom : undefined }}>2</div>
              <span>{selectedRole === "doctor" ? "Professional" : "Personal"}</span>
            </div>
          </div>

          {serverError && (
            <div className="ap-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} className="ap-form" noValidate>

            {/* ── STEP 1: Account Details ── */}
            {step === 1 && (
              <>
                <div className="ap-field" style={{ marginTop: "12px" }}>
                  <label>Full Name</label>
                  <div className={`ap-input-wrap${touched.name && errors.name ? " ap-input-error" : touched.name && !errors.name ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <input type="text" placeholder="Your full name" value={form.name}
                      onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                      onBlur={() => touch("name")} />
                    {touched.name && !errors.name && <span className="ap-input-check">✓</span>}
                  </div>
                  {touched.name && errors.name && <span className="ap-field-err">{errors.name}</span>}
                </div>

                <div className="ap-field">
                  <label>Email Address</label>
                  <div className={`ap-input-wrap${touched.email && errors.email ? " ap-input-error" : touched.email && !errors.email ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <input type="email" placeholder="you@email.com" value={form.email}
                      onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                      onBlur={() => touch("email")} />
                    {touched.email && !errors.email && <span className="ap-input-check">✓</span>}
                  </div>
                  {touched.email && errors.email && <span className="ap-field-err">{errors.email}</span>}
                </div>

                <div className="ap-field">
                  <label>Password</label>
                  <div className={`ap-input-wrap${touched.password && errors.password ? " ap-input-error" : touched.password && !errors.password ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <input type={showPassword ? "text" : "password"} placeholder="Create a strong password" value={form.password}
                      onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                      onBlur={() => touch("password")} />
                    <button type="button" className="ap-eye-btn" onClick={() => setShowPassword(p => !p)}>
                      {showPassword
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                  </div>
                  {form.password && (
                    <div className="rr-strength">
                      <div className="rr-strength-bars">
                        {[1,2,3,4].map(i => <div key={i} className="rr-strength-bar" style={{ background: i <= strength.level ? strength.color : "#e5e7eb" }} />)}
                      </div>
                      <span style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                  )}
                  {touched.password && errors.password && <span className="ap-field-err">{errors.password}</span>}
                  {!errors.password && form.password && (
                    <div className="rr-pwd-rules">
                      {[
                        { ok: form.password.length >= 8, text: "8+ chars" },
                        { ok: /[A-Z]/.test(form.password), text: "Uppercase" },
                        { ok: /[a-z]/.test(form.password), text: "Lowercase" },
                        { ok: /[0-9]/.test(form.password), text: "Number" },
                        { ok: /[^A-Za-z0-9]/.test(form.password), text: "Special char" },
                      ].map(r => (
                        <span key={r.text} className={`rr-rule${r.ok ? " rr-rule-ok" : ""}`}>{r.ok ? "✓" : "○"} {r.text}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ap-field">
                  <label>Confirm Password</label>
                  <div className={`ap-input-wrap${touched.confirm && errors.confirm ? " ap-input-error" : touched.confirm && !errors.confirm ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <input type={showConfirm ? "text" : "password"} placeholder="Re-enter your password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => touch("confirm")} />
                    <button type="button" className="ap-eye-btn" onClick={() => setShowConfirm(p => !p)}>
                      {showConfirm
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                    </button>
                    {touched.confirm && !errors.confirm && <span className="ap-input-check">✓</span>}
                  </div>
                  {touched.confirm && errors.confirm && <span className="ap-field-err">{errors.confirm}</span>}
                </div>
              </>
            )}

            {/* ── STEP 2: Professional Details (doctor only) ── */}
            {selectedRole === "doctor" && step === 2 && (
              <>
                <div className="ap-field">
                  <label>Phone Number <span className="rr-required">*</span></label>
                  <div className={`ap-input-wrap${touched.phone && errors.phone ? " ap-input-error" : touched.phone && !errors.phone ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <input type="tel" placeholder="+94 77 123 4567" value={doctorForm.phone}
                      onChange={(e) => setDoctorForm(p => ({ ...p, phone: e.target.value }))}
                      onBlur={() => touch("phone")} />
                    {touched.phone && !errors.phone && <span className="ap-input-check">✓</span>}
                  </div>
                  {touched.phone && errors.phone && <span className="ap-field-err">{errors.phone}</span>}
                </div>

                <div className="ap-field">
                  <label>Specialization <span className="rr-required">*</span></label>
                  <div className={`ap-input-wrap${touched.specialization && errors.specialization ? " ap-input-error" : touched.specialization && !errors.specialization ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <select value={doctorForm.specialization}
                      onChange={(e) => setDoctorForm(p => ({ ...p, specialization: e.target.value }))}
                      onBlur={() => touch("specialization")}>
                      <option value="">Select your specialization</option>
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {touched.specialization && errors.specialization && <span className="ap-field-err">{errors.specialization}</span>}
                </div>

                <div className="ap-field">
                  <label>Qualifications <span className="rr-required">*</span></label>
                  <div className={`ap-input-wrap${touched.qualifications && errors.qualifications ? " ap-input-error" : touched.qualifications && !errors.qualifications ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
                    </svg>
                    <input type="text" placeholder="e.g. MBBS, MD, MS (comma separated)" value={doctorForm.qualifications}
                      onChange={(e) => setDoctorForm(p => ({ ...p, qualifications: e.target.value }))}
                      onBlur={() => touch("qualifications")} />
                    {touched.qualifications && !errors.qualifications && <span className="ap-input-check">✓</span>}
                  </div>
                  {touched.qualifications && errors.qualifications && <span className="ap-field-err">{errors.qualifications}</span>}
                </div>

                <div className="ap-field">
                  <label>Consultation Fee (LKR) <span className="rr-optional">optional</span></label>
                  <div className={`ap-input-wrap${touched.consultationFee && errors.consultationFee ? " ap-input-error" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <input type="number" placeholder="e.g. 2500" min="0" value={doctorForm.consultationFee}
                      onChange={(e) => setDoctorForm(p => ({ ...p, consultationFee: e.target.value }))}
                      onBlur={() => touch("consultationFee")} />
                  </div>
                  {touched.consultationFee && errors.consultationFee && <span className="ap-field-err">{errors.consultationFee}</span>}
                </div>

                <div className="ap-field">
                  <label>Short Bio <span className="rr-optional">optional</span></label>
                  <div className="ap-input-wrap ap-textarea-wrap">
                    <svg className="ap-input-icon" style={{top:"14px"}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <textarea placeholder="Brief description about your experience..." value={doctorForm.bio}
                      onChange={(e) => setDoctorForm(p => ({ ...p, bio: e.target.value }))} rows={3} />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Personal Details (patient only) ── */}
            {selectedRole === "patient" && step === 2 && (
              <>
                <div className="ap-field">
                  <label>Phone Number <span className="rr-required">*</span></label>
                  <div className={`ap-input-wrap${touched.phone && errors.phone ? " ap-input-error" : touched.phone && !errors.phone ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.44 2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    <input type="tel" placeholder="+94 77 123 4567" value={patientForm.phone}
                      onChange={(e) => setPatientForm(p => ({ ...p, phone: e.target.value }))}
                      onBlur={() => touch("phone")} />
                    {touched.phone && !errors.phone && <span className="ap-input-check">✓</span>}
                  </div>
                  {touched.phone && errors.phone && <span className="ap-field-err">{errors.phone}</span>}
                </div>

                <div className="ap-field">
                  <label>Date of Birth <span className="rr-required">*</span></label>
                  <div className={`ap-input-wrap${touched.dob && errors.dob ? " ap-input-error" : touched.dob && !errors.dob ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <input type="date" value={patientForm.dob}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setPatientForm(p => ({ ...p, dob: e.target.value }))}
                      onBlur={() => touch("dob")} />
                    {touched.dob && !errors.dob && patientForm.dob && <span className="ap-input-check">✓</span>}
                  </div>
                  {touched.dob && errors.dob && <span className="ap-field-err">{errors.dob}</span>}
                  {patientForm.dob && !errors.dob && (
                    <span style={{ fontSize: "12px", color: "#6b7280", marginTop: "3px", display: "block" }}>
                      Age: {calcAge(patientForm.dob)} years old
                    </span>
                  )}
                </div>

                <div className="ap-field">
                  <label>Gender <span className="rr-required">*</span></label>
                  <div className={`ap-input-wrap${touched.gender && errors.gender ? " ap-input-error" : touched.gender && !errors.gender ? " ap-input-ok" : ""}`}>
                    <svg className="ap-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4"/><path d="M12 12v8M9 18h6"/>
                    </svg>
                    <select value={patientForm.gender}
                      onChange={(e) => setPatientForm(p => ({ ...p, gender: e.target.value }))}
                      onBlur={() => touch("gender")}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  {touched.gender && errors.gender && <span className="ap-field-err">{errors.gender}</span>}
                </div>

                <div className="ap-field">
                  <label>Address <span className="rr-optional">optional</span></label>
                  <div className="ap-input-wrap ap-textarea-wrap">
                    <svg className="ap-input-icon" style={{top:"14px"}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <textarea placeholder="Your home or current address..." value={patientForm.address}
                      onChange={(e) => setPatientForm(p => ({ ...p, address: e.target.value }))} rows={2} />
                  </div>
                </div>
              </>
            )}

            {/* Buttons */}
            {step === 1 ? (
              <button type="button" className="ap-submit-btn"
                style={{ background: `linear-gradient(135deg, ${cfg.accentFrom} 0%, ${cfg.accentTo} 100%)` }}
                onClick={handleNext}>
                {selectedRole === "doctor" ? "Continue to Professional Details" : "Continue to Personal Details"}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            ) : (
              <div className="rr-btn-row">
                <button type="button" className="rr-back-btn" onClick={() => setStep(1)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Back
                </button>
                <button type="submit" className="ap-submit-btn"
                  style={{ background: `linear-gradient(135deg, ${cfg.accentFrom} 0%, ${cfg.accentTo} 100%)`, flex: 1 }}
                  disabled={loading}>
                  {loading ? <span className="ap-spinner" /> : (
                    <>
                      Create {selectedRole === "patient" ? "Patient" : "Doctor"} Account
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>

          <div className="rr-footer-links">
            <p className="ap-switch">
              Wrong account type? <Link to="/register">Go back</Link>
            </p>
            <p className="ap-switch">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
