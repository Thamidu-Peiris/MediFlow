const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    doctorId: { type: String, default: "" },
    notes: { type: String, default: "" },
    medicines: [{ type: String }]
  },
  { timestamps: true }
);

const appointmentSchema = new mongoose.Schema(
  {
    doctorName: { type: String, default: "" },
    date: { type: String, default: "" },
    status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" },
    diagnosis: { type: String, default: "" }
  },
  { timestamps: true }
);

const patientSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "" },
    age: { type: Number, default: null },
    gender: { type: String, default: "" },
    address: { type: String, default: "" },
    medicalHistory: [{ type: String }],
    reports: [reportSchema],
    prescriptions: [prescriptionSchema],
    appointments: [appointmentSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
