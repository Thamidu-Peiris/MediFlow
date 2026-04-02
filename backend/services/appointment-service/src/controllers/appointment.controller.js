const Appointment = require("../models/appointment.model");
const mongoose = require("mongoose");

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
            notes = ""
        } = req.body;

        if (!doctorId || !date) {
            return res.status(400).json({ message: "doctorId and date are required" });
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
        const appointments = await Appointment.find({ patientId: req.user.sub }).sort({ createdAt: -1 });
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

        return res.status(200).json({ appointment });
    } catch (error) {
        return res.status(500).json({ message: "Failed to cancel appointment" });
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
