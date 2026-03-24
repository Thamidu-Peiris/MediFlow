import { useEffect, useState } from "react";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

export default function PatientProfilePage() {
  const { authHeaders } = useAuth();
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    phone: "",
    age: "",
    gender: "",
    address: "",
    medicalHistory: ""
  });

  useEffect(() => {
    api.get("/patients/me", authHeaders).then((res) => {
      const p = res.data.patient || {};
      setProfile({
        fullName: p.fullName || "",
        email: p.email || "",
        phone: p.phone || "",
        age: p.age || "",
        gender: p.gender || "",
        address: p.address || "",
        medicalHistory: (p.medicalHistory || []).join(", ")
      });
    }).catch(() => {});
  }, [authHeaders]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(
        "/patients/update-profile",
        {
          ...profile,
          age: profile.age ? Number(profile.age) : null,
          medicalHistory: profile.medicalHistory.split(",").map((x) => x.trim()).filter(Boolean)
        },
        authHeaders
      );
      setMessage("Profile updated successfully");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to update profile");
    }
  };

  return (
    <PatientShell title="Profile" subtitle="View and edit your patient profile">
      <article className="pd-card">
        {message ? <p className="muted">{message}</p> : null}
        <form className="pd-form" onSubmit={onSubmit}>
          <input placeholder="Name" value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} required />
          <input type="email" placeholder="Email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
          <input placeholder="Phone" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
          <input type="number" min="0" placeholder="Age" value={profile.age} onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))} />
          <select value={profile.gender} onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}>
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input placeholder="Address" value={profile.address} onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))} />
          <textarea placeholder="Medical history (comma separated)" value={profile.medicalHistory} onChange={(e) => setProfile((p) => ({ ...p, medicalHistory: e.target.value }))} />
          <button type="submit">Save Profile</button>
        </form>
      </article>
    </PatientShell>
  );
}
