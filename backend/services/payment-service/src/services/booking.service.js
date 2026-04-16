/**
 * Shared booking-completion logic used by both webhook handlers and the REST
 * completeBookingAfterPayment endpoint.
 *
 * fulfillBooking(doc)
 *   - Idempotent: re-reads the document and skips if appointmentCreated is
 *     already true (safe to call from Stripe/PayHere webhooks which may retry).
 *   - Generates a short-lived internal JWT so payment-service can call
 *     appointment-service on behalf of the patient with no browser session.
 *   - Upserts PaymentHistory after the appointment is created.
 *
 * upsertPaymentHistory({ doc, appointmentId })
 *   - Shared by webhook path and REST path so history is always consistent.
 */

const jwt   = require("jsonwebtoken");
const axios = require("axios");
const PendingBooking  = require("../models/PendingBooking.model");
const PaymentHistory  = require("../models/PaymentHistory.model");

// ─────────────────────────────────────────────────────────────────────────────
//  Payment-history upsert (idempotent via orderId unique key)
// ─────────────────────────────────────────────────────────────────────────────
async function upsertPaymentHistory({ doc, appointmentId = "" }) {
  const totalCents    = Number(doc.consultationFeeCents || 0) + Number(doc.serviceFeeCents || 0);
  const paymentMethod = doc.stripePaymentIntentId
    ? "stripe"
    : doc.payherePaymentId
      ? "helakuru"
      : "unknown";
  const paymentRef = doc.stripePaymentIntentId || doc.payherePaymentId || "";

  await PaymentHistory.findOneAndUpdate(
    { orderId: doc.orderId },
    {
      $set: {
        patientSub:           doc.patientSub           || "",
        pendingBookingId:     doc._id,
        appointmentId:        appointmentId             || "",
        doctorUserId:         doc.doctorUserId          || "",
        doctorName:           doc.doctorName            || "",
        specialization:       doc.specialization        || "",
        date:                 doc.date                  || "",
        time:                 doc.time                  || "",
        appointmentType:      doc.appointmentType       || "physical",
        currency:             doc.currency              || "LKR",
        consultationFeeCents: Number(doc.consultationFeeCents || 0),
        serviceFeeCents:      Number(doc.serviceFeeCents      || 0),
        totalCents,
        paymentMethod,
        paymentRef,
        status: "paid",
      },
    },
    { upsert: true, new: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Core fulfillment: create appointment + mark booking complete
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Try to create the appointment for a paid PendingBooking.
 *
 * @param {Object}  pendingDoc   Mongoose document (fresh or stale — we re-read anyway)
 * @param {Object}  [opts]
 * @param {string}  [opts.authHeader]   Forward the patient's real JWT when available
 *                                       (REST path). Falls back to internal service token.
 * @param {string}  [opts.patientName]  Display name from the patient's JWT (REST path).
 *
 * @returns {{ created, alreadyCreated, skipped, appointment, appointmentId }}
 */
async function fulfillBooking(pendingDoc, { authHeader, patientName } = {}) {
  // Always re-read to get the latest state (prevents duplicate appointments
  // when webhook + browser race each other).
  const doc = await PendingBooking.findById(pendingDoc._id);
  if (!doc) return { skipped: true, reason: "document not found" };

  if (doc.appointmentCreated) {
    await upsertPaymentHistory({ doc }).catch(() => {});
    return { alreadyCreated: true };
  }

  if (doc.status !== "paid") {
    return { skipped: true, reason: `status is ${doc.status}` };
  }

  const APPOINTMENT_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:8004";
  const JWT_SECRET      = process.env.JWT_SECRET              || "change_this_secret";

  // Use the patient's real auth header when available (REST path gives us name).
  // Fall back to a short-lived internal service token (webhook path has no session).
  const authorization = authHeader || (() => {
    const token = jwt.sign(
      { sub: doc.patientSub, role: "patient", name: patientName || "Patient" },
      JWT_SECRET,
      { expiresIn: "5m" }
    );
    return `Bearer ${token}`;
  })();

  const name = patientName || "Patient";

  const aptRes = await axios.post(
    `${APPOINTMENT_URL}/`,
    {
      patientName:      name,
      sessionId:        doc._id.toString(),
      doctorId:         doc.doctorUserId,
      doctorName:       doc.doctorName,
      specialization:   doc.specialization,
      date:             doc.date,
      time:             doc.time,
      reason:           doc.reason || `Consultation paid. Order ${doc.orderId}`,
      notes:            doc.reason || `Consultation paid. Order ${doc.orderId}`,
      appointmentType:  doc.appointmentType || "physical",
      consultationFee:  Math.round(doc.consultationFeeCents) / 100,
    },
    {
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      timeout: 15000,
    }
  );

  // Atomic update so only one caller wins the race
  const updated = await PendingBooking.findOneAndUpdate(
    { _id: doc._id, appointmentCreated: false },
    { $set: { appointmentCreated: true } },
    { new: true }
  );

  if (!updated) {
    // Another process won — still return success
    return { alreadyCreated: true };
  }

  const appointmentId = aptRes.data?.appointment?._id || "";
  await upsertPaymentHistory({ doc: updated, appointmentId });

  return { created: true, appointment: aptRes.data?.appointment, appointmentId };
}

module.exports = { fulfillBooking, upsertPaymentHistory };
