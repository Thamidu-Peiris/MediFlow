import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function AppointmentHistoryPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    api
      .get("/patients/appointments", authHeaders)
      .then((res) => setAppointments(res.data.appointments || []))
      .catch(() => setAppointments([]));
  }, [authHeaders]);

  const grouped = useMemo(
    () => ({
      upcoming: appointments.filter((x) => x.status === "upcoming"),
      completed: appointments.filter((x) => x.status === "completed"),
      cancelled: appointments.filter((x) => x.status === "cancelled")
    }),
    [appointments]
  );

  return (
    <PatientShell>
      <div className="profile-dashboard">
        <div className="profile-section">
          <div className="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <h3>My Appointments</h3>
          </div>
          
          <div className="profile-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
            {Object.entries(grouped).map(([key, items]) => (
              <div key={key} style={{background: '#f8fafc', padding: '20px', borderRadius: '12px'}}>
                <h4 style={{margin: '0 0 16px', fontSize: '14px', color: '#64748b', textTransform: 'capitalize'}}>{key}</h4>
                {items.length === 0 ? (
                  <p style={{color: '#94a3b8', fontSize: '13px'}}>No {key} appointments.</p>
                ) : (
                  <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                    {items.map((item) => (
                      <div key={item._id || `${item.doctorName}-${item.date}`} style={{background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                        <p style={{margin: '0 0 4px', fontWeight: '500', color: '#0f172a'}}>{item.doctorName || "Doctor"}</p>
                        <p style={{margin: '0', fontSize: '13px', color: '#64748b'}}>{item.date || "TBA"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PatientShell>
  );
}
