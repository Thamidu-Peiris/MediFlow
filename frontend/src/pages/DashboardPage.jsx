import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { openProtectedFile } from "../utils/openProtectedFile";
import { normalizeReportsList } from "../utils/normalizePatientReports";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, token, authHeaders, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
    medicalHistory: ""
  });
  const [reports, setReports] = useState([]);
  const [reportFile, setReportFile] = useState(null);

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  const loadProfile = async () => {
    try {
      const res = await api.get("/patients/profiles/me", authHeaders);
      const p = res.data.patient;
      setProfile({
        fullName: p.fullName || "",
        phone: p.phone || "",
        dob: p.dob || "",
        gender: p.gender || "",
        address: p.address || "",
        medicalHistory: (p.medicalHistory || []).join(", ")
      });
      setMessage("Profile loaded");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Profile unavailable");
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...profile,
        medicalHistory: profile.medicalHistory
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      };
      await api.put("/patients/profiles/me", payload, authHeaders);
      setMessage("Profile saved");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to save profile");
    }
  };

  const loadReports = async () => {
    try {
      const res = await api.get("/patients/reports", authHeaders);
      setReports(normalizeReportsList(res.data.reports || []));
    } catch {
      setReports([]);
    }
  };

  const uploadReport = async (e) => {
    e.preventDefault();
    if (!reportFile) return setMessage("Choose a report file first");
    try {
      const formData = new FormData();
      formData.append("report", reportFile);
      await api.post("/patients/reports/upload", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      setMessage("Report uploaded");
      setReportFile(null);
      loadReports();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Report upload failed");
    }
  };

  if (!user) return null;

  return (
    <main className="page">
      <section className="hero-card">
        <div>
          <p className="brand">MediFlow Dashboard</p>
          <h1>{user.name || user.email}</h1>
          <p className="muted">Logged in as {user.role}</p>
          {message ? <p className="status">{message}</p> : null}
        </div>
        <div className="row">
          <Link className="linkBtn" to="/login">
            Switch account
          </Link>
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            type="button"
          >
            Logout
          </button>
        </div>
      </section>

      {user.role === "patient" ? (
        <section className="dashboard-grid">
          <article className="form-card">
            <h2>Patient Profile</h2>
            <form onSubmit={saveProfile}>
              <input
                placeholder="Full Name"
                value={profile.fullName}
                onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
              <input
                placeholder="Phone"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              />
              <input
                placeholder="Date of Birth"
                value={profile.dob}
                onChange={(e) => setProfile((p) => ({ ...p, dob: e.target.value }))}
              />
              <input
                placeholder="Gender"
                value={profile.gender}
                onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
              />
              <textarea
                placeholder="Address"
                value={profile.address}
                onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
              />
              <textarea
                placeholder="Medical History (comma separated)"
                value={profile.medicalHistory}
                onChange={(e) => setProfile((p) => ({ ...p, medicalHistory: e.target.value }))}
              />
              <div className="row">
                <button type="button" onClick={loadProfile}>
                  Load
                </button>
                <button type="submit">Save</button>
              </div>
            </form>
          </article>

          <article className="form-card">
            <h2>Medical Reports</h2>
            <form onSubmit={uploadReport}>
              <input type="file" onChange={(e) => setReportFile(e.target.files?.[0] || null)} />
              <div className="row">
                <button type="submit">Upload</button>
                <button type="button" onClick={loadReports}>
                  Refresh
                </button>
              </div>
            </form>
            <ul className="report-list">
              {reports.map((r) => (
                <li key={`${r._id || r.filePath}-${r.uploadedAt}`}>
                  <button
                    type="button"
                    className="linkBtn"
                    onClick={() => openProtectedFile(r.filePath, token)}
                  >
                    {r.fileName}
                  </button>
                </li>
              ))}
            </ul>
          </article>
        </section>
      ) : (
        <section className="form-card">
          <h2>{user.role === "doctor" ? "Doctor Workspace" : "Admin Workspace"}</h2>
          <p className="muted">
            Your auth flow is ready. Domain features for this role can be built in the next
            iteration.
          </p>
        </section>
      )}
    </main>
  );
}
