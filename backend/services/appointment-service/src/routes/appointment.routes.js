const express = require("express");
const {
    requestAppointment,
    listMyAppointments,
    cancelAppointment,
    rescheduleAppointment,
    listDoctorOccupiedTimes,
    listDoctorAppointments,
    acceptAppointment,
    rejectAppointment,
    completeAppointment
} = require("../controllers/appointment.controller");
const { verifyAuth, requirePatientRole, requireDoctorRole } = require("../middleware/auth.middleware");

const router = express.Router();

// Public routes
router.get("/public/doctor/:doctorId/occupied", listDoctorOccupiedTimes);

// Patient routes
router.post("/", verifyAuth, requirePatientRole, requestAppointment);
router.get("/my", verifyAuth, requirePatientRole, listMyAppointments);
router.patch("/:id/cancel", verifyAuth, requirePatientRole, cancelAppointment);
router.patch("/:id/reschedule", verifyAuth, requirePatientRole, rescheduleAppointment);

// Doctor routes
router.get("/doctor", verifyAuth, requireDoctorRole, listDoctorAppointments);
router.patch("/:id/accept", verifyAuth, requireDoctorRole, acceptAppointment);
router.patch("/:id/reject", verifyAuth, requireDoctorRole, rejectAppointment);
router.patch("/:id/complete", verifyAuth, requireDoctorRole, completeAppointment);

module.exports = router;
