import { useEffect, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function MedicalHistoryPage() {
  const { authHeaders } = useAuth();
  const [data, setData] = useState({ medicalHistory: [], diagnoses: [] });

  useEffect(() => {
    api.get("/patients/history", authHeaders).then((res) => {
      setData({
        medicalHistory: res.data.medicalHistory || [],
        diagnoses: res.data.diagnoses || []
      });
    }).catch(() => setData({ medicalHistory: [], diagnoses: [] }));
  }, [authHeaders]);

  return (
    <PatientShell>
      <div className="profile-dashboard">
        {/* Welcome Stats */}
        <div className="profile-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px'}}>
          <div className="profile-section" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div className="stat-icon calendar" style={{width: '48px', height: '48px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <span className="stat-number">{0}</span>
              <p style={{margin: '0', fontSize: '13px', color: '#64748b'}}>Upcoming Appointments</p>
            </div>
          </div>
          
          <div className="profile-section" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div className="stat-icon file" style={{width: '48px', height: '48px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div>
              <span className="stat-number">{0}</span>
              <p style={{margin: '0', fontSize: '13px', color: '#64748b'}}>Recent Prescriptions</p>
            </div>
          </div>
          
          <div className="profile-section" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div className="stat-icon pill" style={{width: '48px', height: '48px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
              </svg>
            </div>
            <div>
              <span className="stat-number">0</span>
              <p style={{margin: '0', fontSize: '13px', color: '#64748b'}}>Active Medications</p>
            </div>
          </div>
        </div>
        
        {/* Medical History */}
        <div className="profile-section">
          <div className="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <h3>Medical History</h3>
          </div>
          <div className="profile-grid" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
            <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px'}}>
              <h4 style={{margin: '0 0 16px', fontSize: '14px', color: '#64748b'}}>History Records</h4>
              {data.medicalHistory.length === 0 ? (
                <p style={{color: '#94a3b8', fontSize: '13px'}}>No records yet.</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {data.medicalHistory.map((item, i) => (
                    <div key={`${item}-${i}`} style={{background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px'}}>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{background: '#f8fafc', padding: '20px', borderRadius: '12px'}}>
              <h4 style={{margin: '0 0 16px', fontSize: '14px', color: '#64748b'}}>Diagnoses</h4>
              {data.diagnoses.length === 0 ? (
                <p style={{color: '#94a3b8', fontSize: '13px'}}>No diagnoses yet.</p>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  {data.diagnoses.map((item, i) => (
                    <div key={`${item}-${i}`} style={{background: '#fff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px'}}>
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PatientShell>
  );
}
