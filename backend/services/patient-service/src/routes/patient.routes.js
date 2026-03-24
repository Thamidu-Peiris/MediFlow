const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  upsertProfile,
  getMyProfile,
  uploadReport,
  listReports
} = require("../controllers/patient.controller");
const { verifyAuth, requirePatientRole } = require("../middleware/auth.middleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({ storage });

router.get("/profiles/me", verifyAuth, requirePatientRole, getMyProfile);
router.post("/profiles/me", verifyAuth, requirePatientRole, upsertProfile);
router.put("/profiles/me", verifyAuth, requirePatientRole, upsertProfile);
router.get("/reports", verifyAuth, requirePatientRole, listReports);
router.post("/reports/upload", verifyAuth, requirePatientRole, upload.single("report"), uploadReport);

module.exports = router;
