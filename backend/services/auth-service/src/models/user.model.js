const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      default: "patient"
    },
    isDoctorVerified: { type: Boolean, default: false },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
