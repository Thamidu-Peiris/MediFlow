const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
    {
        patientId: { type: String, required: true, index: true },
        patientName: { type: String, default: "" },
        doctorId: { type: String, required: true, index: true },
        doctorName: { type: String, default: "" },
        specialization: { type: String, default: "" },
        date: { type: String, required: true },
        time: { type: String, default: "" },
        reason: { type: String, default: "" },
        appointmentType: {
            type: String,
            enum: ["physical", "online"],
            default: "physical"
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
            default: "pending"
        },
        consultationFee: { type: Number, default: 0 },
        sessionId: { type: String, default: "" },
        notes: { type: String, default: "" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
