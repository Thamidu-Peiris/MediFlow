import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

const CATEGORIES = ["Lab Results", "Radiology", "Cardiology", "Dermatology", "Monitoring", "Other"];

export default function MedicalReportsPage() {
  const { token, authHeaders, user } = useAuth();
  const [file, setFile] = useState(null);
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isDragging, setIsDragging] = useState(false);
  
  // Upload form state
  const [reportTitle, setReportTitle] = useState("");
  const [category, setCategory] = useState("Lab Results");
  const [relatedDoctor, setRelatedDoctor] = useState("");

  const loadReports = async () => {
    try {
      const res = await api.get("/patients/reports", authHeaders);
      setReports(res.data.reports || []);
    } catch {
      setReports([]);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    let filtered = reports;
    if (activeCategory !== "All") {
      filtered = filtered.filter(r => (r.category || "Lab Results") === activeCategory);
    }
    if (searchQuery.trim()) {
      filtered = filtered.filter(r => 
        (r.fileName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.title || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [reports, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = { All: reports.length };
    CATEGORIES.forEach(cat => {
      counts[cat] = reports.filter(r => (r.category || "Lab Results") === cat).length;
    });
    return counts;
  }, [reports]);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Choose PDF/Image report first");
      return;
    }
    const formData = new FormData();
    formData.append("report", file);
    formData.append("title", reportTitle || file.name);
    formData.append("category", category);
    formData.append("doctor", relatedDoctor);
    try {
      await api.post("/patients/upload-report", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      setFile(null);
      setReportTitle("");
      setRelatedDoctor("");
      setMessage("Report uploaded successfully");
      loadReports();
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Upload failed");
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      await api.delete(`/patients/reports/${id}`, authHeaders);
      loadReports();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Delete failed");
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 MB";
    const mb = bytes / (1024 * 1024);
    return mb < 0.01 ? "< 0.01 MB" : `${mb.toFixed(1)} MB`;
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  return (
    <PatientShell>
      <div className="medical-reports-page">
        {message && (
          <div className={`message-toast ${message.includes("success") ? "success" : "error"}`}>
            {message}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="reports-grid">
          {/* Left Column - Upload */}
          <div className="upload-section">
            <div className="profile-section">
              <div className="section-header">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <h3>Upload New Report</h3>
              </div>
              
              <form onSubmit={onUpload}>
                {/* Drop Zone */}
                <div 
                  className={`drop-zone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input").click()}
                >
                  <input 
                    id="file-input"
                    type="file" 
                    accept=".pdf,image/*,.dcm" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                  />
                  <div className="drop-zone-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="drop-zone-text">
                    {file ? file.name : "Drop files here"}
                  </p>
                  <p className="drop-zone-hint">
                    PDF, JPG, PNG, DICOM up to 20MB
                  </p>
                </div>

                {/* Form Fields */}
                <div className="upload-form-fields">
                  <div className="form-field">
                    <label>Report Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Blood Test Results - March 2026"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-field">
                    <label>Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Related Doctor</label>
                    <input 
                      type="text" 
                      placeholder="Doctor name (optional)"
                      value={relatedDoctor}
                      onChange={(e) => setRelatedDoctor(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="upload-report-btn" disabled={!file}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Report
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Reports List */}
          <div className="reports-list-section">
            {/* Search & Filters */}
            <div className="reports-toolbar">
              <div className="search-reports">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input 
                  type="text" 
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
              <button 
                className={`category-tab ${activeCategory === "All" ? "active" : ""}`}
                onClick={() => setActiveCategory("All")}
              >
                <span className="tab-badge all">All</span>
              </button>
              {CATEGORIES.map(cat => (
                <button 
                  key={cat}
                  className={`category-tab ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat} <span className="tab-count">({categoryCounts[cat] || 0})</span>
                </button>
              ))}
            </div>

            {/* Reports Grid */}
            <div className="reports-cards-grid">
              {filteredReports.length === 0 ? (
                <div className="no-reports">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <p>No reports found</p>
                  <span>Upload your first medical report to get started</span>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div className="report-card" key={report._id || report.filePath}>
                    {/* Thumbnail */}
                    <div className="report-thumbnail">
                      {report.fileType?.includes("image") || report.fileName?.match(/\.(jpg|jpeg|png|gif|dcm)$/i) ? (
                        <img src={report.filePath} alt={report.fileName} />
                      ) : (
                        <div className="report-thumbnail-pdf">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13h6"/><path d="M9 17h3"/>
                          </svg>
                          <span>PDF</span>
                        </div>
                      )}
                      <div className="report-overlay">
                        <button className="view-btn" onClick={() => window.open(report.filePath, "_blank")}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Report Info */}
                    <div className="report-info">
                      <div className="report-header">
                        <h4>{report.title || report.fileName || "Untitled Report"}</h4>
                        <span className={`category-badge ${(report.category || "lab-results").toLowerCase().replace(" ", "-")}`}>
                          {report.category || "Lab Results"}
                        </span>
                      </div>

                      {report.doctor && (
                        <div className="report-doctor">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span>Dr. {report.doctor}</span>
                        </div>
                      )}

                      <div className="report-tags">
                        <span className="report-tag">{report.category || "Lab Results"}</span>
                        <span className="report-tag">Routine</span>
                      </div>

                      <div className="report-footer">
                        <div className="report-meta">
                          <span className="report-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {formatDate(report.uploadedAt || report.createdAt)}
                          </span>
                          <span className="report-size">
                            {report.fileSize ? formatFileSize(report.fileSize) : "PDF"}
                          </span>
                        </div>
                        <div className="report-actions">
                          <a 
                            href={report.filePath} 
                            target="_blank" 
                            rel="noreferrer"
                            className="action-btn download"
                            title="Download"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                          </a>
                          <button 
                            className="action-btn view"
                            onClick={() => window.open(report.filePath, "_blank")}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
                            </svg>
                          </button>
                          {report._id && (
                            <button 
                              className="action-btn delete"
                              onClick={() => onDelete(report._id)}
                              title="Delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PatientShell>
  );
}
