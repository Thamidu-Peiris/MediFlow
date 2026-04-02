const express = require("express");
const paymentController = require("../controllers/payment.controller");
const { verifyAuth, requirePatientRole } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/pending-booking", verifyAuth, requirePatientRole, paymentController.createPendingBooking);
router.get("/pending-booking/:id", verifyAuth, requirePatientRole, paymentController.getPendingBooking);
router.post("/stripe/create-intent", verifyAuth, requirePatientRole, paymentController.createStripeIntent);
router.post("/helapay/checkout", verifyAuth, requirePatientRole, paymentController.createHelaPayCheckout);
router.post("/helakuru/checkout", verifyAuth, requirePatientRole, paymentController.createHelaPayCheckout);
router.post("/complete-booking", verifyAuth, requirePatientRole, paymentController.completeBookingAfterPayment);
router.post("/simulate-helapay", verifyAuth, requirePatientRole, paymentController.simulateHelaPayDev);
router.post("/simulate-helakuru", verifyAuth, requirePatientRole, paymentController.simulateHelaPayDev);

module.exports = router;
