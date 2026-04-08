const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
    { start: { type: String, required: true }, end: { type: String, required: true } },
    { _id: false }
);

const dayScheduleSchema = new mongoose.Schema(
    {
        day: {
            type: String,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            required: true
        },
        slots: [slotSchema]
    },
    { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
    {
        patientId: { type: String, required: true },
        patientName: { type: String, default: "" },
        appointmentId: { type: String, default: "" },
        medicines: [{ type: String }],
        notes: { type: String, default: "" }
    },
    { timestamps: true }
);

const doctorSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, index: true },
        fullName: { type: String, required: true, trim: true },
        email: { type: String, default: "", lowercase: true, trim: true },
        phone: { type: String, default: "" },
        specialization: { type: String, default: "" },
        qualifications: [{ type: String }],
        bio: { type: String, default: "" },
        consultationFee: { type: Number, default: 0 },
        image: { type: String, default: "" },
        isVerified: { type: Boolean, default: false },
        availability: [dayScheduleSchema],
        prescriptions: [prescriptionSchema]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
