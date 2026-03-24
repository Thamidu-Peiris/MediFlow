const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: "" },
    dob: { type: String, default: "" },
    gender: { type: String, default: "" },
    address: { type: String, default: "" },
    medicalHistory: [{ type: String }],
    prescriptions: [{ type: String }],
    reports: [reportSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
