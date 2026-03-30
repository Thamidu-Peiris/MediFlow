const { randomUUID } = require("crypto");
const Session = require("../models/session.model");

exports.createSession = async (req, res) => {
    try {
        const { appointmentId = "", patientId, patientName = "" } = req.body;

        if (!patientId) {
            return res.status(400).json({ message: "patientId is required" });
        }

        const roomId = randomUUID();

        const session = await Session.create({
            appointmentId,
            doctorId: req.user.sub,
            doctorName: req.user.name || "",
            patientId,
            patientName,
            roomId,
            status: "waiting"
        });

        return res.status(201).json({ session });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create session" });
    }
};

exports.getSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        // Only participants can view
        if (session.doctorId !== req.user.sub && session.patientId !== req.user.sub && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }
        return res.status(200).json({ session });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch session" });
    }
};

exports.getSessionByRoom = async (req, res) => {
    try {
        const session = await Session.findOne({ roomId: req.params.roomId });
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        return res.status(200).json({ session });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch session" });
    }
};

exports.listMySessions = async (req, res) => {
    try {
        const filter =
            req.user.role === "doctor"
                ? { doctorId: req.user.sub }
                : { patientId: req.user.sub };

        const sessions = await Session.find(filter).sort({ createdAt: -1 });
        return res.status(200).json({ sessions });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch sessions" });
    }
};

exports.startSession = async (req, res) => {
    try {
        const session = await Session.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.sub, status: "waiting" },
            { $set: { status: "active", startedAt: new Date() } },
            { new: true }
        );
        if (!session) {
            return res.status(404).json({ message: "Session not found or already started" });
        }
        return res.status(200).json({ session });
    } catch (error) {
        return res.status(500).json({ message: "Failed to start session" });
    }
};

exports.endSession = async (req, res) => {
    try {
        const session = await Session.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.sub, status: "active" },
            { $set: { status: "ended", endedAt: new Date() } },
            { new: true }
        );
        if (!session) {
            return res.status(404).json({ message: "Session not found or not active" });
        }
        return res.status(200).json({ session });
    } catch (error) {
        return res.status(500).json({ message: "Failed to end session" });
    }
};

exports.addNotes = async (req, res) => {
    try {
        const { doctorNotes = "" } = req.body;
        const session = await Session.findOneAndUpdate(
            { _id: req.params.id, doctorId: req.user.sub },
            { $set: { doctorNotes } },
            { new: true }
        );
        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }
        return res.status(200).json({ session });
    } catch (error) {
        return res.status(500).json({ message: "Failed to add notes" });
    }
};
