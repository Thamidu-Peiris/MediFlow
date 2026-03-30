const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        appointmentId: { type: String, default: "" },
        doctorId: { type: String, required: true, index: true },
        doctorName: { type: String, default: "" },
        patientId: { type: String, required: true, index: true },
        patientName: { type: String, default: "" },
        roomId: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ["waiting", "active", "ended"],
            default: "waiting"
        },
        startedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
        doctorNotes: { type: String, default: "" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
