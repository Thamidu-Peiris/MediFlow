const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cloudinaryCfg = require("./config/cloudinary");
const { preferredUploadEngine } = require("./config/storageMode");
const { REVISION } = require("./config/serviceRevision");
const diagnostics = require("./controllers/diagnostics.controller");
const patientRoutes = require("./routes/patient.routes");

dotenv.config({ path: path.join(__dirname, "..", ".env") });
cloudinaryCfg.configure();

console.log(
  "[MediFlow] patient-service boot — if GET /health has no `revision`, you are NOT running this build (wrong folder, Docker image, or stale process)."
);

const app = express();
const PORT = process.env.PORT || 8002;

app.use(
  cors({
    exposedHeaders: ["X-MediFlow-Patient-Service-Revision", "X-MediFlow-Upload-Engine"]
  })
);
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("X-MediFlow-Patient-Service-Revision", REVISION);
  next();
});

// Direct hits: http://localhost:8002/health | /medi-flow-build | /build
app.get("/health", diagnostics.health);
app.get("/medi-flow-build", diagnostics.buildInfo);
app.get("/build", diagnostics.buildInfo);

// All API routes (same paths also registered on router for gateway /api/patients/*)
app.use("/", patientRoutes);

connectDB().finally(() => {
  app.listen(PORT, () => {
    console.log(`Patient Service listening on ${PORT} (pid ${process.pid})`);
    console.log(`Try: http://localhost:${PORT}/build  and  http://localhost:${PORT}/health`);
    console.log(`MediFlow patient-service revision=${REVISION} preferredUpload=${preferredUploadEngine()}`);
    if (cloudinaryCfg.isConfigured()) {
      console.log(`Cloudinary: ON (cloud=${process.env.CLOUDINARY_CLOUD_NAME}) — reports & avatars upload here only.`);
    } else {
      console.warn("Cloudinary: OFF — report/avatar uploads return 503 until CLOUDINARY_* is set in .env");
    }
    if (process.env.DEBUG_PATIENT_UPLOAD === "1") {
      console.log("DEBUG_PATIENT_UPLOAD=1 — verbose upload/list logs enabled");
    }
  });
});
