const Appointment = require("../models/appointment.model");

// ── Patient ────────────────────────────────────────────────────────────────────

exports.requestAppointment = async (req, res) => {
    try {
        const { doctorId, doctorName = "", specialization = "", date, time = "", reason = "" } = req.body;

        if (!doctorId || !date) {
            return res.status(400).json({ message: "doctorId and date are required" });
        }

        const appointment = await Appointment.create({
            patientId: req.user.sub,
            patientName: req.user.name || "",
            doctorId,
            doctorName,
            specialization,
            date,
            time,
            reason,
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

        const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
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
