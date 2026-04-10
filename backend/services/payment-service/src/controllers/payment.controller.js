const crypto = require("crypto");
const axios = require("axios");
const PendingBooking = require("../models/PendingBooking.model");
const stripeService = require("../services/stripe.service");
const payhereService = require("../services/payhere.service");

const APPOINTMENT_URL = process.env.APPOINTMENT_SERVICE_URL || "http://localhost:8004";
// Docker Compose service name is `doctor-service`; localhost only works when payment runs on the host.
const DOCTOR_URL =
  process.env.DOCTOR_SERVICE_URL || process.env.DOCTOR_URL || "http://localhost:8003";

function normalizeTimeLabel(t) {
  return String(t || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function lkrToCents(lkr) {
  const n = Math.round(Number(lkr) * 100);
  return Math.max(n, 100);
}

function formatLkrAmount(cents) {
  return (cents / 100).toFixed(2);
}

function serviceFeeCents(consultationCents) {
  const fixed = Math.round(Number(process.env.SERVICE_FEE_LKR || 50) * 100);
  const pct = Math.round(consultationCents * 0.02);
  return Math.max(fixed, pct, 0);
}

function toMinutes12h(timeLabel = "") {
  const m = String(timeLabel).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3].toUpperCase();
  if (h === 12) h = 0;
  if (ampm === "PM") h += 12;
  return h * 60 + min;
}

function slotContainsMinutes(slot, mins) {
  const [sh, sm] = String(slot.start || "").split(":").map(Number);
  const [eh, em] = String(slot.end || "").split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return false;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return mins >= start && mins < end;
}

exports.createPendingBooking = async (req, res) => {
  try {
    const {
      doctorUserId,
      doctorName,
      specialization,
      doctorImage,
      date,
      time,
      reason,
      appointmentType = "physical",
      consultationFee,
      currency = "LKR",
    } = req.body;

    if (!doctorUserId || !date || !time) {
      return res.status(400).json({ message: "doctorUserId, date, and time are required" });
    }
    const requestedMins = toMinutes12h(time);
    if (requestedMins == null) {
      return res.status(400).json({ message: "Invalid time format. Use h:mm AM/PM." });
    }

    const dateObj = new Date(`${date}T12:00:00`);
    if (Number.isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }
    const dayName = DAY_NAMES[dateObj.getDay()];

    // Validate against doctor weekly availability
    const doctorsRes = await axios.get(`${DOCTOR_URL}/public`, {
      timeout: 10000,
      validateStatus: (s) => s >= 200 && s < 500,
    });
    if (doctorsRes.status >= 400 || !doctorsRes.data) {
      return res.status(502).json({ message: "Could not load doctor directory. Check DOCTOR_SERVICE_URL." });
    }
    const doctor = (doctorsRes.data?.doctors || []).find((d) => d.userId === doctorUserId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found." });
    }
    // Select the correct availability schedule based on appointment type.
    // Online → onlineAvailability only.
    // Physical → physicalAvailability, falling back to legacy availability field.
    const typeSchedule =
      appointmentType === "online"
        ? (doctor.onlineAvailability || [])
        : (doctor.physicalAvailability?.length ? doctor.physicalAvailability : (doctor.availability || []));
    const dayAvailability = typeSchedule.find((d) => d.day === dayName);
    const isWithinAvailability = (dayAvailability?.slots || []).some((slot) =>
      slotContainsMinutes(slot, requestedMins)
    );
    if (!isWithinAvailability) {
      return res.status(400).json({ message: `Doctor is not available for ${appointmentType} appointments on ${dayName} at ${time}.` });
    }

    // Validate against existing appointments (already booked times)
    const occupiedRes = await axios.get(
      `${APPOINTMENT_URL}/public/doctor/${encodeURIComponent(doctorUserId)}/occupied`,
      { params: { date }, timeout: 10000, validateStatus: (s) => s >= 200 && s < 500 }
    );
    const occupiedTimes = Array.isArray(occupiedRes.data?.occupiedTimes) ? occupiedRes.data.occupiedTimes : [];
    const wantT = normalizeTimeLabel(time);
    if (occupiedTimes.some((t) => normalizeTimeLabel(t) === wantT)) {
      return res.status(409).json({ message: "Selected time slot is already booked." });
    }

    // Prevent duplicate booking attempts by the same patient for same doctor/date/time.
    const authHeader = req.headers.authorization || "";
    if (authHeader) {
      const myAptRes = await axios.get(`${APPOINTMENT_URL}/my`, {
        headers: { Authorization: authHeader },
        timeout: 10000,
        validateStatus: () => true,
      });
      const myAppointments =
        myAptRes.status === 200 && Array.isArray(myAptRes.data?.appointments)
          ? myAptRes.data.appointments
          : [];
      const duplicateAppointment = myAppointments.some(
        (a) =>
          a.doctorId === doctorUserId &&
          a.date === date &&
          normalizeTimeLabel(a.time) === wantT &&
          !["cancelled", "rejected"].includes(a.status)
      );
      if (duplicateAppointment) {
        return res.status(409).json({ message: "You already booked this doctor for the selected date and time." });
      }
    }

    const duplicatePending = await PendingBooking.findOne({
      patientSub: req.user.sub,
      doctorUserId,
      date,
      time,
      status: "pending_payment",
      expiresAt: { $gt: new Date() },
    }).select("_id");
    if (duplicatePending) {
      return res.status(409).json({ message: "A pending checkout already exists for this slot." });
    }

    const consultationCents = lkrToCents(consultationFee || 0);
    const svc = serviceFeeCents(consultationCents);
    const orderId = `MF-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const doc = await PendingBooking.create({
      patientSub: req.user.sub,
      doctorUserId,
      doctorName: doctorName || "",
      specialization: specialization || "",
      doctorImage: doctorImage || "",
      date,
      time,
      reason: reason || "",
      appointmentType: ["physical", "online"].includes(appointmentType) ? appointmentType : "physical",
      currency,
      consultationFeeCents: consultationCents,
      serviceFeeCents: svc,
      orderId,
      expiresAt,
    });

    return res.status(201).json({
      pendingId: doc._id.toString(),
      orderId: doc.orderId,
      consultationFeeCents: doc.consultationFeeCents,
      serviceFeeCents: doc.serviceFeeCents,
      totalCents: doc.consultationFeeCents + doc.serviceFeeCents,
      currency: doc.currency,
      expiresAt: doc.expiresAt,
    });
  } catch (e) {
    console.error(e);
    if (e.response?.data?.message) {
      return res.status(e.response.status >= 400 && e.response.status < 600 ? e.response.status : 502).json({
        message: e.response.data.message,
      });
    }
    if (e.code === "ECONNREFUSED" || e.code === "ENOTFOUND" || e.code === "ECONNABORTED") {
      return res.status(503).json({
        message:
          "Could not reach doctor or appointment service. In Docker, set DOCTOR_SERVICE_URL and APPOINTMENT_SERVICE_URL to your internal service URLs (e.g. http://doctor-service:8003).",
      });
    }
    return res.status(500).json({ message: e.message || "Failed to create pending booking" });
  }
};

exports.getPendingBooking = async (req, res) => {
  try {
    const doc = await PendingBooking.findById(req.params.id);
    if (!doc || doc.patientSub !== req.user.sub) {
      return res.status(404).json({ message: "Pending booking not found" });
    }
    if (doc.status !== "pending_payment") {
      return res.status(400).json({ message: "Booking is no longer pending payment", status: doc.status });
    }
    if (doc.expiresAt < new Date()) {
      return res.status(400).json({ message: "This checkout session has expired" });
    }
    return res.json({
      pendingId: doc._id.toString(),
      orderId: doc.orderId,
      doctorName: doc.doctorName,
      specialization: doc.specialization,
      doctorImage: doc.doctorImage,
      date: doc.date,
      time: doc.time,
      reason: doc.reason,
      appointmentType: doc.appointmentType || "physical",
      consultationFeeCents: doc.consultationFeeCents,
      serviceFeeCents: doc.serviceFeeCents,
      totalCents: doc.consultationFeeCents + doc.serviceFeeCents,
      currency: doc.currency,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
      helakuruPayHereConfigured: payhereService.isPayHereConfigured(),
    });
  } catch (e) {
    return res.status(500).json({ message: "Failed to load booking" });
  }
};

exports.createStripeIntent = async (req, res) => {
  try {
    const { pendingId } = req.body;
    const doc = await PendingBooking.findById(pendingId);
    if (!doc || doc.patientSub !== req.user.sub) {
      return res.status(404).json({ message: "Pending booking not found" });
    }
    if (doc.status !== "pending_payment" || doc.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired booking" });
    }

    const total = doc.consultationFeeCents + doc.serviceFeeCents;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
    const pendingIdStr = doc._id.toString();

    // Reuse an existing PaymentIntent when possible so React re-runs / double
    // clicks do not mount a new clientSecret while the old PI already succeeded.
    if (doc.stripePaymentIntentId) {
      const existing = await stripeService.retrievePaymentIntent(doc.stripePaymentIntentId);
      if (existing) {
        const metaPending = String(existing.metadata?.pendingId || "");
        const amountOk = Number(existing.amount) === total;
        const currencyOk =
          String(existing.currency || "").toLowerCase() === String(doc.currency || "lkr").toLowerCase();

        if (metaPending === pendingIdStr && amountOk && currencyOk) {
          if (existing.status === "succeeded") {
            return res.json({
              alreadySucceeded: true,
              paymentIntentId: existing.id,
              publishableKey,
            });
          }
          const reusable = [
            "requires_payment_method",
            "requires_confirmation",
            "requires_action",
            "processing",
          ].includes(existing.status);
          if (reusable && existing.client_secret) {
            return res.json({
              clientSecret: existing.client_secret,
              paymentIntentId: existing.id,
              publishableKey,
            });
          }
        }
      }
    }

    const result = await stripeService.createPaymentIntent({
      amountCents: total,
      currency: doc.currency,
      metadata: {
        pendingId: pendingIdStr,
        orderId: doc.orderId,
        patientSub: doc.patientSub,
      },
    });

    if (result.error) {
      return res.status(503).json({ message: result.error });
    }

    doc.stripePaymentIntentId = result.paymentIntentId;
    await doc.save();

    return res.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      publishableKey,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to create payment intent" });
  }
};

exports.createHelaPayCheckout = async (req, res) => {
  try {
    const { pendingId } = req.body;
    const doc = await PendingBooking.findById(pendingId);
    if (!doc || doc.patientSub !== req.user.sub) {
      return res.status(404).json({ message: "Pending booking not found" });
    }
    if (doc.status !== "pending_payment" || doc.expiresAt < new Date()) {
      return res.status(400).json({ message: "Invalid or expired booking" });
    }

    const totalCents = doc.consultationFeeCents + doc.serviceFeeCents;
    const amountFormatted = formatLkrAmount(totalCents);
    const base =
      process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "http://localhost:5173";
    const apiPublic = (process.env.API_PUBLIC_URL || "http://localhost:8081").replace(/\/$/, "");

    const checkout = payhereService.createCheckoutFields({
      orderId: doc.orderId,
      amountFormatted,
      currency: doc.currency,
      itemsTitle: `Consultation — ${doc.doctorName}`,
      customerEmail: req.body.email,
      customerPhone: req.body.phone,
      customerFirstName: req.body.firstName,
      customerLastName: req.body.lastName,
      returnUrl: `${base}/patient/payment?pending=${doc._id}&helakuru=1`,
      cancelUrl: `${base}/patient/payment?pending=${doc._id}&cancelled=1`,
      notifyUrl: `${apiPublic}/api/payments/webhooks/payhere`,
    });

    if (checkout.error) {
      return res.status(503).json({ message: checkout.error, simulated: true });
    }

    return res.json({
      actionUrl: checkout.actionUrl,
      fields: checkout.fields,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to start Helakuru (PayHere) checkout" });
  }
};

/**
 * After Stripe succeeds on client (or PayHere webhook marked paid), create appointment (idempotent).
 */
exports.completeBookingAfterPayment = async (req, res) => {
  try {
    const { pendingId, paymentIntentId } = req.body;
    const doc = await PendingBooking.findById(pendingId);
    if (!doc || doc.patientSub !== req.user.sub) {
      return res.status(404).json({ message: "Pending booking not found" });
    }

    if (doc.appointmentCreated) {
      return res.status(200).json({
        message: "Appointment already created",
        orderId: doc.orderId,
        alreadyCompleted: true,
      });
    }

    let paymentVerified = doc.status === "paid";

    if (paymentIntentId) {
      const pi = await stripeService.retrievePaymentIntent(paymentIntentId);
      if (!pi) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      if (pi.metadata?.pendingId !== doc._id.toString()) {
        return res.status(400).json({ message: "Payment does not match this booking" });
      }
      if (pi.status !== "succeeded") {
        return res.status(400).json({ message: "Payment not completed", status: pi.status });
      }
      paymentVerified = true;
      doc.status = "paid";
      doc.stripePaymentIntentId = pi.id;
      await doc.save();
    }

    if (!paymentVerified) {
      return res.status(400).json({
        message: "Payment not verified yet. Complete card payment or Helakuru (PayHere) first.",
      });
    }

    const authHeader = req.headers.authorization;
    const patientName =
      req.user?.name ||
      (req.user?.email ? String(req.user.email).split("@")[0] : "") ||
      "Patient";
    const appointmentPayload = {
      patientName,
      // Used by some frontends as a stable identifier.
      sessionId: doc._id.toString(),
      doctorId: doc.doctorUserId,
      doctorName: doc.doctorName,
      specialization: doc.specialization,
      date: doc.date,
      time: doc.time,
      reason: doc.reason || `Consultation paid. Order ${doc.orderId}`,
      notes: doc.reason || `Consultation paid. Order ${doc.orderId}`,
      appointmentType: doc.appointmentType || "physical",
    };

    try {
      // appointment-service mounts all routes at `/` (see appointment.routes.js)
      // so creating an appointment is POST `${APPOINTMENT_URL}/`.
      const aptRes = await axios.post(`${APPOINTMENT_URL}/`, appointmentPayload, {
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        timeout: 15000,
      });
      doc.appointmentCreated = true;
      await doc.save();
      return res.status(201).json({
        message: "Appointment booked",
        appointment: aptRes.data?.appointment,
        orderId: doc.orderId,
      });
    } catch (aptErr) {
      const msg = aptErr.response?.data?.message || aptErr.message;
      console.error("Appointment create failed:", msg);
      return res.status(502).json({
        message: "Payment OK but appointment creation failed. Contact support with order id.",
        orderId: doc.orderId,
        status: aptErr.response?.status,
        detail: msg,
        response: aptErr.response?.data,
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Failed to complete booking" });
  }
};

// Public: return occupied times from paid/pending PendingBookings for a doctor/date.
// Used by frontend to filter already-booked slots in the booking modal.
exports.getDoctorOccupiedFromPending = async (req, res) => {
  try {
    const { doctorUserId, date } = req.query;
    if (!doctorUserId || !date) {
      return res.status(400).json({ message: "doctorUserId and date are required" });
    }

    const docs = await PendingBooking.find({
      doctorUserId,
      date,
      status: { $in: ["pending_payment", "paid"] },
      expiresAt: { $gt: new Date() },
    }).select("time");

    const occupiedTimes = Array.from(
      new Set(docs.map((d) => String(d.time || "").trim()).filter(Boolean))
    );

    return res.json({ occupiedTimes });
  } catch (e) {
    return res.status(500).json({ message: "Failed to fetch occupied times" });
  }
};

exports.simulateHelaPayDev = async (req, res) => {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PAYMENT_SIMULATE !== "true") {
    return res.status(403).json({ message: "Not available" });
  }
  try {
    const { pendingId } = req.body;
    const doc = await PendingBooking.findById(pendingId);
    if (!doc || doc.patientSub !== req.user.sub) {
      return res.status(404).json({ message: "Pending booking not found" });
    }
    doc.status = "paid";
    doc.payherePaymentId = "simulated-" + Date.now();
    await doc.save();
    return res.json({ message: "Simulated Helakuru (PayHere) success", pendingId: doc._id.toString() });
  } catch (e) {
    return res.status(500).json({ message: "Simulate failed" });
  }
};
