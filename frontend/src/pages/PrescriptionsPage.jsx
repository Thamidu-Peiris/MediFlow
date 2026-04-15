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
      <div className="prescriptions-page">
        {message && (
          <div className={`message-toast ${message.includes("success") ? "success" : "error"}`}>
            {message}
            <button className="close-message" onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <div className="prescriptions-container">
          {/* Header with Stats */}
          <div className="prescriptions-header-bar">
            <div className="prescriptions-title-section">
              <h2>My Prescriptions</h2>
              <p className="prescriptions-subtitle">Manage your medications and treatment plans</p>
            </div>
            <div className="prescriptions-stats">
              <div className="stat-pill active">
                <span className="stat-number">{prescriptions.filter(p => !p.endDate || new Date(p.endDate) > new Date()).length}</span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-pill total">
                <span className="stat-number">{prescriptions.length}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
          </div>

          {/* Filters Toolbar */}
          <div className="prescriptions-toolbar">
            <div className="search-prescriptions">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input 
                type="text" 
                placeholder="Search by doctor, diagnosis, or medicine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              
              <div className="date-range-prescription">
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="From"
                />
                <span>to</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="To"
                />
                {(dateRange.start || dateRange.end) && (
                  <button 
                    className="clear-filter-btn"
                    onClick={() => setDateRange({ start: "", end: "" })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results Count */}
          {(searchQuery || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
            <div className="results-info">
              Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
              {(searchQuery || statusFilter !== 'all' || dateRange.start || dateRange.end) && (
                <button 
                  className="clear-all-filters"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setDateRange({ start: '', end: '' });
                  }}
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="loading-state prescriptions-loading">
              <div className="spinner"></div>
              <p>Loading prescriptions...</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            <div className="no-prescriptions">
              <div className="no-prescriptions-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                  <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                  <path d="m8.5 8.5 7 7"/>
                </svg>
              </div>
              <h4>{prescriptions.length === 0 ? "No prescriptions found" : "No matching prescriptions"}</h4>
              <p>{prescriptions.length === 0 
                ? "Your doctor-issued prescriptions will appear here" 
                : "Try adjusting your search or filters"}</p>
              {prescriptions.length === 0 && (
                <button 
                  className="browse-doctors-btn"
                  onClick={() => window.location.href = '/patient/doctors'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Find a Doctor
                </button>
              )}
            </div>
          ) : (
            <div className="prescriptions-grid-modern">
              {filteredPrescriptions.map((prescription) => {
                const status = getStatusBadge(prescription);
                return (
                  <div 
                    className="prescription-card-modern" 
                    key={prescription._id || prescription.createdAt}
                    onClick={() => setSelectedPrescription(prescription)}
                  >
                    <div className="prescription-card-top">
                      <div className={`status-indicator ${status.class}`}>
                        <span className="status-dot"></span>
                        {status.label}
                      </div>
                      <span className="prescription-date">{formatDate(prescription.createdAt || prescription.date)}</span>
                    </div>

                    <div className="prescription-card-doctor">
                      <div className="doctor-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                          <circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div className="doctor-info">
                        <h4>Dr. {prescription.doctorName || prescription.doctorId || "Unknown"}</h4>
                        {prescription.doctorSpecialty && (
                          <span className="doctor-specialty">{prescription.doctorSpecialty}</span>
                        )}
                      </div>
                    </div>

                    {prescription.diagnosis && (
                      <div className="prescription-diagnosis">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <span>{prescription.diagnosis}</span>
                      </div>
                    )}

                    <div className="prescription-medicines-preview">
                      <div className="medicine-icon-stack">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                          <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                          <path d="m8.5 8.5 7 7"/>
                        </svg>
                      </div>
                      <span className="medicine-count">{getMedicineSummary(prescription.medicines)}</span>
                    </div>

                    <div className="prescription-card-actions">
                      <button 
                        className="action-btn view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPrescription(prescription);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View Details
                      </button>
                      <button 
                        className="action-btn download"
                        onClick={(e) => handleDownloadPDF(prescription, e)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
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
          <div className="prescription-modal-overlay" onClick={closeDetailModal}>
            <div className="prescription-modal" onClick={(e) => e.stopPropagation()}>
              <button className="prescription-modal-close" onClick={closeDetailModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              <div className="prescription-modal-header">
                <div className="prescription-doctor-avatar">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="1.5">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div className="prescription-header-info">
                  <h3>Dr. {selectedPrescription.doctorName || selectedPrescription.doctorId || "Unknown Doctor"}</h3>
                  <span className="prescription-date-badge">{formatDate(selectedPrescription.createdAt || selectedPrescription.date)}</span>
                </div>
              </div>

              <div className="prescription-modal-body">
                {selectedPrescription.diagnosis && (
                  <div className="prescription-detail-section">
                    <h4>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      Diagnosis
                    </h4>
                    <p className="diagnosis-text">{selectedPrescription.diagnosis}</p>
                  </div>
                )}

                <div className="prescription-detail-section">
                  <h4>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
                      <path d="m8.5 8.5 7 7"/>
                    </svg>
                    Medicines
                  </h4>
                  <div className="medicines-list">
                    {(selectedPrescription.medicines || []).map((medicine, idx) => (
                      <div key={idx} className="medicine-card">
                        <div className="medicine-card-header">
                          <span className="medicine-number">{idx + 1}</span>
                          <span className="medicine-card-name">{medicine.name || medicine}</span>
                        </div>
                        <div className="medicine-card-details">
                          <span className="medicine-tag dosage">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                            </svg>
                            {medicine.dosage || "As prescribed"}
                          </span>
                          <span className="medicine-tag frequency">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {medicine.frequency || "As needed"}
                          </span>
                          <span className="medicine-tag duration">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2"/>
                              <line x1="16" y1="2" x2="16" y2="6"/>
                              <line x1="8" y1="2" x2="8" y2="6"/>
                              <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {medicine.duration || "Until complete"}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!selectedPrescription.medicines || selectedPrescription.medicines.length === 0) && (
                      <div className="no-medicines">
                        <p>No medicines recorded for this prescription.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="prescription-detail-section">
                  <h4>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                      <path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/>
                      <path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/>
                      <path d="M12 16v4"/>
                      <path d="M8 21h8"/>
                    </svg>
                    Instructions
                  </h4>
                  <div className="instructions-card">
                    <p>{selectedPrescription.instructions || selectedPrescription.notes || "Take medicines as directed. Contact your doctor if symptoms worsen or persist."}</p>
                  </div>
                </div>
              </div>

              <div className="prescription-modal-footer">
                <div className="prescription-meta-info">
                  <span className="meta-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Issued {formatDate(selectedPrescription.createdAt || selectedPrescription.date)}
                  </span>
                  <span className="meta-badge id-badge">
                    ID: {selectedPrescription._id?.slice(-8) || 'N/A'}
                  </span>
                </div>
                <button 
                  className="download-prescription-btn"
                  onClick={() => handleDownloadPDF(selectedPrescription)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
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
