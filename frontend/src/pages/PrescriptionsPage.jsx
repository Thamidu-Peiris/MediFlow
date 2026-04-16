import { useEffect, useState, useMemo } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PrescriptionsPage() {
  const { authHeaders } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

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
    const firstMed = medicines[0].name || (typeof medicines[0] === 'string' ? medicines[0] : "Unnamed Medicine");
    if (medicines.length === 1) return firstMed;
    return `${firstMed} +${medicines.length - 1} more`;
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

  const closeDetailModal = () => {
    setSelectedPrescription(null);
  };

  const filteredPrescriptions = useMemo(() => {
    let filtered = prescriptions;
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        (p.doctorName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.diagnosis || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.medicines || []).some(m => 
          (m.name || m || "").toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
    
    if (statusFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(p => {
        const endDate = p.endDate ? new Date(p.endDate) : null;
        if (statusFilter === "active") {
          return !endDate || endDate > now;
        } else {
          return endDate && endDate <= now;
        }
      });
    }
    
    if (dateRange.start) {
      filtered = filtered.filter(p => new Date(p.createdAt || p.date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(p => new Date(p.createdAt || p.date) <= new Date(dateRange.end + 'T23:59:59'));
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
  }, [prescriptions, searchQuery, statusFilter, dateRange]);

  const getStatusBadge = (prescription) => {
    const endDate = prescription.endDate ? new Date(prescription.endDate) : null;
    const now = new Date();
    if (!endDate || endDate > now) {
      return { label: "Active", class: "status-active" };
    }
    return { label: "Completed", class: "status-completed" };
  };

  return (
    <PatientShell>
      <div className="at-rx-page">
        {message && (
          <div className={`at-toast ${message.includes("success") ? "at-toast-success" : "at-toast-error"}`}>
            <span className="material-symbols-outlined" style={{fontSize: "20px"}}>
              {message.includes("success") ? "check_circle" : "error"}
            </span>
            {message}
          </div>
        )}

        <div className="at-rx-container">
          {/* Header with Stats */}
          <header className="at-rx-header">
            <div className="at-rx-header-text">
              <h1 className="at-rx-title">My Prescriptions</h1>
              <p className="at-rx-subtitle">Manage your medications and treatment plans</p>
            </div>
            <div className="at-rx-stats">
              <div className="at-stat-pill at-stat-active">
                <span className="at-stat-number">{prescriptions.filter(p => !p.endDate || new Date(p.endDate) > new Date()).length}</span>
                <span className="at-stat-label">Active</span>
              </div>
              <div className="at-stat-pill at-stat-total">
                <span className="at-stat-number">{prescriptions.length}</span>
                <span className="at-stat-label">Total</span>
              </div>
            </div>
          </header>

          {/* Filters Toolbar */}
          <div className="at-rx-toolbar">
            <div className="at-search-box">
              <span className="material-symbols-outlined" style={{fontSize: "20px", color: "#94a3b8"}}>search</span>
              <input 
                type="text" 
                className="at-search-input"
                placeholder="Search by doctor, diagnosis, or medicine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="at-filter-group">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="at-select at-select-filter"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              
              <div className="at-date-filter">
                <input 
                  type="date" 
                  className="at-date-input"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="From"
                />
                <span className="at-date-separator">to</span>
                <input 
                  type="date" 
                  className="at-date-input"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="To"
                />
                {(dateRange.start || dateRange.end) && (
                  <button 
                    className="at-btn-clear-date"
                    onClick={() => setDateRange({ start: "", end: "" })}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: "16px"}}>close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Count */}
          {(searchQuery || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
            <div className="at-results-info">
              Showing <strong>{filteredPrescriptions.length}</strong> of {prescriptions.length} prescriptions
              <button 
                className="at-btn-clear-all"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateRange({ start: '', end: '' });
                }}
              >
                Clear all
              </button>
            </div>
          )}

          {loading ? (
            <div className="at-loading-state">
              <div className="at-spinner"></div>
              <p>Loading prescriptions...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="at-empty-state">
              <div className="at-empty-icon at-empty-icon-rx">
                <span className="material-symbols-outlined" style={{fontSize: "48px", color: "#94a3b8"}}>vaccines</span>
              </div>
              <h3 className="at-empty-title">{prescriptions.length === 0 ? "No prescriptions found" : "No matching prescriptions"}</h3>
              <p className="at-empty-text">{prescriptions.length === 0 
                ? "Your doctor-issued prescriptions will appear here" 
                : "Try adjusting your search or filters"}</p>
              {prescriptions.length === 0 && (
                <button 
                  className="at-btn-find-doctor"
                  onClick={() => window.location.href = '/patient/doctors'}
                >
                  <span className="material-symbols-outlined" style={{fontSize: "18px"}}>person_search</span>
                  Find a Doctor
                </button>
              )}
            </div>
          ) : (
            <div className="at-rx-grid">
              {filteredPrescriptions.map((prescription) => {
                const status = getStatusBadge(prescription);
                return (
                  <div 
                    className="at-rx-card" 
                    key={prescription._id || prescription.createdAt}
                    onClick={() => setSelectedPrescription(prescription)}
                  >
                    <div className="at-rx-card-top">
                      <span className={`at-rx-status at-rx-status-${status.class.replace('status-', '')}`}>
                        <span className="at-rx-status-dot"></span>
                        {status.label}
                      </span>
                      <span className="at-rx-date">{formatDate(prescription.createdAt || prescription.date)}</span>
                    </div>

                    <div className="at-rx-doctor">
                      <div className="at-rx-doctor-icon">
                        <span className="material-symbols-outlined" style={{fontSize: "20px", color: "#0d9488"}}>stethoscope</span>
                      </div>
                      <div className="at-rx-doctor-info">
                        <h4>{prescription.doctorName || prescription.doctorId || "Unknown Doctor"}</h4>
                        <span className="at-rx-date-small">
                          {formatDate(prescription.createdAt || prescription.date)}
                        </span>
                      </div>
                    </div>

                    {prescription.notes && (
                      <div className="at-rx-diagnosis">
                        <span className="material-symbols-outlined" style={{fontSize: "16px", color: "#64748b"}}>description</span>
                        <span>{prescription.notes}</span>
                      </div>
                    )}

                    <div className="at-rx-medicines">
                      <span className="material-symbols-outlined" style={{fontSize: "16px", color: "#0d9488"}}>medication</span>
                      <span className="at-rx-medicine-count">{getMedicineSummary(prescription.medicines)}</span>
                    </div>

                    <div className="at-rx-actions">
                      <button 
                        className="at-btn-rx at-btn-rx-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPrescription(prescription);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{fontSize: "18px"}}>visibility</span>
                        View
                      </button>
                      <button 
                        className="at-btn-rx at-btn-rx-download"
                        onClick={(e) => handleDownloadPDF(prescription, e)}
                      >
                        <span className="material-symbols-outlined" style={{fontSize: "18px"}}>download</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Detail Modal */}
        {selectedPrescription && (
          <div className="at-modal-overlay" onClick={closeDetailModal}>
            <div className="at-modal at-modal-rx" onClick={(e) => e.stopPropagation()}>
              <button className="at-modal-close" onClick={closeDetailModal}>
                <span className="material-symbols-outlined" style={{fontSize: "24px"}}>close</span>
              </button>

              <div className="at-modal-header">
                <div className="at-modal-avatar">
                  <span className="material-symbols-outlined" style={{fontSize: "32px", color: "#0d9488"}}>account_circle</span>
                </div>
                <div className="at-modal-header-info">
                  <h3>Dr. {selectedPrescription.doctorName || selectedPrescription.doctorId || "Unknown Doctor"}</h3>
                  <span className="at-modal-date">{formatDate(selectedPrescription.createdAt || selectedPrescription.date)}</span>
                </div>
              </div>

              <div className="at-modal-body">
                {selectedPrescription.notes && (
                  <div className="at-rx-section">
                    <h4 className="at-rx-section-title">
                      <span className="material-symbols-outlined" style={{fontSize: "18px"}}>description</span>
                      Notes
                    </h4>
                    <p className="at-rx-diagnosis-text">{selectedPrescription.notes}</p>
                  </div>
                )}

                <div className="at-rx-section">
                  <h4 className="at-rx-section-title">
                    <span className="material-symbols-outlined" style={{fontSize: "18px"}}>medication</span>
                    Medicines
                  </h4>
                  <div className="at-medicine-list">
                    {(selectedPrescription.medicines || []).map((medicine, idx) => (
                      <div key={idx} className="at-medicine-card">
                        <div className="at-medicine-header">
                          <span className="at-medicine-number">{idx + 1}</span>
                          <span className="at-medicine-name">{medicine.name || medicine}</span>
                        </div>
                        <div className="at-medicine-tags">
                          <span className="at-medicine-tag at-tag-dosage">
                            <span className="material-symbols-outlined" style={{fontSize: "12px"}}>medical_services</span>
                            {medicine.dosage || "As prescribed"}
                          </span>
                          <span className="at-medicine-tag at-tag-frequency">
                            <span className="material-symbols-outlined" style={{fontSize: "12px"}}>schedule</span>
                            {medicine.frequency || "As needed"}
                          </span>
                          <span className="at-medicine-tag at-tag-duration">
                            <span className="material-symbols-outlined" style={{fontSize: "12px"}}>event</span>
                            {medicine.duration || "Until complete"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!selectedPrescription.medicines || selectedPrescription.medicines.length === 0) && (
                      <div className="at-no-medicines">
                        <p>No medicines recorded for this prescription.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="at-rx-section">
                  <h4 className="at-rx-section-title">
                    <span className="material-symbols-outlined" style={{fontSize: "18px"}}>info</span>
                    Instructions
                  </h4>
                  <div className="at-instructions-card">
                    <p>Take medicines as directed. Contact your doctor if symptoms worsen or persist.</p>
                  </div>
                </div>
              </div>

              <div className="at-modal-footer">
                <div className="at-rx-meta">
                  <span className="at-meta-badge">
                    <span className="material-symbols-outlined" style={{fontSize: "14px"}}>schedule</span>
                    Issued {formatDate(selectedPrescription.createdAt || selectedPrescription.date)}
                  </span>
                  <span className="at-meta-badge at-meta-id">
                    ID: {selectedPrescription._id?.slice(-8) || 'N/A'}
                  </span>
                </div>
                <button 
                  className="at-btn-download-rx"
                  onClick={() => handleDownloadPDF(selectedPrescription)}
                >
                  <span className="material-symbols-outlined" style={{fontSize: "18px"}}>download</span>
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PatientShell>
  );
}
