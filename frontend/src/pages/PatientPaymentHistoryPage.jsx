import { useEffect, useMemo, useState } from "react";
import PatientShell from "../components/PatientShell";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatLkr(cents) {
  return (Number(cents || 0) / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function PatientPaymentHistoryPage() {
  const { authHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/payments/history", authHeaders)
      .then((res) => {
        if (!mounted) return;
        setAppointments(res.data?.payments || []);
      })
      .catch(() => {
        if (!mounted) return;
        setAppointments([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  const paymentRows = useMemo(() => {
    return appointments
      .map((p) => ({
        id: p._id,
        doctor: p.doctorName || "Doctor",
        date: p.date,
        time: p.time || "—",
        method:
          p.paymentMethod === "stripe"
            ? "Card (Stripe)"
            : p.paymentMethod === "helakuru"
              ? "Helakuru"
              : p.appointmentType === "online"
                ? "Online"
                : "In-person",
        consultationFeeCents: Number(p.consultationFeeCents || 0),
        serviceFeeCents: Number(p.serviceFeeCents || 0),
        totalCents: Number(p.totalCents || 0),
        status: p.status === "refunded" ? "Refunded" : "Paid"
      }))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [appointments]);

  return (
    <PatientShell>
      <div className="aura-dashboard">
        <section className="aura-card">
          <div className="aura-card-header">
            <h2 className="aura-card-title">Payment History</h2>
          </div>

          {loading ? (
            <p className="aura-subtitle">Loading payment history...</p>
          ) : paymentRows.length === 0 ? (
            <p className="aura-subtitle">No payment records found.</p>
          ) : (
            <div className="aura-documents-list">
              {paymentRows.map((row) => (
                <div key={row.id} className="aura-document-item">
                  <div className="aura-doc-icon aura-doc-icon--payments">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                  <div className="aura-doc-info">
                    <p className="aura-doc-name">{row.doctor}</p>
                    <p className="aura-doc-meta">
                      {formatDate(row.date)} • {row.time} • {row.method}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="aura-doc-meta">Consultation: LKR {formatLkr(row.consultationFeeCents)}</p>
                    <p className="aura-doc-meta">Service Fee: LKR {formatLkr(row.serviceFeeCents)}</p>
                    <p className="aura-doc-name">Total: LKR {formatLkr(row.totalCents)}</p>
                    <p className="aura-doc-meta">{row.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </PatientShell>
  );
}
