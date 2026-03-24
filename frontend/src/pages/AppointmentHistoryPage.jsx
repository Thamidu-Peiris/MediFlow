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
    <PatientShell title="Appointment History" subtitle="Track upcoming and previous appointments">
      <div className="pd-grid pd-grid-3">
        {Object.entries(grouped).map(([key, items]) => (
          <article className="pd-card" key={key}>
            <h3>{key[0].toUpperCase() + key.slice(1)}</h3>
            {items.length === 0 ? <p>No {key} appointments.</p> : items.map((item) => (
              <p key={item._id || `${item.doctorName}-${item.date}`}>
                {item.date || "TBA"} - {item.doctorName || "Doctor"}
              </p>
            ))}
          </article>
        ))}
      </div>
    </PatientShell>
  );
}
