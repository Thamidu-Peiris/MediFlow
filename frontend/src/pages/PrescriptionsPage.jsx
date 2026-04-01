import { useEffect, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PrescriptionsPage() {
  const { authHeaders } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPrescriptions();
  }, [authHeaders]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/patients/prescriptions", authHeaders);
      setPrescriptions(res.data.prescriptions || []);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load prescriptions");
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const getMedicineSummary = (medicines) => {
    if (!medicines || medicines.length === 0) return "No medicines";
    if (medicines.length === 1) return medicines[0].name || medicines[0];
    return `${medicines[0].name || medicines[0]} +${medicines.length - 1} more`;
  };

  const handleDownloadPDF = async (prescription) => {
    try {
      const response = await api.get(`/patients/prescriptions/${prescription._id}/download`, {
        ...authHeaders,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${prescription._id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      const content = generatePrescriptionText(prescription);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${prescription._id || 'download'}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const generatePrescriptionText = (prescription) => {
    const medicines = prescription.medicines || [];
    const medicinesList = medicines.map(m => 
      `- ${m.name || m}: ${m.dosage || 'As prescribed'} (${m.frequency || 'As needed'})`
    ).join('\n');

    return `
MEDIFLOW PRESCRIPTION
====================

Doctor: Dr. ${prescription.doctorName || prescription.doctorId || "Unknown"}
Date: ${formatDate(prescription.createdAt || prescription.date)}
Prescription ID: ${prescription._id || 'N/A'}

DIAGNOSIS:
${prescription.diagnosis || prescription.notes || "No diagnosis recorded"}

MEDICINES:
${medicinesList || "No medicines prescribed"}

INSTRUCTIONS:
${prescription.instructions || prescription.notes || "Take medicines as directed. Contact your doctor if symptoms worsen."}

---
This prescription was generated from MediFlow Health System.
    `.trim();
  };

  const closeDetailView = () => {
    setSelectedPrescription(null);
  };

  if (selectedPrescription) {
    return (
      <PatientShell>
        <div className="prescriptions-page">
          <div className="prescription-detail-view">
            <div className="detail-header">
              <button className="back-btn" onClick={closeDetailView}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to List
              </button>
              <div className="detail-actions">
                <button 
                  className="action-btn download"
                  onClick={() => handleDownloadPDF(selectedPrescription)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>

            <div className="prescription-card-full">
              <div className="prescription-header-full">
                <div className="prescription-doctor-info">
                  <div className="doctor-avatar">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <div className="doctor-details">
                    <h3>Dr. {selectedPrescription.doctorName || selectedPrescription.doctorId || "Unknown Doctor"}</h3>
                    <span className="prescription-date">{formatDate(selectedPrescription.createdAt || selectedPrescription.date)}</span>
                  </div>
                </div>
                <div className="prescription-id">ID: {selectedPrescription._id?.slice(-8) || 'N/A'}</div>
              </div>

              {selectedPrescription.diagnosis && (
                <div className="prescription-section">
                  <h4>Diagnosis</h4>
                  <p className="diagnosis-text">{selectedPrescription.diagnosis}</p>
                </div>
              )}

              <div className="prescription-section">
                <h4>Medicines</h4>
                <div className="medicines-table">
                  <div className="medicine-header">
                    <span>Medicine</span>
                    <span>Dosage</span>
                    <span>Frequency</span>
                    <span>Duration</span>
                  </div>
                  {(selectedPrescription.medicines || []).map((medicine, idx) => (
                    <div key={idx} className="medicine-row">
                      <span className="medicine-name">{medicine.name || medicine}</span>
                      <span>{medicine.dosage || "As prescribed"}</span>
                      <span>{medicine.frequency || "As needed"}</span>
                      <span>{medicine.duration || "Until complete"}</span>
                    </div>
                  ))}
                  {(!selectedPrescription.medicines || selectedPrescription.medicines.length === 0) && (
                    <div className="medicine-row empty">
                      <span colSpan="4">No medicines recorded</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="prescription-section">
                <h4>Instructions</h4>
                <div className="instructions-box">
                  <p>{selectedPrescription.instructions || selectedPrescription.notes || "Take medicines as directed. Contact your doctor if symptoms worsen or persist."}</p>
                </div>
              </div>

              <div className="prescription-footer">
                <div className="prescription-meta">
                  <span className="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Issued on {formatDate(selectedPrescription.createdAt || selectedPrescription.date)}
                  </span>
                  <span className="meta-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    Prescribed by {selectedPrescription.doctorName || selectedPrescription.doctorId || "Doctor"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <div className="prescriptions-page">
        {message && (
          <div className={`message-toast ${message.includes("success") ? "success" : "error"}`}>
            {message}
            <button className="close-message" onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <div className="prescriptions-list-section">
          <div className="section-header-row">
            <h3>My Prescriptions</h3>
            <span className="prescription-count">{prescriptions.length} total</span>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading prescriptions...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="no-prescriptions">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                <path d="m8.5 8.5 7 7"/>
              </svg>
              <h4>No prescriptions found</h4>
              <p>Your doctor-issued prescriptions will appear here</p>
              <button 
                className="browse-doctors-btn"
                onClick={() => window.location.href = '/doctors'}
              >
                Find a Doctor
              </button>
            </div>
          ) : (
            <div className="prescriptions-grid">
              {prescriptions.map((prescription) => (
                <div className="prescription-card" key={prescription._id || prescription.createdAt}>
                  <div className="prescription-card-header">
                    <div className="prescription-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                        <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                        <path d="m8.5 8.5 7 7"/>
                      </svg>
                    </div>
                    <div className="prescription-info">
                      <h4>Dr. {prescription.doctorName || prescription.doctorId || "Unknown"}</h4>
                      <span className="prescription-date-sm">{formatDate(prescription.createdAt || prescription.date)}</span>
                    </div>
                  </div>

                  <div className="prescription-body">
                    <div className="medicine-summary">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                        <path d="m8.5 8.5 7 7"/>
                      </svg>
                      <span>{getMedicineSummary(prescription.medicines)}</span>
                    </div>
                    {prescription.diagnosis && (
                      <p className="diagnosis-preview">{prescription.diagnosis.substring(0, 50)}{prescription.diagnosis.length > 50 ? '...' : ''}</p>
                    )}
                  </div>

                  <div className="prescription-card-footer">
                    <button 
                      className="view-btn-sm"
                      onClick={() => setSelectedPrescription(prescription)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View
                    </button>
                    <button 
                      className="download-btn-sm"
                      onClick={() => handleDownloadPDF(prescription)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PatientShell>
  );
}
