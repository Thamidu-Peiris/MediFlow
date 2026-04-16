import { useCallback, useEffect, useMemo, useState } from "react";
import PatientShell from "../components/PatientShell";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
//  Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatAppointmentDate(isoDate) {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatPaymentDate(isoTimestamp) {
  if (!isoTimestamp) return "—";
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatLkr(cents) {
  return (Number(cents || 0) / 100).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function methodLabel(paymentMethod, appointmentType) {
  if (paymentMethod === "stripe") return "Card (Stripe)";
  if (paymentMethod === "helakuru") return "Helakuru / PayHere";
  return appointmentType === "online" ? "Online" : "In-person";
}

function methodIcon(paymentMethod) {
  if (paymentMethod === "stripe") return "credit_card";
  if (paymentMethod === "helakuru") return "account_balance_wallet";
  return "payments";
}

// ─────────────────────────────────────────────────────────────────────────────
//  PDF receipt generator (pure HTML + browser print, zero dependencies)
// ─────────────────────────────────────────────────────────────────────────────
function buildReceiptHtml(rows, title = "Payment Receipt") {
  const totalAllCents = rows.reduce((s, r) => s + r.totalCents, 0);

  const rowsHtml = rows
    .map(
      (r) => `
      <div class="receipt-card">
        <div class="receipt-card-header">
          <div>
            <div class="receipt-order">${r.orderId || "—"}</div>
            <div class="receipt-doctor">${r.doctor}</div>
            ${r.specialization ? `<div class="receipt-spec">${r.specialization}</div>` : ""}
          </div>
          <div class="receipt-badge ${r.status === "Refunded" ? "badge-refund" : "badge-paid"}">${r.status}</div>
        </div>
        <div class="receipt-grid">
          <div class="receipt-grid-item">
            <div class="receipt-label">Appointment Date</div>
            <div class="receipt-value">${r.appointmentDateDisplay}</div>
          </div>
          <div class="receipt-grid-item">
            <div class="receipt-label">Time</div>
            <div class="receipt-value">${r.time}</div>
          </div>
          <div class="receipt-grid-item">
            <div class="receipt-label">Payment Date</div>
            <div class="receipt-value">${r.paymentDateDisplay}</div>
          </div>
          <div class="receipt-grid-item">
            <div class="receipt-label">Type</div>
            <div class="receipt-value">${r.appointmentType === "online" ? "Online" : "Physical"}</div>
          </div>
          <div class="receipt-grid-item">
            <div class="receipt-label">Payment Method</div>
            <div class="receipt-value">${r.method}</div>
          </div>
          ${r.paymentRef ? `<div class="receipt-grid-item"><div class="receipt-label">Reference</div><div class="receipt-value ref">${r.paymentRef}</div></div>` : ""}
        </div>
        <div class="receipt-amounts">
          <div class="amount-row"><span>Consultation Fee</span><span>LKR ${formatLkr(r.consultationFeeCents)}</span></div>
          <div class="amount-row"><span>Service Fee</span><span>LKR ${formatLkr(r.serviceFeeCents)}</span></div>
          <div class="amount-row amount-total"><span>Total</span><span>LKR ${formatLkr(r.totalCents)}</span></div>
        </div>
      </div>`
    )
    .join("");

  const summaryHtml =
    rows.length > 1
      ? `<div class="summary-bar">
          <span>Total paid across ${rows.length} transaction${rows.length > 1 ? "s" : ""}</span>
          <strong>LKR ${formatLkr(totalAllCents)}</strong>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f4f6f9; color: #1a1a2e; padding: 32px 24px; }
    .page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
    .logo-mark { width: 40px; height: 40px; background: #006b50; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22px; }
    .org-name { font-size: 22px; font-weight: 700; color: #006b50; }
    .org-sub { font-size: 12px; color: #666; margin-top: 1px; }
    h1 { font-size: 15px; font-weight: 600; color: #444; margin-top: 2px; }
    .generated { font-size: 11px; color: #888; margin-top: 18px; margin-bottom: 6px; }
    .receipt-card { background: #fff; border-radius: 12px; padding: 20px 22px; margin-bottom: 18px;
      border: 1px solid #e0e6ed; box-shadow: 0 1px 4px rgba(0,0,0,.06); page-break-inside: avoid; }
    .receipt-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
    .receipt-order { font-size: 10px; color: #888; letter-spacing: .5px; font-family: monospace; }
    .receipt-doctor { font-size: 16px; font-weight: 700; margin-top: 2px; }
    .receipt-spec { font-size: 12px; color: #555; margin-top: 2px; }
    .receipt-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: .5px; }
    .badge-paid { background: #d4f7e6; color: #006b50; }
    .badge-refund { background: #fde8e8; color: #c0392b; }
    .receipt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 16px; border-top: 1px solid #f0f0f0; padding-top: 14px; }
    .receipt-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: .4px; }
    .receipt-value { font-size: 13px; font-weight: 500; margin-top: 2px; }
    .receipt-value.ref { font-family: monospace; font-size: 11px; word-break: break-all; }
    .receipt-amounts { border-top: 1px solid #f0f0f0; padding-top: 12px; }
    .amount-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; color: #444; }
    .amount-total { font-size: 15px; font-weight: 700; color: #006b50; border-top: 1.5px solid #e0e6ed; margin-top: 6px; padding-top: 8px; }
    .summary-bar { background: #006b50; color: #fff; border-radius: 10px; padding: 14px 20px;
      display: flex; justify-content: space-between; align-items: center; font-size: 14px; margin-top: 8px; }
    .summary-bar strong { font-size: 17px; }
    .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; }
    @media print {
      body { background: #fff; padding: 16px; }
      .receipt-card { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="logo-mark">M</div>
    <div>
      <div class="org-name">MediFlow</div>
      <div class="org-sub">Healthcare Platform</div>
    </div>
  </div>
  <h1>${title}</h1>
  <div class="generated">Generated: ${new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</div>
  ${rowsHtml}
  ${summaryHtml}
  <div class="footer">This is a computer-generated receipt. No signature required. &copy; MediFlow ${new Date().getFullYear()}</div>
</body>
</html>`;
}

function downloadReceiptPdf(rows, filename) {
  const html = buildReceiptHtml(
    rows,
    rows.length === 1 ? `Receipt — ${rows[0].doctor}` : "Payment History"
  );
  const win = window.open("", "_blank", "width=820,height=700");
  if (!win) {
    alert("Pop-up blocked. Please allow pop-ups for this site and try again.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PatientPaymentHistoryPage() {
  const { authHeaders } = useAuth();
  const [rawPayments, setRawPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    let mounted = true;
    api
      .get("/payments/history", authHeaders)
      .then((res) => { if (mounted) setRawPayments(res.data?.payments || []); })
      .catch(() => { if (mounted) setRawPayments([]); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [authHeaders]);

  const paymentRows = useMemo(() => {
    return rawPayments
      .map((p) => ({
        id: p._id,
        orderId: p.orderId || "",
        doctor: p.doctorName || "Doctor",
        specialization: p.specialization || "",
        appointmentDateDisplay: formatAppointmentDate(p.date),
        appointmentDateRaw: p.date || "",
        paymentDateDisplay: formatPaymentDate(p.createdAt),
        paymentDateRaw: p.createdAt || "",
        time: p.time || "—",
        appointmentType: p.appointmentType || "physical",
        method: methodLabel(p.paymentMethod, p.appointmentType),
        methodIcon: methodIcon(p.paymentMethod),
        paymentMethod: p.paymentMethod || "unknown",
        paymentRef: p.paymentRef || "",
        consultationFeeCents: Number(p.consultationFeeCents || 0),
        serviceFeeCents: Number(p.serviceFeeCents || 0),
        totalCents: Number(p.totalCents || 0),
        currency: p.currency || "LKR",
        status: p.status === "refunded" ? "Refunded" : "Paid",
      }))
      .sort((a, b) => new Date(b.paymentDateRaw || 0) - new Date(a.paymentDateRaw || 0));
  }, [rawPayments]);

  const filteredRows = useMemo(() => {
    return paymentRows.filter((r) => {
      const methodOk =
        filterMethod === "all" ||
        (filterMethod === "stripe" && r.paymentMethod === "stripe") ||
        (filterMethod === "helakuru" && r.paymentMethod === "helakuru");
      const statusOk =
        filterStatus === "all" ||
        (filterStatus === "paid" && r.status === "Paid") ||
        (filterStatus === "refunded" && r.status === "Refunded");
      return methodOk && statusOk;
    });
  }, [paymentRows, filterMethod, filterStatus]);

  const totalPaidCents = useMemo(
    () => filteredRows.filter((r) => r.status === "Paid").reduce((s, r) => s + r.totalCents, 0),
    [filteredRows]
  );

  const handleDownloadSingle = useCallback((row) => {
    downloadReceiptPdf([row], `MediFlow-Receipt-${row.orderId || row.id}`);
  }, []);

  const handleDownloadAll = useCallback(() => {
    if (!filteredRows.length) return;
    downloadReceiptPdf(filteredRows, "MediFlow-Payment-History");
  }, [filteredRows]);

  return (
    <PatientShell>
      <div className="aura-dashboard">
        <section className="aura-card">
          {/* Header */}
          <div className="aura-card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
            <h2 className="aura-card-title">Payment History</h2>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Filter: method */}
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                style={{
                  fontSize: "13px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--outline-variant, #cad9d4)",
                  background: "var(--surface-container, #f5f5f5)",
                  color: "var(--on-surface, #171d1b)",
                  cursor: "pointer",
                }}
              >
                <option value="all">All methods</option>
                <option value="stripe">Card (Stripe)</option>
                <option value="helakuru">Helakuru</option>
              </select>

              {/* Filter: status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  fontSize: "13px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--outline-variant, #cad9d4)",
                  background: "var(--surface-container, #f5f5f5)",
                  color: "var(--on-surface, #171d1b)",
                  cursor: "pointer",
                }}
              >
                <option value="all">All statuses</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>

              {/* Export all */}
              {!loading && filteredRows.length > 0 && (
                <button
                  onClick={handleDownloadAll}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--primary, #006b50)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>download</span>
                  Export PDF
                </button>
              )}
            </div>
          </div>

          {/* Summary strip */}
          {!loading && filteredRows.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "20px",
                flexWrap: "wrap",
                padding: "12px 16px",
                marginBottom: "8px",
                borderRadius: "10px",
                background: "var(--surface-container-low, #f0f5f3)",
                fontSize: "13px",
                color: "var(--on-surface-variant, #3e4944)",
              }}
            >
              <span>
                <strong style={{ color: "var(--on-surface, #171d1b)" }}>{filteredRows.length}</strong>{" "}
                transaction{filteredRows.length !== 1 ? "s" : ""}
              </span>
              <span>
                Total paid:{" "}
                <strong style={{ color: "var(--primary, #006b50)" }}>
                  LKR {formatLkr(totalPaidCents)}
                </strong>
              </span>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <p className="aura-subtitle">Loading payment history…</p>
          ) : filteredRows.length === 0 ? (
            <p className="aura-subtitle">No payment records found.</p>
          ) : (
            <div className="aura-documents-list">
              {filteredRows.map((row) => (
                <div
                  key={row.id}
                  className="aura-document-item"
                  style={{ alignItems: "flex-start", gap: "14px" }}
                >
                  {/* Icon */}
                  <div className="aura-doc-icon aura-doc-icon--payments" style={{ marginTop: "2px" }}>
                    <span className="material-symbols-outlined">{row.methodIcon}</span>
                  </div>

                  {/* Main info */}
                  <div className="aura-doc-info" style={{ flex: 1, minWidth: 0 }}>
                    <p className="aura-doc-name">{row.doctor}</p>
                    {row.specialization && (
                      <p className="aura-doc-meta" style={{ color: "var(--primary, #006b50)", marginBottom: "4px" }}>
                        {row.specialization}
                      </p>
                    )}

                    {/* Date pair */}
                    <div
                      style={{
                        display: "flex",
                        gap: "18px",
                        flexWrap: "wrap",
                        marginTop: "4px",
                        marginBottom: "2px",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          color: "var(--on-surface-variant, #3e4944)",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                          calendar_month
                        </span>
                        <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: ".3px" }}>
                          Appt:
                        </strong>{" "}
                        {row.appointmentDateDisplay} at {row.time}
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "12px",
                          color: "var(--on-surface-variant, #3e4944)",
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                          schedule
                        </span>
                        <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: ".3px" }}>
                          Paid:
                        </strong>{" "}
                        {row.paymentDateDisplay}
                      </span>
                    </div>

                    <p className="aura-doc-meta">
                      {row.method} •{" "}
                      {row.appointmentType === "online" ? "Online consultation" : "Physical visit"}
                      {row.paymentRef && (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "10px",
                            marginLeft: "6px",
                            color: "var(--on-surface-variant)",
                          }}
                        >
                          {row.paymentRef.substring(0, 24)}{row.paymentRef.length > 24 ? "…" : ""}
                        </span>
                      )}
                    </p>

                    {row.orderId && (
                      <p
                        className="aura-doc-meta"
                        style={{ fontFamily: "monospace", fontSize: "10px", marginTop: "2px", opacity: 0.6 }}
                      >
                        {row.orderId}
                      </p>
                    )}
                  </div>

                  {/* Amount + actions */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p className="aura-doc-meta" style={{ fontSize: "11px" }}>
                      Consult: LKR {formatLkr(row.consultationFeeCents)}
                    </p>
                    <p className="aura-doc-meta" style={{ fontSize: "11px" }}>
                      Service: LKR {formatLkr(row.serviceFeeCents)}
                    </p>
                    <p
                      className="aura-doc-name"
                      style={{ fontSize: "15px", fontWeight: 700, marginTop: "2px" }}
                    >
                      LKR {formatLkr(row.totalCents)}
                    </p>

                    {/* Status badge */}
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "4px",
                        padding: "2px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: ".4px",
                        background:
                          row.status === "Refunded"
                            ? "var(--error-container, #fde8e8)"
                            : "rgba(0,107,80,.12)",
                        color:
                          row.status === "Refunded"
                            ? "var(--error, #ba1a1a)"
                            : "var(--primary, #006b50)",
                      }}
                    >
                      {row.status}
                    </span>

                    {/* Download receipt */}
                    <div style={{ marginTop: "8px" }}>
                      <button
                        onClick={() => handleDownloadSingle(row)}
                        title="Download receipt as PDF"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "5px 10px",
                          borderRadius: "7px",
                          border: "1px solid var(--outline-variant, #cad9d4)",
                          background: "transparent",
                          color: "var(--on-surface-variant, #3e4944)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "background .15s",
                          marginLeft: "auto",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "var(--surface-container, #f0f5f3)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
                          receipt_long
                        </span>
                        Receipt
                      </button>
                    </div>
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
