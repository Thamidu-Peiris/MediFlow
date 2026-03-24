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
    <PatientShell title="Prescriptions" subtitle="Prescription list from your doctors">
      <div className="pd-list">
        {prescriptions.length === 0 ? (
          <article className="pd-card">
            <p>No prescriptions found.</p>
          </article>
        ) : (
          prescriptions.map((item) => (
            <article className="pd-card" key={item._id || item.createdAt}>
              <h4>Doctor: {item.doctorId || "N/A"}</h4>
              <p>{item.notes || "No notes"}</p>
              <p>Medicines: {(item.medicines || []).join(", ") || "N/A"}</p>
              <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small>
            </article>
          ))
        )}
      </div>
    </PatientShell>
  );
}
