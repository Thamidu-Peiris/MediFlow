const mongoose = require("mongoose");

const pendingBookingSchema = new mongoose.Schema(
  {
    patientSub: { type: String, required: true, index: true },
    doctorUserId: { type: String, required: true },
    doctorName: { type: String, default: "" },
    specialization: { type: String, default: "" },
    doctorImage: { type: String, default: "" },
    date: { type: String, required: true },
    time: { type: String, required: true },
    reason: { type: String, default: "" },
    currency: { type: String, default: "LKR" },
    consultationFeeCents: { type: Number, required: true },
    serviceFeeCents: { type: Number, default: 0 },
    orderId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending_payment", "paid", "failed", "expired"],
      default: "pending_payment",
    },
    stripePaymentIntentId: { type: String, default: "" },
    payherePaymentId: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
    appointmentCreated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

pendingBookingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingBooking", pendingBookingSchema);
