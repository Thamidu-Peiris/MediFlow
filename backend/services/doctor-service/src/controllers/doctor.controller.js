const axios = require("axios");
const cloudinaryCfg = require("../config/cloudinary");
const Doctor = require("../models/doctor.model");

function cloudinaryHttpStatus(error) {
  const code = Number(error?.http_code);
  if (code === 401 || code === 403) return 502;
  if (code >= 400 && code < 500) return 502;
  return 500;
}

function cloudinaryErrorDetail(error) {
  const msg = error?.message && error.message !== "undefined" ? error.message : "";
  return msg.length > 280 ? `${msg.slice(0, 280)}…` : msg || "Unknown error";
}

// ── Profile ──────────────────────────────────────────────────────────────────

exports.upsertProfile = async (req, res) => {
    try {
        const {
            fullName,
            email = "",
            phone = "",
            specialization = "",
            qualifications = [],
            bio = "",
            consultationFee = 0,
            image
        } = req.body;

        if (!fullName) {
            return res.status(400).json({ message: "fullName is required" });
        }

        const updateFields = {
            userId: req.user.sub,
            fullName,
            email: email.toLowerCase(),
            phone,
            specialization,
            qualifications,
            bio,
            consultationFee
        };
        if (image !== undefined) {
            updateFields.image = image;
        }

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.sub },
            { $set: updateFields },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({ doctor });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to save profile" });
    }
};

exports.getMyProfile = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.sub });
        if (!doctor) {
            return res.status(404).json({ message: "Profile not found" });
        }
        return res.status(200).json({ doctor });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch profile" });
    }
};

// ── Availability helpers ──────────────────────────────────────────────────────

function toMins(t) {
    const [h, m] = String(t || "0:0").split(":").map(Number);
    return h * 60 + m;
}

/**
 * Returns true if any slot in scheduleA overlaps (by time) with any slot in
 * scheduleB on the same day.  Both arguments are arrays of { day, slots[] }.
 */
function hasTimeConflict(scheduleA, scheduleB) {
    for (const dayA of scheduleA) {
        const dayB = scheduleB.find((d) => d.day === dayA.day);
        if (!dayB || !dayB.slots.length) continue;
        for (const slotA of dayA.slots) {
            const sA = toMins(slotA.start);
            const eA = toMins(slotA.end);
            for (const slotB of dayB.slots) {
                const sB = toMins(slotB.start);
                const eB = toMins(slotB.end);
                if (sA < eB && eA > sB) return true;
            }
        }
    }
    return false;
}

// ── Availability ─────────────────────────────────────────────────────────────

exports.setAvailability = async (req, res) => {
    try {
        const { availability } = req.body;
        if (!Array.isArray(availability)) {
            return res.status(400).json({ message: "availability must be an array" });
        }

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.sub },
            { $set: { availability } },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).json({ message: "Create your profile first" });
        }

        return res.status(200).json({ availability: doctor.availability });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update availability" });
    }
};

exports.setPhysicalAvailability = async (req, res) => {
    try {
        const { availability } = req.body;
        if (!Array.isArray(availability)) {
            return res.status(400).json({ message: "availability must be an array" });
        }

        const existing = await Doctor.findOne({ userId: req.user.sub })
            .select("onlineAvailability");
        if (!existing) {
            return res.status(404).json({ message: "Create your profile first" });
        }

        if (existing.onlineAvailability?.length && hasTimeConflict(availability, existing.onlineAvailability)) {
            return res.status(409).json({
                message: "Time conflict with your online availability. Overlapping slots detected on one or more days."
            });
        }

        // Also sync the legacy `availability` field so existing code keeps working.
        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.sub },
            { $set: { physicalAvailability: availability, availability } },
            { new: true }
        );

        return res.status(200).json({ physicalAvailability: doctor.physicalAvailability });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update physical availability" });
    }
};

exports.setOnlineAvailability = async (req, res) => {
    try {
        const { availability } = req.body;
        if (!Array.isArray(availability)) {
            return res.status(400).json({ message: "availability must be an array" });
        }

        const existing = await Doctor.findOne({ userId: req.user.sub })
            .select("physicalAvailability availability");
        if (!existing) {
            return res.status(404).json({ message: "Create your profile first" });
        }

        // Use physicalAvailability if the doctor has migrated; otherwise fall back
        // to the legacy `availability` field so pre-existing schedules are respected.
        const physSched = existing.physicalAvailability?.length
            ? existing.physicalAvailability
            : (existing.availability || []);

        if (physSched.length && hasTimeConflict(availability, physSched)) {
            return res.status(409).json({
                message: "Time conflict with your physical availability. Overlapping slots detected on one or more days."
            });
        }

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.sub },
            { $set: { onlineAvailability: availability } },
            { new: true }
        );

        return res.status(200).json({ onlineAvailability: doctor.onlineAvailability });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to update online availability" });
    }
};

