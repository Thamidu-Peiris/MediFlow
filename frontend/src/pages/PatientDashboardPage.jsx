import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PatientDashboardPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    api.get("/patients/appointments", authHeaders).then((res) => {
      setAppointments(res.data.appointments || []);
    }).catch(() => setAppointments([]));
    api.get("/patients/prescriptions", authHeaders).then((res) => {
      setPrescriptions(res.data.prescriptions || []);
    }).catch(() => setPrescriptions([]));
  }, [authHeaders]);

  const upcoming = appointments.filter((a) => a.status === "upcoming").slice(0, 3);
  const recentPrescriptions = [...prescriptions].reverse().slice(0, 3);

  return (
    <PatientShell>
      <div className="profile-dashboard">
        {/* Stats Cards */}
        <div className="profile-grid" style={{gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px'}}>
          <div className="profile-section" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <div className="stat-icon calendar" style={{width: '48px', height: '48px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <span className="stat-number">{upcoming.length}</span>
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
              <span className="stat-number">{recentPrescriptions.length}</span>
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
              <span className="stat-number">3</span>
              <p style={{margin: '0', fontSize: '13px', color: '#64748b'}}>Active Medications</p>
            </div>
          </div>
        </div>
        
        {/* Upcoming Appointments */}
        <div className="profile-grid" style={{gridTemplateColumns: '2fr 1fr', marginBottom: '24px'}}>
          <div className="profile-section">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <h3>Upcoming Appointments</h3>
            </div>
            {upcoming.length === 0 ? (
              <p style={{color: '#64748b'}}>No upcoming appointments.</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {upcoming.map((item) => (
                  <div key={item._id || `${item.doctorName}-${item.date}`} style={{display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px'}}>
                    <div style={{width: '48px', height: '48px', borderRadius: '10px', background: '#14b8a6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '600'}}>
                      {item.date ? new Date(item.date).getDate() : 'TBA'}
                    </div>
                    <div>
                      <p style={{margin: '0 0 4px', fontWeight: '500', color: '#0f172a'}}>{item.doctorName || "Doctor"}</p>
                      <p style={{margin: '0', fontSize: '13px', color: '#64748b'}}>{item.date || "Date TBA"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="profile-section">
            <div className="section-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
              </svg>
              <h3>Quick Actions</h3>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              <Link to="/doctors" className="save-btn" style={{textDecoration: 'none', textAlign: 'center'}}>Book Appointment</Link>
              <Link to="/patient/reports" className="cancel-btn" style={{textDecoration: 'none', textAlign: 'center'}}>View Reports</Link>
              <Link to="/patient/prescriptions" className="cancel-btn" style={{textDecoration: 'none', textAlign: 'center'}}>My Prescriptions</Link>
            </div>
          </div>
        </div>
        
        {/* Recent Prescriptions */}
        <div className="profile-section">
          <div className="section-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
            </svg>
            <h3>Recent Prescriptions</h3>
          </div>
          {recentPrescriptions.length === 0 ? (
            <p style={{color: '#64748b'}}>No prescriptions found.</p>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {recentPrescriptions.map((item) => (
                <div key={item._id || item.createdAt} style={{padding: '16px', background: '#f8fafc', borderRadius: '12px'}}>
                  <p style={{margin: '0 0 4px', fontWeight: '500', color: '#0f172a'}}>{item.notes || "Prescription note"}</p>
                  <p style={{margin: '0', fontSize: '13px', color: '#64748b'}}>Medicines: {(item.medicines || []).join(", ") || "N/A"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PatientShell>
  );
}
