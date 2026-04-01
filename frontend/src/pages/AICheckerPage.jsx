import { useState } from "react";
import PatientShell from "../components/PatientShell";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const COMMON_SYMPTOMS = [
  "Headache", "Fever", "Cough", "Fatigue", "Chest Pain",
  "Shortness of Breath", "Nausea", "Dizziness", "Rash", "Joint Pain"
];

const SPECIALTY_MAP = {
  "Cardiologist": ["heart", "chest pain", "palpitations", "blood pressure", "cardiovascular"],
  "Dermatologist": ["skin", "rash", "acne", "mole", "itching", "dermatitis"],
  "Neurologist": ["headache", "migraine", "seizure", "numbness", "dizziness", "concussion"],
  "Orthopedist": ["joint pain", "fracture", "bone", "back pain", "sprain", "arthritis"],
  "Gastroenterologist": ["stomach", "nausea", "vomiting", "diarrhea", "constipation", "heartburn"],
  "Pulmonologist": ["cough", "shortness of breath", "asthma", "wheezing", "pneumonia"],
  "General Physician": ["fever", "cold", "flu", "fatigue", "weakness"]
};

export default function AICheckerPage() {
  const { authHeaders } = useAuth();
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const analyzeSymptoms = (symptomText) => {
    const text = symptomText.toLowerCase();
    const conditions = [];
    let recommendedSpecialty = "General Physician";
    let severity = "Low";

    // Determine specialty based on keywords
    for (const [specialty, keywords] of Object.entries(SPECIALTY_MAP)) {
      if (keywords.some(kw => text.includes(kw))) {
        recommendedSpecialty = specialty;
        break;
      }
    }

    // Determine conditions based on symptoms
    if (text.includes("chest pain") || text.includes("pressure")) {
      conditions.push({ name: "Possible Cardiac Issue", probability: "Medium" });
      severity = "High";
    }
    if (text.includes("shortness of breath") || text.includes("breathing")) {
      conditions.push({ name: "Respiratory Distress", probability: "Medium" });
      severity = "High";
    }
    if (text.includes("headache") || text.includes("migraine")) {
      conditions.push({ name: "Tension Headache", probability: "High" });
      if (text.includes("severe") || text.includes("worst")) {
        conditions.push({ name: "Migraine", probability: "Medium" });
        severity = severity === "High" ? "High" : "Medium";
      }
    }
    if (text.includes("fever")) {
      conditions.push({ name: "Viral Infection", probability: "High" });
      if (text.includes("high") || text.includes("103") || text.includes("104")) {
        severity = "High";
      }
    }
    if (text.includes("rash") || text.includes("skin")) {
      conditions.push({ name: "Allergic Reaction/Dermatitis", probability: "Medium" });
    }
    if (text.includes("cough") || text.includes("cold")) {
      conditions.push({ name: "Upper Respiratory Infection", probability: "High" });
    }
    if (text.includes("nausea") || text.includes("vomiting") || text.includes("stomach")) {
      conditions.push({ name: "Gastroenteritis", probability: "Medium" });
    }
    if (text.includes("dizziness") || text.includes("lightheaded")) {
      conditions.push({ name: "Vertigo/Low Blood Pressure", probability: "Medium" });
    }
    if (text.includes("joint pain") || text.includes("arthritis")) {
      conditions.push({ name: "Arthritis/Joint Inflammation", probability: "Medium" });
    }

    // Default condition if none matched
    if (conditions.length === 0) {
      conditions.push({ name: "General Discomfort", probability: "Low" });
    }

    // Update severity based on symptom count and keywords
    const highSeverityKeywords = ["severe", "extreme", "unbearable", "emergency", "cant breathe", "cant move"];
    if (highSeverityKeywords.some(kw => text.includes(kw))) {
      severity = "High";
    } else if (conditions.length >= 3) {
      severity = "Medium";
    }

    return {
      conditions,
      recommendedSpecialty,
      severity,
      disclaimer: "This is an AI-powered preliminary assessment. Please consult with a healthcare professional for accurate diagnosis and treatment."
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      setError("Please describe your symptoms");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Try to call backend AI service if available
      const response = await api.post("/ai/analyze-symptoms", {
        symptoms: symptoms.trim()
      }, authHeaders);
      
      setResult(response.data);
    } catch (err) {
      // Fallback to client-side analysis
      const analysis = analyzeSymptoms(symptoms);
      setResult(analysis);
    } finally {
      setLoading(false);
    }
  };

  const addSymptom = (symptom) => {
    setSymptoms(prev => {
      if (prev.includes(symptom)) return prev;
      return prev ? `${prev}, ${symptom.toLowerCase()}` : symptom.toLowerCase();
    });
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case "High": return "#ef4444";
      case "Medium": return "#f59e0b";
      case "Low": return "#10b981";
      default: return "#64748b";
    }
  };

  return (
    <PatientShell>
      <div className="ai-checker-page">
        <div className="ai-checker-header">
          <h2>AI Symptom Checker</h2>
          <p>Describe your symptoms and get AI-powered insights on possible conditions and recommended specialists</p>
        </div>

        <div className="ai-checker-grid">
          {/* Input Section */}
          <div className="ai-input-section">
            <div className="profile-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <h3>Describe Your Symptoms</h3>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="form-field">
                  <label>What symptoms are you experiencing?</label>
                  <textarea
                    className="symptoms-textarea"
                    rows={6}
                    placeholder="Example: I've been having severe headaches for the past 3 days, accompanied by dizziness and nausea..."
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                  />
                </div>

                {/* Quick Symptoms */}
                <div className="quick-symptoms">
                  <label>Quick Add Common Symptoms:</label>
                  <div className="symptom-tags">
                    {COMMON_SYMPTOMS.map(symptom => (
                      <button
                        key={symptom}
                        type="button"
                        className="symptom-tag-btn"
                        onClick={() => addSymptom(symptom)}
                      >
                        + {symptom}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="message-toast error" style={{ marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="ai-check-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                        <path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/>
                        <path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/>
                        <path d="M12 16v4"/>
                        <path d="M8 21h8"/>
                      </svg>
                      Check Symptoms
                    </>
                  )}
                </button>
              </form>

              <div className="ai-safety-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <p>This tool is for informational purposes only. Seek immediate medical attention for emergencies.</p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="ai-results-section">
            {!result ? (
              <div className="ai-placeholder">
                <div className="ai-illustration">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5">
                    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                    <path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/>
                    <path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/>
                    <path d="M12 16v4"/>
                    <path d="M8 21h8"/>
                  </svg>
                </div>
                <h4>AI Health Assistant</h4>
                <p>Enter your symptoms on the left to get AI-powered analysis and recommendations.</p>
                <ul className="ai-features">
                  <li>Possible condition analysis</li>
                  <li>Recommended specialty</li>
                  <li>Severity assessment</li>
                  <li>General health guidance</li>
                </ul>
              </div>
            ) : (
              <div className="ai-result-card">
                {/* Severity Indicator */}
                <div className="severity-section">
                  <span className="severity-label">Severity Level</span>
                  <div
                    className={`severity-badge severity-${result.severity.toLowerCase()}`}
                    style={{ backgroundColor: getSeverityColor(result.severity) + '20', color: getSeverityColor(result.severity) }}
                  >
                    <span className="severity-dot" style={{ backgroundColor: getSeverityColor(result.severity) }}></span>
                    {result.severity}
                  </div>
                </div>

                {/* Possible Conditions */}
                <div className="conditions-section">
                  <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    Possible Conditions
                  </h4>
                  <div className="conditions-list">
                    {result.conditions?.map((condition, idx) => (
                      <div key={idx} className="condition-item">
                        <span className="condition-name">{condition.name}</span>
                        <span className={`probability-badge ${condition.probability.toLowerCase()}`}>
                          {condition.probability} Probability
                        </span>
                      </div>
                    )) || (
                      <div className="condition-item">
                        <span className="condition-name">General Discomfort</span>
                        <span className="probability-badge low">Low Probability</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommended Specialty */}
                <div className="specialty-section">
                  <h4>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Recommended Specialty
                  </h4>
                  <div className="specialty-card">
                    <div className="specialty-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                    </div>
                    <div className="specialty-info">
                      <span className="specialty-name">You may need a {result.recommendedSpecialty}</span>
                      <span className="specialty-desc">Based on your symptoms, consulting with this specialist is recommended</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="ai-actions">
                  <button className="find-doctor-btn" onClick={() => window.location.href = '/doctors'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.35-4.35"/>
                    </svg>
                    Find a {result.recommendedSpecialty}
                  </button>
                  <button className="book-appointment-btn" onClick={() => window.location.href = '/patient/appointments'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Book Appointment
                  </button>
                </div>

                {/* Disclaimer */}
                <div className="ai-disclaimer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="16" x2="12" y2="12"/>
                    <line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <p>{result.disclaimer || "This is an AI-powered preliminary assessment. Please consult with a healthcare professional for accurate diagnosis and treatment."}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PatientShell>
  );
}
