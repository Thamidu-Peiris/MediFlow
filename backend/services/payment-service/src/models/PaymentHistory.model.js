const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema(
  {
    patientSub: { type: String, required: true, index: true },
    orderId: { type: String, required: true, unique: true },
    pendingBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "PendingBooking", required: true },
    appointmentId: { type: String, default: "" },
    doctorUserId: { type: String, default: "" },
    doctorName: { type: String, default: "" },
    specialization: { type: String, default: "" },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    appointmentType: { type: String, enum: ["physical", "online"], default: "physical" },
    currency: { type: String, default: "LKR" },
    consultationFeeCents: { type: Number, default: 0 },
    serviceFeeCents: { type: Number, default: 0 },
    totalCents: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["stripe", "helakuru", "unknown"], default: "unknown" },
    paymentRef: { type: String, default: "" },
    status: { type: String, enum: ["paid", "refunded"], default: "paid" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentHistory", paymentHistorySchema);
