import { useEffect, useState, useMemo } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";
import { useAuthMediaSrc } from "../hooks/useAuthMediaSrc";
import { openProtectedFile, downloadProtectedFile } from "../utils/openProtectedFile";
import { normalizeReportsList, normalizeReportForClient } from "../utils/normalizePatientReports";

const CATEGORIES = ["Lab Results", "Radiology", "Cardiology", "Dermatology", "Monitoring", "Other"];

function ReportIcon({ children, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function IconOpenReport({ size }) {
  return (
    <ReportIcon size={size}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </ReportIcon>
  );
}

function IconUploadCloud({ size }) {
  return (
    <ReportIcon size={size}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </ReportIcon>
  );
}

function IconDownloadReport({ size }) {
  return (
    <ReportIcon size={size}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </ReportIcon>
  );
}

function IconDeleteReport({ size }) {
  return (
    <ReportIcon size={size}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </ReportIcon>
  );
}

function reportLooksLikeImage(report) {
  const ft = report.fileType || "";
  if (ft.includes("image")) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(report.fileName || "");
}

function reportFooterTypeLabel(report) {
  const hasSize = typeof report.fileSize === "number" && report.fileSize > 0;
  if (hasSize) return formatFileSizeStatic(report.fileSize);
  const fn = (report.fileName || "").toLowerCase();
  const ft = (report.fileType || "").toLowerCase();
  if (ft.includes("pdf") || fn.endsWith(".pdf")) return "PDF";
  if (ft.includes("image") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fn)) return "Image";
  if (fn.endsWith(".dcm") || fn.endsWith(".dicom")) return "DICOM";
  return "File";
}

function formatFileSizeStatic(bytes) {
  if (bytes == null || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  return mb < 0.01 ? "< 0.01 MB" : `${mb.toFixed(1)} MB`;
}

function ReportCardThumbnail({ report, token }) {
  const [imgError, setImgError] = useState(false);
  const src = useAuthMediaSrc(report.filePath, token);
  const tryImage = reportLooksLikeImage(report);

  useEffect(() => {
    setImgError(false);
  }, [report._id, report.filePath]);

  if (report.needsReupload) {
    return (
      <div className="report-thumbnail-pdf" style={{ borderColor: "#fbbf24", background: "#fffbeb" }}>
        <span style={{ fontSize: "11px", color: "#b45309", textAlign: "center", padding: "10px", lineHeight: 1.4 }}>
          No working file link for this entry. Delete it, then upload again (files are stored on Cloudinary).
        </span>
      </div>
    );
  }

  if (tryImage && src && !imgError) {
    return (
      <img
        className="report-thumb-img"
        src={src}
        alt=""
        onError={() => setImgError(true)}
        loading="lazy"
      />
    );
  }

  if (tryImage && !src && report.filePath) {
    return (
      <div className="report-thumbnail-pdf" style={{ opacity: 0.6 }}>
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>Loading…</span>
      </div>
    );
  }

  if (tryImage && !report.filePath) {
    return (
      <div className="report-thumbnail-pdf">
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>No preview</span>
      </div>
    );
  }

  const isPdf =
    (report.fileType || "").includes("pdf") || /\.pdf$/i.test(report.fileName || "");
  return (
    <div className="report-thumbnail-pdf">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M9 13h6" />
        <path d="M9 17h3" />
      </svg>
      <span>{isPdf ? "PDF" : "FILE"}</span>
    </div>
  );
}

export default function MedicalReportsPage() {
  const { token, authHeaders } = useAuth();
  const [file, setFile] = useState(null);
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [cloudinaryOffOnServer, setCloudinaryOffOnServer] = useState(false);
  const [cloudinaryApiFail, setCloudinaryApiFail] = useState(null);
  const [patientServiceHealth, setPatientServiceHealth] = useState(null);

  // Upload form state
  const [reportTitle, setReportTitle] = useState("");
  const [category, setCategory] = useState("Lab Results");
  const [relatedDoctor, setRelatedDoctor] = useState("");

  const loadReports = async () => {
    try {
      const res = await api.get("/patients/reports", authHeaders);
      const rawList = res.data.reports || [];
      if (import.meta.env.DEV && res.data._debug) {
        console.debug("[MediFlow reports] listReports _debug", res.data._debug);
      }
      setReports(normalizeReportsList(rawList));
    } catch {
      setReports([]);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/patients/health")
      .then((res) => {
        if (cancelled) return;
        const h = res.data;
        setPatientServiceHealth(h || null);
        setCloudinaryOffOnServer(h?.cloudinaryConfigured === false);
        if (h?.cloudinaryConfigured && h?.cloudinaryApiOk === false) {
          setCloudinaryApiFail(h?.cloudinaryPingMessage || "Cloudinary API ping failed");
        } else {
          setCloudinaryApiFail(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPatientServiceHealth(null);
          setCloudinaryOffOnServer(false);
          setCloudinaryApiFail(null);
        }
      });
    return () => {
      cancelled = true;
    };
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
    if (dateRange.start) {
      filtered = filtered.filter(r => new Date(r.uploadedAt || r.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(r => new Date(r.uploadedAt || r.createdAt) <= new Date(dateRange.end + 'T23:59:59'));
    }
    return filtered;
  }, [reports, activeCategory, searchQuery, dateRange]);

  const categoryCounts = useMemo(() => {
    const counts = { All: reports.length };
    CATEGORIES.forEach(cat => {
      counts[cat] = reports.filter(r => (r.category || "Lab Results") === cat).length;
    });
    return counts;
  }, [reports]);

  const staleReportCount = useMemo(
    () => reports.filter((r) => r.needsReupload).length,
    [reports]
  );

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
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadRes = await api.post("/patients/upload-report", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(import.meta.env.DEV ? { "X-MediFlow-Debug-Upload": "1" } : {})
        },
        timeout: 120000,
        onUploadProgress: (ev) => {
          if (ev.total) {
            setUploadProgress(Math.min(99, Math.round((ev.loaded * 100) / ev.total)));
          }
        }
      });
      if (import.meta.env.DEV) {
        const rev = uploadRes.headers["x-mediflow-patient-service-revision"];
        const eng = uploadRes.headers["x-mediflow-upload-engine"];
        const list = uploadRes.data?.reports || [];
        const last = list[list.length - 1];
        const lastNorm = last ? normalizeReportForClient(last) : null;
        console.debug("[MediFlow reports] upload-report response", {
          headers: { revision: rev, uploadEngine: eng },
          lastReportFilePath: lastNorm?.filePath,
          lastReportNeedsReupload: lastNorm?.needsReupload,
          _debug: uploadRes.data?._debug,
          _uploadTrace: uploadRes.data?._uploadTrace
        });
        if (uploadRes.data?._uploadTrace?.steps) {
          console.table(uploadRes.data._uploadTrace.steps);
        }
        if (last && String(last.filePath || "").includes("/api/patients/uploads")) {
          console.debug(
            "[MediFlow reports] Upload response still has disk /uploads/ path — use patient-service with revision on /health and Cloudinary."
          );
        }
      }
      setUploadProgress(100);
      setTimeout(() => {
        setFile(null);
        setReportTitle("");
        setRelatedDoctor("");
        setUploadProgress(0);
        setIsUploading(false);
        setMessage("Report uploaded successfully");
        loadReports();
      }, 400);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setUploadProgress(0);
      setIsUploading(false);
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

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  };

  const showStaleReportsHint =
    staleReportCount > 0 &&
    !cloudinaryOffOnServer &&
    !cloudinaryApiFail &&
    (patientServiceHealth == null || patientServiceHealth.cloudinaryApiOk === true);

  return (
    <PatientShell>
      <div className="medical-reports-page">
        {message && (
          <div className={`message-toast ${message.includes("success") ? "success" : "error"}`}>
            {message}
          </div>
        )}

        {(cloudinaryOffOnServer || cloudinaryApiFail) && (
          <div
            className="message-toast error"
            style={{ marginBottom: "12px", textAlign: "left", lineHeight: 1.5 }}
            role="alert"
          >
            {cloudinaryOffOnServer && (
              <p style={{ margin: "0 0 8px" }}>
                <strong>Cloudinary is off</strong> on patient-service (<code>/api/patients/health</code> →{" "}
                <code>cloudinaryConfigured: false</code>). Add <code>CLOUDINARY_CLOUD_NAME</code>,{" "}
                <code>CLOUDINARY_API_KEY</code>, <code>CLOUDINARY_API_SECRET</code> to{" "}
                <code>backend/services/patient-service/.env</code> (same file if you use Docker), restart, then reload
                this page. After uploads work, delete old report cards that used <code>/uploads/</code> paths.
              </p>
            )}
            {cloudinaryApiFail && (
              <p style={{ margin: 0 }}>
                <strong>Cloudinary credentials fail API check</strong> (<code>cloudinaryApiOk: false</code>). Copy keys
                from Cloudinary Console → Programmable Media → API Keys (same cloud as{" "}
                <code>CLOUDINARY_CLOUD_NAME</code>). {cloudinaryApiFail}
              </p>
            )}
          </div>
        )}

        {showStaleReportsHint && (
          <div
            className="message-toast warning"
            style={{ marginBottom: "12px", textAlign: "left", lineHeight: 1.5 }}
            role="status"
          >
            <p style={{ margin: 0 }}>
              <strong>Some reports need a fresh upload</strong> ({staleReportCount}): older file links no longer work.
              Delete those cards here, or run <code>npm run cleanup:legacy-disk-reports</code> in{" "}
              <code>patient-service</code> (set <code>APPLY_LEGACY_REPORT_CLEANUP=1</code> to apply), then upload again —
              new files are stored on Cloudinary.
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="reports-grid">
          {/* Left Column - Upload */}
          <div className="upload-section">
            <div className="profile-section reports-upload-panel">
              <div className="section-header reports-upload-header">
                <span className="reports-upload-header-icon" aria-hidden>
                  <ReportIcon size={22}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </ReportIcon>
                </span>
                <div>
                  <h3>Upload New Report</h3>
                  <p className="reports-upload-subtitle">PDF, scans, or images — stored securely</p>
                </div>
              </div>
              
              <form onSubmit={onUpload}>
                {/* Drop Zone */}
                <div 
                  className={`drop-zone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && document.getElementById("file-input").click()}
                >
                  <input 
                    id="file-input"
                    type="file" 
                    accept=".pdf,image/*,.dcm" 
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ display: "none" }}
                    disabled={isUploading}
                  />
                  
                  {/* File Type Icons */}
                  <div className="file-type-icons">
                    <div className="file-icon pdf">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <path d="M9 13h6"/><path d="M9 17h3"/>
                      </svg>
                    </div>
                    <div className="file-icon image">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="m21 15-5-5L5 21"/>
                      </svg>
                    </div>
                    <div className="file-icon dicom">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                        <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                        <path d="M8.5 8.5A2.5 2.5 0 0 0 11 11"/>
                        <path d="M15.5 8.5A2.5 2.5 0 0 1 13 11"/>
                      </svg>
                    </div>
                  </div>
                  
                  <p className="drop-zone-text">
                    {file ? file.name : "Drop files here or click to browse"}
                  </p>
                  <p className="drop-zone-hint">
                    PDF, JPG, PNG, DICOM up to 20MB
                  </p>
                  
                  {/* Upload Progress Bar */}
                  {isUploading && (
                    <div className="upload-progress-container">
                      <div className="upload-progress-bar">
                        <div 
                          className="upload-progress-fill" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <span className="upload-progress-text">{uploadProgress}%</span>
                    </div>
                  )}
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
                  <IconUploadCloud size={18} />
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
              
              {/* Date Range Filter */}
              <div className="date-range-filter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  placeholder="From"
                />
                <span className="date-separator">to</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  placeholder="To"
                />
                {(dateRange.start || dateRange.end) && (
                  <button 
                    className="clear-date-filter"
                    onClick={() => setDateRange({ start: "", end: "" })}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
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
                  <article className="report-card report-card-pro" key={report._id || report.filePath}>
                    <div className="report-card-media">
                      <div className="report-thumbnail report-thumbnail-square">
                        <ReportCardThumbnail report={report} token={token} />
                        <span className="report-file-kind-badge" aria-hidden>
                          {report.needsReupload
                            ? "!"
                            : reportLooksLikeImage(report)
                              ? "IMG"
                              : (report.fileType || "").includes("pdf") || /\.pdf$/i.test(report.fileName || "")
                                ? "PDF"
                                : "FILE"}
                        </span>
                      </div>
                      <div className="report-overlay report-overlay-pro">
                        <button
                          type="button"
                          className="report-overlay-open"
                          disabled={!report.filePath || report.needsReupload}
                          onClick={() => openProtectedFile(report.filePath, token)}
                          title="Open report"
                        >
                          <IconOpenReport size={22} />
                          <span>Open</span>
                        </button>
                      </div>
                    </div>

                    <div className="report-info report-info-pro">
                      <div className="report-header">
                        <h4>{report.title || report.fileName || "Untitled Report"}</h4>
                        <span className={`category-badge ${(report.category || "lab-results").toLowerCase().replace(" ", "-")}`}>
                          {report.category || "Lab Results"}
                        </span>
                      </div>

                      {report.needsReupload && (
                        <p className="report-legacy-hint">
                          No working file link. Delete this entry, then upload again — new files are stored on Cloudinary.
                        </p>
                      )}

                      {report.doctor && (
                        <div className="report-doctor">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" aria-hidden>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>Dr. {report.doctor}</span>
                        </div>
                      )}

                      <div className="report-meta-row">
                        <span className="report-date">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {formatDate(report.uploadedAt || report.createdAt)}
                        </span>
                        <span className="report-size-pill">{reportFooterTypeLabel(report)}</span>
                      </div>

                      <div className="report-actions-pro" role="group" aria-label="Report actions">
                        <button
                          type="button"
                          className="report-action-tile report-action-open"
                          title="Open report"
                          disabled={!report.filePath || report.needsReupload}
                          onClick={() => openProtectedFile(report.filePath, token)}
                        >
                          <IconOpenReport size={20} />
                          <span>Open</span>
                        </button>
                        <button
                          type="button"
                          className="report-action-tile report-action-download"
                          title="Download"
                          disabled={!report.filePath || report.needsReupload}
                          onClick={() =>
                            downloadProtectedFile(
                              report.filePath,
                              token,
                              report.fileName || "report"
                            )
                          }
                        >
                          <IconDownloadReport size={20} />
                          <span>Download</span>
                        </button>
                        {report._id && (
                          <button
                            type="button"
                            className="report-action-tile report-action-delete"
                            onClick={() => onDelete(report._id)}
                            title="Delete report"
                          >
                            <IconDeleteReport size={20} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PatientShell>
  );
}
