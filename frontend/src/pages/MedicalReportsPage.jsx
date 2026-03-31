import { useEffect, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function MedicalReportsPage() {
  const { token, authHeaders } = useAuth();
  const [file, setFile] = useState(null);
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState("");

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

  const onUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("Choose PDF/Image report first");
      return;
    }
    const formData = new FormData();
    formData.append("report", file);
    try {
      await api.post("/patients/upload-report", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      setFile(null);
      setMessage("Report uploaded");
      loadReports();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Upload failed");
    }
  };

  const onDelete = async (id) => {
    try {
      await api.delete(`/patients/reports/${id}`, authHeaders);
      loadReports();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Delete failed");
    }
  };

  return (
    <PatientShell>
      <div className="profile-dashboard">
        <div className="profile-section">
          <div className="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <h3>Medical Reports</h3>
          </div>
          {message && <p className="muted">{message}</p>}
          <form className="edit-form" onSubmit={onUpload}>
            <div className="form-field full-width">
              <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <button type="submit" className="save-btn">Upload Report</button>
          </form>
        </div>
        
        <div className="profile-grid" style={{gridTemplateColumns: '1fr', marginTop: '24px'}}>
          {reports.map((r) => (
            <div className="profile-section" key={r._id || `${r.filePath}-${r.uploadedAt}`}>
              <h4>{r.fileName}</h4>
              <p style={{color: '#64748b', fontSize: '13px', marginBottom: '12px'}}>{r.fileType || "Unknown type"}</p>
              <div className="form-actions">
                <a className="save-btn" href={r.filePath} target="_blank" rel="noreferrer">View</a>
                {r._id && (
                  <button type="button" className="cancel-btn" onClick={() => onDelete(r._id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PatientShell>
  );
}
