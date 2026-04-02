const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    filePath: { type: String, default: "" },
    fileType: { type: String, default: "" },
    title: { type: String, default: "" },
    category: { type: String, default: "" },
    doctor: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    /** Legacy only — new reports use Cloudinary; not written for new uploads */
    gridFsFileId: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
    cloudinaryResourceType: { type: String, default: "" },
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

const healthItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, default: "", trim: true, maxlength: 500 }
  },
  { timestamps: true }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true, maxlength: 120 },
    relationship: { type: String, default: "", trim: true, maxlength: 80 },
    phone: { type: String, default: "", trim: true, maxlength: 40 }
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "" },
    dob: { type: Date, default: null },
    age: { type: Number, default: null },
    gender: { type: String, default: "" },
    address: { type: String, default: "" },
    bloodType: { type: String, default: "" },
    avatar: { type: String, default: "" },
    avatarPublicId: { type: String, default: "" },
    /** Legacy only — new avatars use Cloudinary */
    avatarGridFsId: { type: String, default: "" },
    avatarContentType: { type: String, default: "" },
    medicalHistory: [{ type: String }],
    allergies: { type: [healthItemSchema], default: [] },
    medicalConditions: { type: [healthItemSchema], default: [] },
    currentMedications: { type: [healthItemSchema], default: [] },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
    reports: [reportSchema],
    prescriptions: [prescriptionSchema],
    appointments: [appointmentSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);
