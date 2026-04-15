const { randomUUID } = require("crypto");
const Session = require("../models/session.model");
const { RtcTokenBuilder, RtcRole } = require("agora-token");

exports.getAgoraConfig = (req, res) => {
    const appId = process.env.AGORA_APP_ID || "";
    if (!appId) {
        return res.status(503).json({ message: "Agora is not configured on this server." });
    }
    return res.status(200).json({ appId });
};

exports.getSessionByAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const session = await Session.findOne({ appointmentId }).sort({ createdAt: -1 });
        if (!session) {
            return res.status(404).json({ message: "No session found for this appointment" });
        }
        if (session.doctorId !== req.user.sub && session.patientId !== req.user.sub && req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }
        return res.status(200).json({ session });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch session" });
    }
};

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

        // Trigger Notification Service asynchronously
        const axios = require("axios");
        axios.post("http://notification-service:8005/api/notifications/send", {
            type: "CONSULTATION_COMPLETED",
            doctorEmail: req.user?.email || "doc@example.com",
            doctorPhone: "+11234567890", // Mock formatted phone
            patientEmail: `patient_${session.patientId || "000"}@example.com`,
            patientPhone: "+10987654321",
            payload: {
                sessionId: session._id,
                date: new Date().toLocaleDateString()
            }
        }).catch(err => console.error("[Telemedicine] Notification trigger failed:", err.message));

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

exports.addChatMessage = async (req, res) => {
    try {
        const { text, role, senderName } = req.body;
        if (!text) return res.status(400).json({ message: "Message text is required" });

        const session = await Session.findByIdAndUpdate(
            req.params.id,
            {
                $push: {
                    chatMessages: {
                        text,
                        role,
                        senderId: req.user.sub,
                        senderName: senderName || req.user.name,
                        time: new Date()
                    }
                }
            },
            { new: true }
        );

        if (!session) return res.status(404).json({ message: "Session not found" });
        return res.status(200).json({ chatMessages: session.chatMessages });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to add message" });
    }
};

exports.getChatMessages = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id).select("chatMessages");
        if (!session) return res.status(404).json({ message: "Session not found" });
        return res.status(200).json({ chatMessages: session.chatMessages || [] });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch messages" });
    }
};

exports.generateToken = (req, res) => {
    try {
        const { channelName, uid } = req.query;

        if (!channelName) {
            return res.status(400).json({ message: "channelName is required" });
        }

        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_PRIMARY_CERTIFICATE;

        if (!appId || !appCertificate) {
            return res.status(503).json({ message: "Agora App ID or Certificate not configured" });
        }

        // Token expiration time (24 hours)
        const expirationTimeInSeconds = 86400;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        // Generate token with publisher role
        const token = RtcTokenBuilder.buildTokenWithUid(
            appId,
            appCertificate,
            channelName,
            uid,
            RtcRole.PUBLISHER,
            privilegeExpiredTs
        );

        return res.status(200).json({
            token,
            uid,
            channelName,
            role: "publisher",
            expiresIn: expirationTimeInSeconds
        });
    } catch (error) {
        console.error("Token generation error:", error);
        return res.status(500).json({ message: "Failed to generate token" });
    }
};
