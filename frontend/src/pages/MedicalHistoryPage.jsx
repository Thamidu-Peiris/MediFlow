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
    <PatientShell title="Medical History" subtitle="Past records, diagnoses and timeline">
      <div className="pd-grid pd-grid-2">
        <article className="pd-card">
          <h3>Medical History</h3>
          {data.medicalHistory.length === 0 ? <p>No records yet.</p> : data.medicalHistory.map((item, i) => <p key={`${item}-${i}`}>{item}</p>)}
        </article>
        <article className="pd-card">
          <h3>Diagnoses</h3>
          {data.diagnoses.length === 0 ? <p>No diagnoses yet.</p> : data.diagnoses.map((item, i) => <p key={`${item}-${i}`}>{item}</p>)}
        </article>
      </div>
    </PatientShell>
  );
}
