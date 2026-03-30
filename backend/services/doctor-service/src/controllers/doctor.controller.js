const axios = require("axios");
const Doctor = require("../models/doctor.model");

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
            consultationFee = 0
        } = req.body;

        if (!fullName) {
            return res.status(400).json({ message: "fullName is required" });
        }

        const doctor = await Doctor.findOneAndUpdate(
            { userId: req.user.sub },
            {
                $set: {
                    userId: req.user.sub,
                    fullName,
                    email: email.toLowerCase(),
                    phone,
                    specialization,
                    qualifications,
                    bio,
                    consultationFee
                }
            },
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

// ── Public listing (no auth required) ────────────────────────────────────────

exports.getPublicDoctors = async (req, res) => {
    try {
        const mongoose = require("mongoose");
        if (mongoose.connection.readyState !== 1) {
            return res.status(200).json({ doctors: [] });
        }

        const doctors = await Doctor.find({ isVerified: true })
            .select("_id userId fullName specialization qualifications bio consultationFee availability")
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
            .select("_id userId fullName specialization qualifications bio consultationFee availability isVerified")
            .sort({ fullName: 1 });
        return res.status(200).json({ doctors });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch doctors" });
    }
};

exports.getDoctorById = async (req, res) => {
    try {
        const doctor = await Doctor.findById(req.params.id).select(
            "_id userId fullName specialization qualifications bio consultationFee availability"
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
