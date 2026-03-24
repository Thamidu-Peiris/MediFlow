import { useEffect, useMemo, useState } from "react";
import api from "./api/client";

export default function App() {
  const [health, setHealth] = useState("Checking services...");
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState("");
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    role: "patient"
  });
  const [loginData, setLoginData] = useState({ email: "", password: "" });
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

  const authHeaders = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );

  useEffect(() => {
    api
      .get("/health")
      .then((res) => setHealth(res.data?.message || "Gateway reachable"))
      .catch(() => setHealth("Gateway not reachable"));
  }, []);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem("token");
      setUser(null);
      return;
    }
    localStorage.setItem("token", token);
    api
      .get("/auth/me", authHeaders)
      .then((res) => setUser(res.data.user))
      .catch(() => {
        setToken("");
        setUser(null);
      });
  }, [token, authHeaders]);

  const register = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/register", registerData);
      setToken(res.data.token);
      setMessage("Registration successful");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Registration failed");
    }
  };

  const login = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", loginData);
      setToken(res.data.token);
      setMessage("Login successful");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Login failed");
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
      const res = await api.put("/patients/profiles/me", payload, authHeaders);
      const p = res.data.patient;
      setProfile({
        fullName: p.fullName || "",
        phone: p.phone || "",
        dob: p.dob || "",
        gender: p.gender || "",
        address: p.address || "",
        medicalHistory: (p.medicalHistory || []).join(", ")
      });
      setMessage("Profile saved");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to save profile");
    }
  };

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
      setMessage(err?.response?.data?.message || "Profile not found");
    }
  };

  const loadReports = async () => {
    try {
      const res = await api.get("/patients/reports", authHeaders);
      setReports(res.data.reports || []);
    } catch {
      setReports([]);
    }
  };

  const uploadReport = async (e) => {
    e.preventDefault();
    if (!reportFile) {
      setMessage("Choose a report file first");
      return;
    }
    const formData = new FormData();
    formData.append("report", reportFile);
    try {
      await api.post("/patients/reports/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setMessage("Report uploaded");
      setReportFile(null);
      loadReports();
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to upload report");
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setReports([]);
    setMessage("Logged out");
  };

  return (
    <main className="container">
      <h1>MediFlow</h1>
      <p>Auth + Patient Management Module</p>
      <p className="status">{health}</p>
      {message ? <p>{message}</p> : null}

      {!token ? (
        <section className="grid">
          <form onSubmit={register}>
            <h3>Register</h3>
            <input
              placeholder="Name"
              value={registerData.name}
              onChange={(e) =>
                setRegisterData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
            <input
              placeholder="Email"
              type="email"
              value={registerData.email}
              onChange={(e) =>
                setRegisterData((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <input
              placeholder="Password"
              type="password"
              value={registerData.password}
              onChange={(e) =>
                setRegisterData((prev) => ({ ...prev, password: e.target.value }))
              }
            />
            <select
              value={registerData.role}
              onChange={(e) =>
                setRegisterData((prev) => ({ ...prev, role: e.target.value }))
              }
            >
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit">Create account</button>
          </form>

          <form onSubmit={login}>
            <h3>Login</h3>
            <input
              placeholder="Email"
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
            />
            <input
              placeholder="Password"
              type="password"
              value={loginData.password}
              onChange={(e) =>
                setLoginData((prev) => ({ ...prev, password: e.target.value }))
              }
            />
            <button type="submit">Login</button>
          </form>
        </section>
      ) : (
        <section>
          <div className="row">
            <p>
              Logged in as <strong>{user?.email || "..."}</strong> ({user?.role || "..."})
            </p>
            <button onClick={logout} type="button">
              Logout
            </button>
          </div>

          <form onSubmit={saveProfile}>
            <h3>Patient Profile</h3>
            <input
              placeholder="Full Name"
              value={profile.fullName}
              onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))}
            />
            <input
              placeholder="Phone"
              value={profile.phone}
              onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <input
              placeholder="Date of Birth (YYYY-MM-DD)"
              value={profile.dob}
              onChange={(e) => setProfile((prev) => ({ ...prev, dob: e.target.value }))}
            />
            <input
              placeholder="Gender"
              value={profile.gender}
              onChange={(e) => setProfile((prev) => ({ ...prev, gender: e.target.value }))}
            />
            <textarea
              placeholder="Address"
              value={profile.address}
              onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))}
            />
            <textarea
              placeholder="Medical History (comma-separated)"
              value={profile.medicalHistory}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, medicalHistory: e.target.value }))
              }
            />
            <div className="row">
              <button type="button" onClick={loadProfile}>
                Load profile
              </button>
              <button type="submit">Save profile</button>
            </div>
          </form>

          <form onSubmit={uploadReport}>
            <h3>Upload Medical Report</h3>
            <input type="file" onChange={(e) => setReportFile(e.target.files?.[0] || null)} />
            <div className="row">
              <button type="submit">Upload</button>
              <button type="button" onClick={loadReports}>
                Refresh reports
              </button>
            </div>
          </form>

          <ul>
            {reports.map((r) => (
              <li key={`${r.filePath}-${r.uploadedAt}`}>
                <a href={r.filePath} target="_blank" rel="noreferrer">
                  {r.fileName}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
