const express = require("express");
const multer = require("multer");

const {
  upsertProfile,
  getMyProfile,
  getPatientProfile, // Add this
  uploadReport,
  uploadAvatar,
  streamReportFile,
  streamAvatar,
  listReports,
  deleteReport,
  deleteAccount,
  getHistory,
  getPrescriptions,
  syncPrescription,
  getAppointments,
  addHealthItem,
  updateHealthItem,
  deleteHealthItem,
  setEmergencyContact,
  clearEmergencyContact
} = require("../controllers/patient.controller");
const { verifyAuth, requirePatientRole } = require("../middleware/auth.middleware");
const {
  initUploadTrace,
  afterReportMulter
} = require("../middleware/uploadTrace.middleware");
const diagnostics = require("../controllers/diagnostics.controller");

const router = express.Router();

// Gateway: http://localhost:8081/api/patients/health  →  /health on this service
//          http://localhost:8081/api/patients/build   →  /build
router.get("/health", diagnostics.health);
router.get("/medi-flow-build", diagnostics.buildInfo);
router.get("/build", diagnostics.buildInfo);

const memory = multer.memoryStorage();

function reportFileFilter(req, file, cb) {
  const name = (file.originalname || "").toLowerCase();
  const ok =
    /^image\//.test(file.mimetype) ||
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/dicom" ||
    file.mimetype === "application/octet-stream" ||
    name.endsWith(".dcm") ||
    name.endsWith(".dicom");
  if (ok) cb(null, true);
  else cb(new Error("Only PDF, images, or DICOM are allowed"));
}

function imageFileFilter(req, file, cb) {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image files are allowed for profile photos"));
}

const uploadReportMw = multer({
  storage: memory,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: reportFileFilter
});

const uploadAvatarMw = multer({
  storage: memory,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter
});

function handleMulter(mw) {
  return (req, res, next) => {
    mw(req, res, (err) => {
      if (err) {
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "File is too large"
            : err.message || "Upload failed";
        return res.status(400).json({ message: msg });
      }
      next();
    });
  };
}

router.get("/me", verifyAuth, requirePatientRole, getMyProfile);
router.get("/:patientId", verifyAuth, getPatientProfile); // Add this for doctor access
/* Prefer /me/health/... through the gateway — avoids any clash with service GET /health (diagnostics). */
router.put("/me/health/emergency-contact", verifyAuth, requirePatientRole, setEmergencyContact);
router.delete("/me/health/emergency-contact", verifyAuth, requirePatientRole, clearEmergencyContact);
router.post("/me/health/:section", verifyAuth, requirePatientRole, addHealthItem);
router.put("/me/health/:section/:itemId", verifyAuth, requirePatientRole, updateHealthItem);
router.delete("/me/health/:section/:itemId", verifyAuth, requirePatientRole, deleteHealthItem);
/* Legacy aliases (same handlers) */
router.put("/health/emergency-contact", verifyAuth, requirePatientRole, setEmergencyContact);
router.delete("/health/emergency-contact", verifyAuth, requirePatientRole, clearEmergencyContact);
router.post("/health/:section", verifyAuth, requirePatientRole, addHealthItem);
router.put("/health/:section/:itemId", verifyAuth, requirePatientRole, updateHealthItem);
router.delete("/health/:section/:itemId", verifyAuth, requirePatientRole, deleteHealthItem);
router.put("/update-profile", verifyAuth, requirePatientRole, upsertProfile);
router.delete("/delete-account", verifyAuth, requirePatientRole, deleteAccount);
router.get("/avatar/me", verifyAuth, requirePatientRole, streamAvatar);
router.get("/reports/:id/download", verifyAuth, requirePatientRole, streamReportFile);
router.post(
  "/upload-report",
  verifyAuth,
  requirePatientRole,
  initUploadTrace,
  handleMulter(uploadReportMw.single("report")),
  afterReportMulter,
  uploadReport
);
router.post(
  "/upload-avatar",
  verifyAuth,
  requirePatientRole,
  handleMulter(uploadAvatarMw.single("avatar")),
  uploadAvatar
);
router.get("/reports", verifyAuth, requirePatientRole, listReports);
router.delete("/reports/:id", verifyAuth, requirePatientRole, deleteReport);
router.get("/history", verifyAuth, requirePatientRole, getHistory);
router.get("/prescriptions", verifyAuth, requirePatientRole, getPrescriptions);
router.post("/prescriptions/sync", verifyAuth, syncPrescription);
router.get("/appointments", verifyAuth, requirePatientRole, getAppointments);

router.get("/profiles/me", verifyAuth, requirePatientRole, getMyProfile);
router.post("/profiles/me", verifyAuth, requirePatientRole, upsertProfile);
router.put("/profiles/me", verifyAuth, requirePatientRole, upsertProfile);
router.post(
  "/reports/upload",
  verifyAuth,
  requirePatientRole,
  initUploadTrace,
  handleMulter(uploadReportMw.single("report")),
  afterReportMulter,
  uploadReport
);

module.exports = router;