// ── Public listing (no auth required) ────────────────────────────────────────

exports.getPublicDoctors = async (req, res) => {
    try {
        const mongoose = require("mongoose");
        if (mongoose.connection.readyState !== 1) {
            return res.status(200).json({ doctors: [] });
        }

        const doctors = await Doctor.find({ isVerified: true })
            .select("_id userId fullName specialization qualifications bio consultationFee availability physicalAvailability onlineAvailability image")
            .sort({ fullName: 1 });
        return res.status(200).json({ doctors });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch doctors" });
    }
};

exports.getAllDoctors = async (req, res) => {
    try {
        const mongoose = require("mongoose");
        if (mongoose.connection.readyState !== 1) {
            return res.status(200).json({ doctors: [] });
        }

        const doctors = await Doctor.find()
            .select("_id userId fullName specialization qualifications bio consultationFee availability physicalAvailability onlineAvailability isVerified image")
            .sort({ fullName: 1 });
        return res.status(200).json({ doctors });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch doctors" });
    }
};

exports.getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).select(
            "_id userId fullName specialization qualifications bio consultationFee availability physicalAvailability onlineAvailability image"
        );
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }
        return res.status(200).json({ doctor });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch doctor" });
    }
};

// ── Patient reports (proxy to patient-service) ────────────────────────────────

exports.getPatientReports = async (req, res) => {
    try {
        const patientServiceUrl =
            process.env.PATIENT_SERVICE_URL || "http://localhost:8002";
        const response = await axios.get(
            `${patientServiceUrl}/reports`,
            {
                headers: {
                    Authorization: req.headers.authorization || ""
                },
                // Use the patient's own token which a doctor won't have;
                // so we send the doctor's token and let the patient service validate.
                // For cross-service calls we forward the doctor's JWT so the
                // patient-service middleware can at least verify signature.
                // The doctor frontend should supply the patientId in the URL param.
            }
        );
        return res.status(200).json(response.data);
    } catch (error) {
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        return res.status(500).json({ message: "Failed to fetch patient reports" });
    }
};

// ── Prescriptions ─────────────────────────────────────────────────────────────

exports.issuePrescription = async (req, res) => {
    try {
        const { patientId, patientName = "", appointmentId = "", medicines = [], notes = "" } = req.body;

        if (!patientId) {
            return res.status(400).json({ message: "patientId is required" });
        }

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.sub },
            {
                $push: {
                    prescriptions: { patientId, patientName, appointmentId, medicines, notes }
                }
            },
            { new: true }
        );

        if (!doctor) {
            return res.status(404).json({ message: "Create your profile first" });
        }

        const issued = doctor.prescriptions[doctor.prescriptions.length - 1];
        return res.status(201).json({ prescription: issued });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to issue prescription" });
    }
};

exports.listIssuedPrescriptions = async (req, res) => {
    try {
        const doctor = await Doctor.findOne({ userId: req.user.sub }).select("prescriptions");
        if (!doctor) {
            return res.status(404).json({ message: "Profile not found" });
        }
        return res.status(200).json({ prescriptions: doctor.prescriptions || [] });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch prescriptions" });
    }
};

// ── Profile Image Upload ───────────────────────────────────────────────────────

exports.uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        if (!cloudinaryCfg.isConfigured()) {
            return res.status(503).json({
                message:
                    "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to doctor-service .env."
            });
        }

        const safeId = String(req.user.sub || "").replace(/[^a-zA-Z0-9_-]/g, "_");
        const result = await cloudinaryCfg.uploadBuffer(req.file.buffer, {
            folder: "mediflow/doctors",
            public_id: safeId || "doctor",
            overwrite: true,
            resource_type: "image"
        });

        const insertName = (req.user.name && String(req.user.name).trim()) || "Doctor";
        const insertEmail = (req.user.email && String(req.user.email).toLowerCase().trim()) || "";

        await Doctor.findOneAndUpdate(
            { userId: req.user.sub },
            {
                $set: { image: result.secure_url },
                $setOnInsert: {
                    fullName: insertName,
                    email: insertEmail
                }
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        );

        res.setHeader("X-MediFlow-Upload-Engine", "cloudinary");
        return res.status(200).json({ imageUrl: result.secure_url });
    } catch (error) {
        console.error("uploadProfileImage:", error?.http_code || "", error?.message || error);
        if (error?.http_code != null) {
            return res.status(cloudinaryHttpStatus(error)).json({
                message: `Cloudinary upload failed: ${cloudinaryErrorDetail(error)}. Check CLOUDINARY_* in doctor-service .env.`
            });
        }
        return res.status(500).json({ message: error?.message || "Failed to upload image" });
    }
};
