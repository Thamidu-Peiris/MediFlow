import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PatientDashboardPage() {
  const { authHeaders, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);

  useEffect(() => {
    api.get("/patients/me", authHeaders).then((res) => {
      setPatientInfo(res.data.patient || {});
    }).catch(() => {});
    
    api.get("/patients/appointments", authHeaders).then((res) => {
      setAppointments(res.data.appointments || []);
    }).catch(() => setAppointments([]));
    
    api.get("/patients/prescriptions", authHeaders).then((res) => {
      setPrescriptions(res.data.prescriptions || []);
    }).catch(() => setPrescriptions([]));
    
    api.get("/doctors", authHeaders).then((res) => {
      setDoctors(res.data.doctors?.slice(0, 3) || []);
    }).catch(() => setDoctors([]));
  }, [authHeaders]);

  const upcoming = appointments.filter((a) => a.status === "upcoming");
  const nextAppointment = upcoming[0];
  const recentPrescriptions = [...prescriptions].reverse().slice(0, 3);

  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = today.toLocaleDateString('en-US', options);

  return (
    <PatientShell>
      <div className="aura-dashboard">
        <header className="aura-header">
          <div>
            <h1 className="aura-title">Good morning, {patientInfo?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'Sarah'}</h1>
            <p className="aura-subtitle">{formattedDate} • You have {upcoming.length} appointment{upcoming.length !== 1 ? 's' : ''} today.</p>
          </div>
        </header>

        <div className="aura-grid">
          <section className="aura-col-8">
            <div className="aura-consultation-card">
              <div className="aura-consultation-glow"></div>
              <div className="aura-consultation-content">
                <div className="aura-consultation-info">
                  <span className="aura-badge">Next Appointment</span>
                  <h2 className="aura-doctor-name">{nextAppointment?.doctorName || 'Dr. Sarah Jenkins'}</h2>
                  <p className="aura-doctor-specialty">{nextAppointment?.specialty || 'Cardiology Specialist'} • {nextAppointment?.time || '10:30 AM Today'}</p>
                  <div className="aura-consultation-actions">
                    <Link to={nextAppointment ? `/patient/appointments` : '/doctors'} className="aura-btn-primary">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                      </svg>
                      {nextAppointment ? 'Join Video Call' : 'Book Appointment'}
                    </Link>
                  </div>
                </div>
                <div className="aura-doctor-image">
                  <img src={nextAppointment?.doctorImage || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80"} alt="Doctor" />
                </div>
              </div>
            </div>
          </section>

          <section className="aura-col-4">
            <h3 className="aura-section-label">Quick Actions</h3>
            <div className="aura-quick-actions">
              <Link to="/doctors" className="aura-quick-btn">
                <span className="aura-quick-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/>
                  </svg>
                </span>
                <span className="aura-quick-text">Book New Appointment</span>
              </Link>
              <Link to="/patient/prescriptions" className="aura-quick-btn">
                <span className="aura-quick-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                  </svg>
                </span>
                <span className="aura-quick-text">Request Prescription</span>
              </Link>
              <Link to="/patient/reports" className="aura-quick-btn">
                <span className="aura-quick-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </span>
                <span className="aura-quick-text">Upload Medical Report</span>
              </Link>
            </div>
          </section>

          <section className="aura-col-12">
            <div className="aura-health-cards">
              <div className="aura-health-card">
                <div className="aura-health-icon aura-teal">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div className="aura-health-info">
                  <p className="aura-health-label">Step Count</p>
                  <p className="aura-health-value">8,432 <span>/ 10k</span></p>
                </div>
              </div>
              <div className="aura-health-card">
                <div className="aura-health-icon aura-rose">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
                <div className="aura-health-info">
                  <p className="aura-health-label">Heart Rate</p>
                  <p className="aura-health-value">72 <span>bpm</span></p>
                </div>
              </div>
              <div className="aura-health-card">
                <div className="aura-health-icon aura-indigo">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                </div>
                <div className="aura-health-info">
                  <p className="aura-health-label">Sleep Quality</p>
                  <p className="aura-health-value">7h 45m <span>Good</span></p>
                </div>
              </div>
            </div>
          </section>

          <section className="aura-col-7">
            <div className="aura-card">
              <div className="aura-card-header">
                <h3 className="aura-card-title">Recent Documents</h3>
                <Link to="/patient/reports" className="aura-view-all">View All</Link>
              </div>
              <div className="aura-documents-list">
                {recentPrescriptions.length === 0 ? (
                  <>
                    <div className="aura-document-item">
                      <div className="aura-doc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="aura-doc-info">
                        <p className="aura-doc-name">Blood Test Results</p>
                        <p className="aura-doc-meta">May 15, 2024 • LabCorp</p>
                      </div>
                      <button className="aura-doc-action">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                    <div className="aura-document-item">
                      <div className="aura-doc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                        </svg>
                      </div>
                      <div className="aura-doc-info">
                        <p className="aura-doc-name">Prescription Renewal - Lisinopril</p>
                        <p className="aura-doc-meta">May 10, 2024 • Dr. Aris Thorne</p>
                      </div>
                      <button className="aura-doc-action">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                    <div className="aura-document-item">
                      <div className="aura-doc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="aura-doc-info">
                        <p className="aura-doc-name">Annual Physical Summary</p>
                        <p className="aura-doc-meta">April 22, 2024 • Aura Wellness</p>
                      </div>
                      <button className="aura-doc-action">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  recentPrescriptions.map((item, idx) => (
                    <div key={item._id || idx} className="aura-document-item">
                      <div className="aura-doc-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
                        </svg>
                      </div>
                      <div className="aura-doc-info">
                        <p className="aura-doc-name">{item.notes || "Prescription"}</p>
                        <p className="aura-doc-meta">{new Date(item.createdAt).toLocaleDateString()} • {item.doctorName || "Doctor"}</p>
                      </div>
                      <button className="aura-doc-action">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="aura-col-5">
            <div className="aura-card">
              <h3 className="aura-card-title" style={{ marginBottom: '24px' }}>My Medical Team</h3>
              <div className="aura-doctors-grid">
                {doctors.length === 0 ? (
                  <>
                    <div className="aura-doctor-item">
                      <div className="aura-doctor-avatar">
                        <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=150&q=80" alt="Dr. A. Thorne" />
                        <span className="aura-status online"></span>
                      </div>
                      <div className="aura-doctor-info-sm">
                        <p className="aura-doctor-name-sm">Dr. A. Thorne</p>
                        <p className="aura-doctor-spec">Primary Care</p>
                      </div>
                    </div>
                    <div className="aura-doctor-item">
                      <div className="aura-doctor-avatar">
                        <img src="https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=150&q=80" alt="Dr. L. Chen" />
                        <span className="aura-status offline"></span>
                      </div>
                      <div className="aura-doctor-info-sm">
                        <p className="aura-doctor-name-sm">Dr. L. Chen</p>
                        <p className="aura-doctor-spec">Neurology</p>
                      </div>
                    </div>
                    <div className="aura-doctor-item">
                      <div className="aura-doctor-avatar">
                        <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80" alt="Dr. K. Miller" />
                        <span className="aura-status online"></span>
                      </div>
                      <div className="aura-doctor-info-sm">
                        <p className="aura-doctor-name-sm">Dr. K. Miller</p>
                        <p className="aura-doctor-spec">Orthopedics</p>
                      </div>
                    </div>
                  </>
                ) : (
                  doctors.map((doctor) => (
                    <div key={doctor._id} className="aura-doctor-item">
                      <div className="aura-doctor-avatar">
                        <img src={doctor.image || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=150&q=80"} alt={doctor.name} />
                        <span className={`aura-status ${doctor.status === 'online' ? 'online' : 'offline'}`}></span>
                      </div>
                      <div className="aura-doctor-info-sm">
                        <p className="aura-doctor-name-sm">{doctor.name}</p>
                        <p className="aura-doctor-spec">{doctor.specialty}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Link to="/doctors" className="aura-directory-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Directory
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PatientShell>
  );
}
