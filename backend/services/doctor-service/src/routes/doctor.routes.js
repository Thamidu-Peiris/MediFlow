const express = require("express");
const multer = require("multer");
const {
    upsertProfile,
    getMyProfile,
    setAvailability,
    setPhysicalAvailability,
    setOnlineAvailability,
    getPublicDoctors,
    getAllDoctors,
    getDoctorById,
    getPatientReports,
    issuePrescription,
    listIssuedPrescriptions,
    uploadProfileImage
} = require("../controllers/doctor.controller");
const { verifyAuth, requireDoctorRole } = require("../middleware/auth.middleware");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files are allowed"));
    }
});

function handleProfileImageUpload(req, res, next) {
    upload.single("image")(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ message: "Image must be under 2MB" });
            }
            return res.status(400).json({ message: err.message || "Upload failed" });
        }
        return res.status(400).json({ message: err.message || "Upload failed" });
    });
}

// Public
router.get("/public", getPublicDoctors);
router.get("/public/:id", getDoctorById);

// All logged-in users (admin lists all)
router.get("/all", verifyAuth, getAllDoctors);

// Doctor-only
router.get("/me", verifyAuth, requireDoctorRole, getMyProfile);
router.put("/update-profile", verifyAuth, requireDoctorRole, upsertProfile);
router.put("/availability", verifyAuth, requireDoctorRole, setAvailability);
router.put("/physical-availability", verifyAuth, requireDoctorRole, setPhysicalAvailability);
router.put("/online-availability", verifyAuth, requireDoctorRole, setOnlineAvailability);
router.post("/upload-image", verifyAuth, requireDoctorRole, handleProfileImageUpload, uploadProfileImage);

router.get("/prescriptions", verifyAuth, requireDoctorRole, listIssuedPrescriptions);
router.post("/prescriptions", verifyAuth, requireDoctorRole, issuePrescription);

// Doctor views a patient's reports (patient token required on the proxied call;
// here we just forward the doctor's token to the patient service)
router.get("/patient-reports/:patientId", verifyAuth, requireDoctorRole, getPatientReports);

module.exports = router;
