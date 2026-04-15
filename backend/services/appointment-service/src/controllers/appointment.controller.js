const Appointment = require("../models/appointment.model");
const mongoose = require("mongoose");
const axios = require("axios");

const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:8006";
const DOCTOR_SERVICE_URL = process.env.DOCTOR_SERVICE_URL || "http://localhost:8003";

// Minimal reference model to fetch patient names from the same MongoDB cluster.
// patient-service stores documents in the `patients` collection with fields:
// - userId
// - fullName
const PatientRef =
    mongoose.models.PatientRef ||
    mongoose.model(
        "PatientRef",
        new mongoose.Schema(
            {
                userId: { type: String, index: true },
                fullName: { type: String },
                avatar: { type: String, default: "" },
                dob: { type: Date, default: null },
                gender: { type: String, default: "" },
                bloodType: { type: String, default: "" },
                age: { type: Number, default: null }
            },
            { collection: "patients" }
        )
    );

function calcAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const monthDiff = now.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
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

// ── Public (no auth) ──────────────────────────────────────────────────────────

exports.listDoctorOccupiedTimes = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date, excludeId } = req.query;
        if (!doctorId || !date) {
            return res.status(400).json({ message: "doctorId and date are required" });
        }

        const filter = {
            doctorId,
            date,
            status: { $nin: ["cancelled", "rejected"] }
        };
        // When rescheduling, exclude the appointment being rescheduled so its
        // own time slot appears as available again.
        if (excludeId) {
            filter._id = { $ne: excludeId };
        }

        const appointments = await Appointment.find(filter).select("time status");

        const appointmentTimes = appointments
            .map((a) => String(a.time || "").trim())
            .filter(Boolean);

        // Also fetch occupied times from payment service (paid, appointment not created yet)
        let pendingTimes = [];
        try {
            const pRes = await axios.get(
                `${PAYMENT_SERVICE_URL}/doctor-occupied`,
                { params: { doctorUserId: doctorId, date }, timeout: 3000 }
            );
            if (Array.isArray(pRes.data?.occupiedTimes)) {
                pendingTimes = pRes.data.occupiedTimes;
            }
        } catch {
            // payment service unavailable — proceed with appointment data only
        }

        const occupiedTimes = Array.from(
            new Set([...appointmentTimes, ...pendingTimes])
        );

        return res.status(200).json({ occupiedTimes });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch occupied times" });
    }
};

// ── Patient ────────────────────────────────────────────────────────────────────

exports.requestAppointment = async (req, res) => {
    try {
        const {
            doctorId,
            doctorName = "",
            specialization = "",
            date,
            time = "",
            reason = "",
            // Optional fields (sent by payment-service after payment)
            patientName = "",
            sessionId = "",
            notes = "",
            appointmentType = "physical"
        } = req.body;

        if (!doctorId || !date) {
            return res.status(400).json({ message: "doctorId and date are required" });
        }

        const requestedMins = toMinutes12h(time);
        if (time && requestedMins == null) {
            return res.status(400).json({ message: "Invalid time format. Use h:mm AM/PM." });
        }

        const conflict = await Appointment.findOne({
            doctorId,
            date,
            time,
            status: { $nin: ["cancelled", "rejected"] }
        }).select("_id");

        if (conflict) {
            return res.status(409).json({ message: "Selected time slot is already booked" });
        }

        const appointment = await Appointment.create({
            patientId: req.user.sub,
            // Prefer explicit patientName from body (payment-service), otherwise fall back to JWT.
            patientName: patientName || req.user.name || "",
            doctorId,
            doctorName,
            specialization,
            date,
            time,
            reason,
            appointmentType: ["physical", "online"].includes(appointmentType) ? appointmentType : "physical",
            // Keep these non-empty when payment-service sends values.
            sessionId,
            notes,
            status: "pending"
        });

        return res.status(201).json({ appointment });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create appointment" });
    }
};

