import { useEffect, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PrescriptionsPage() {
  const { authHeaders } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    api
      .get("/patients/prescriptions", authHeaders)
      .then((res) => setPrescriptions(res.data.prescriptions || []))
      .catch(() => setPrescriptions([]));
  }, [authHeaders]);

  return (
    <PatientShell>
      <div className="profile-dashboard">
        <div className="profile-section">
          <div className="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <h3>Prescriptions</h3>
          </div>
          {prescriptions.length === 0 ? (
            <p style={{color: '#64748b'}}>No prescriptions found.</p>
          ) : (
            <div className="profile-grid" style={{gridTemplateColumns: '1fr'}}>
              {prescriptions.map((item) => (
                <div className="info-item" key={item._id || item.createdAt} style={{padding: '16px', background: '#f8fafc', borderRadius: '12px'}}>
                  <span className="info-label">Doctor: {item.doctorId || "N/A"}</span>
                  <span className="info-value">{item.notes || "No notes"}</span>
                  <p style={{fontSize: '13px', color: '#64748b', marginTop: '8px'}}>Medicines: {(item.medicines || []).join(", ") || "N/A"}</p>
                  <small style={{color: '#94a3b8'}}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PatientShell>
  );
}
