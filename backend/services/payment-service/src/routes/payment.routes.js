const express = require("express");
const paymentController = require("../controllers/payment.controller");
const { verifyAuth, requirePatientRole } = require("../middleware/auth.middleware");

const router = express.Router();

// Public: occupied slot check from pending bookings (no auth needed)
router.get("/doctor-occupied", paymentController.getDoctorOccupiedFromPending);

router.post("/pending-booking", verifyAuth, requirePatientRole, paymentController.createPendingBooking);
router.get("/pending-booking/:id", verifyAuth, requirePatientRole, paymentController.getPendingBooking);
router.post("/stripe/create-intent", verifyAuth, requirePatientRole, paymentController.createStripeIntent);
router.post("/helapay/checkout", verifyAuth, requirePatientRole, paymentController.createHelaPayCheckout);
router.post("/helakuru/checkout", verifyAuth, requirePatientRole, paymentController.createHelaPayCheckout);
router.post("/complete-booking", verifyAuth, requirePatientRole, paymentController.completeBookingAfterPayment);
router.get("/history", verifyAuth, requirePatientRole, paymentController.getMyPaymentHistory);
router.post("/refund-by-session", verifyAuth, requirePatientRole, paymentController.refundBySession);
router.post("/simulate-helapay", verifyAuth, requirePatientRole, paymentController.simulateHelaPayDev);
router.post("/simulate-helakuru", verifyAuth, requirePatientRole, paymentController.simulateHelaPayDev);

module.exports = router;