exports.listMyAppointments = async (req, res) => {
    try {
        const appointments = await Appointment.find({ patientId: req.user.sub }).sort({ createdAt: -1 }).lean();
        // Backfill empty fields created by earlier flows (also overwrite placeholder "Patient")
        const toBackfill = appointments.filter(
            (a) => !a.patientName || a.patientName === "Patient" || !a.sessionId || !a.notes
        );
        if (toBackfill.length) {
            await Promise.all(
                toBackfill.map(async (a) => {
                    const set = {};
                    if (!a.patientName || a.patientName === "Patient") set.patientName = req.user?.name || "Patient";
                    if (!a.sessionId) set.sessionId = String(a._id);
                    if (!a.notes) set.notes = a.reason || "Consultation paid";
                    // Keep in-memory values consistent with what we write to MongoDB
                    a.patientName = set.patientName ?? a.patientName;
                    a.sessionId = set.sessionId ?? a.sessionId;
                    a.notes = set.notes ?? a.notes;
                    return Appointment.updateOne({ _id: a._id }, { $set: set });
                })
            );
        }

        // Enrich appointments that have no stored consultationFee from doctor service
        const needsEnrichment = appointments.filter((a) => !a.consultationFee);
        if (needsEnrichment.length) {
            try {
                const doctorsRes = await axios.get(`${DOCTOR_SERVICE_URL}/public`, { timeout: 3000 });
                const doctors = Array.isArray(doctorsRes.data?.doctors) ? doctorsRes.data.doctors : [];
                const feeById = {};
                for (const d of doctors) {
                    if (d.userId) feeById[String(d.userId)] = d.consultationFee ?? 0;
                }
                for (const a of needsEnrichment) {
                    a.consultationFee = feeById[String(a.doctorId)] ?? 0;
                }
            } catch {
                // doctor service unavailable — proceed without fees
            }
        }

        return res.status(200).json({ appointments });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch appointments" });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, patientId: req.user.sub, status: { $in: ["pending", "accepted"] } },
            { $set: { status: "cancelled" } },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found or cannot be cancelled" });
        }

        // Attempt refund via payment service if the appointment was linked to a payment.
        // The patient's auth token is forwarded so the payment service can verify ownership.
        let refund = null;
        if (appointment.sessionId) {
            try {
                const refundRes = await axios.post(
                    `${PAYMENT_SERVICE_URL}/refund-by-session`,
                    { sessionId: appointment.sessionId },
                    {
                        headers: {
                            Authorization: req.headers.authorization,
                            "Content-Type": "application/json",
                        },
                        timeout: 10000,
                    }
                );
                refund = refundRes.data;
            } catch {
                // Refund call failed — appointment is still cancelled; client shows fallback message.
                refund = { refunded: false, reason: "refund_service_unavailable" };
            }
        }

        return res.status(200).json({ appointment, refund });
    } catch (error) {
        return res.status(500).json({ message: "Failed to cancel appointment" });
    }
};

exports.rescheduleAppointment = async (req, res) => {
    try {
        const { date, time = "" } = req.body || {};
        if (!date || !time) {
            return res.status(400).json({ message: "date and time are required" });
        }

        const requestedMins = toMinutes12h(time);
        if (requestedMins == null) {
            return res.status(400).json({ message: "Invalid time format. Use h:mm AM/PM." });
        }

        const appointment = await Appointment.findOne({
            _id: req.params.id,
            patientId: req.user.sub,
            status: { $in: ["pending", "accepted"] }
        });

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found or cannot be rescheduled" });
        }

        const conflict = await Appointment.findOne({
            _id: { $ne: appointment._id },
            doctorId: appointment.doctorId,
            date,
            time,
            status: { $nin: ["cancelled", "rejected"] }
        }).select("_id");

        if (conflict) {
            return res.status(409).json({ message: "Selected time slot is already booked" });
        }

        appointment.date = date;
        appointment.time = String(time).trim();
        await appointment.save();

        return res.status(200).json({ appointment });
    } catch (error) {
        return res.status(500).json({ message: "Failed to reschedule appointment" });
    }
};

// ── Doctor ─────────────────────────────────────────────────────────────────────

