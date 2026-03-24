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
    <PatientShell title="Medical Reports" subtitle="Upload and manage your medical files">
      <article className="pd-card">
        {message ? <p className="muted">{message}</p> : null}
        <form className="pd-form" onSubmit={onUpload}>
          <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button type="submit">Upload Report</button>
        </form>
      </article>
      <div className="pd-list">
        {reports.map((r) => (
          <article className="pd-card" key={r._id || `${r.filePath}-${r.uploadedAt}`}>
            <h4>{r.fileName}</h4>
            <p>{r.fileType || "Unknown type"}</p>
            <div className="pd-actions">
              <a className="mf-primary-btn" href={r.filePath} target="_blank" rel="noreferrer">View</a>
              {r._id ? (
                <button type="button" className="mf-dark-btn" onClick={() => onDelete(r._id)}>
                  Delete
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </PatientShell>
  );
}