exports.listDoctorAppointments = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { doctorId: req.user.sub };
        if (status) filter.status = status;

        // Use `.lean()` so we return plain JS objects and any enrichment fields
        // we attach (patientImage/patientAge/etc) are guaranteed to be included
        // in the JSON response body.
        const appointments = await Appointment.find(filter).sort({ createdAt: -1 }).lean();

        // Enrich doctor view with patient profile fields for UI.
        // Frontend expects:
        // - patientName
        // - patientImage
        // - patientAge
        // - patientGender
        // - bloodType
        // - sessionId / notes
        const patientIds = Array.from(new Set(appointments.map((a) => a.patientId).filter(Boolean)));

        const patientRows = patientIds.length
            ? await PatientRef.find({ userId: { $in: patientIds } }).select(
                "userId fullName avatar dob gender bloodType age"
            )
            : [];

        const patientById = {};
        for (const p of patientRows) {
            patientById[String(p.userId)] = p;
        }

        // Persist minimal fields backfill (patientName/sessionId/notes) if missing.
        const toBackfill = appointments.filter(
            (a) => !a.patientName || a.patientName === "Patient" || !a.sessionId || !a.notes
        );

        if (toBackfill.length) {
            await Promise.all(
                toBackfill.map(async (a) => {
                    const set = {};

                    const patient = patientById[String(a.patientId)];

                    if (!a.patientName || a.patientName === "Patient") {
                        set.patientName = patient?.fullName || "Patient";
                    }
                    if (!a.sessionId) set.sessionId = String(a._id);
                    if (!a.notes) set.notes = a.reason || "Consultation paid";

                    a.patientName = set.patientName ?? a.patientName;
                    a.sessionId = set.sessionId ?? a.sessionId;
                    a.notes = set.notes ?? a.notes;

                    return Appointment.updateOne({ _id: a._id }, { $set: set });
                })
            );
        }

        // Attach enrichment fields for response without changing appointment schema.
        for (const a of appointments) {
            const patient = patientById[String(a.patientId)];
            a.patientImage = patient?.avatar || a.patientImage || "";
            a.patientGender = patient?.gender || a.patientGender || "";
            a.bloodType = patient?.bloodType || a.bloodType || "";
            // Prefer explicit `patients.age` (exists in patient schema) over `dob` calculation.
            a.patientAge = patient?.age != null ? patient.age : calcAge(patient?.dob);
            // Always set patientName from patient profile when available.
            a.patientName = patient?.fullName || a.patientName || "Patient";
        }

        return res.status(200).json({ appointments });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch appointments" });
    }
};

exports.acceptAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.sub, status: "pending" },
            { $set: { status: "accepted" } },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found or already processed" });
        }

        // Trigger Notification Service asynchronously
        axios.post("http://notification-service:8005/api/notifications/send", {
            type: "APPOINTMENT_BOOKED",
            doctorEmail: req.user?.email || "doc@example.com",
            doctorPhone: "+11234567890", // Defaulting to mock formatted phone
            patientEmail: `patient_${appointment.patientId || "000"}@example.com`,
            patientPhone: "+10987654321",
            payload: {
                appointmentId: appointment._id,
                date: appointment.date,
                time: appointment.time
            }
        }).catch(err => console.error("[Appointment] Notification trigger failed:", err.message));

        return res.status(200).json({ appointment });
    } catch (error) {
        return res.status(500).json({ message: "Failed to accept appointment" });
    }
};

exports.rejectAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.sub, status: "pending" },
            { $set: { status: "rejected" } },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found or already processed" });
        }

        return res.status(200).json({ appointment });
    } catch (error) {
        return res.status(500).json({ message: "Failed to reject appointment" });
    }
};

exports.completeAppointment = async (req, res) => {
    try {
        const { notes = "" } = req.body;
        const appointment = await Appointment.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.sub, status: "accepted" },
            { $set: { status: "completed", notes } },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found or not accepted" });
        }

        return res.status(200).json({ appointment });
    } catch (error) {
        return res.status(500).json({ message: "Failed to complete appointment" });
    }
};
