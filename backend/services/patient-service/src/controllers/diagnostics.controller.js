const mongoose = require("mongoose");
const cloudinaryCfg = require("../config/cloudinary");
const { preferredUploadEngine } = require("../config/storageMode");
const { REVISION } = require("../config/serviceRevision");

exports.health = async (req, res) => {
  try {
    const mongoOk = mongoose.connection.readyState === 1;
    const cloudinaryOk = cloudinaryCfg.isConfigured();
    const { cloud_name: cloudinaryCloudName } = cloudinaryCfg.readEnvTriplet();

    let cloudinaryApiOk = null;
    let cloudinaryPingMessage = null;
    if (cloudinaryOk) {
      try {
        await cloudinaryCfg.pingApi();
        cloudinaryApiOk = true;
      } catch (e) {
        cloudinaryApiOk = false;
        cloudinaryPingMessage =
          e?.message || e?.error?.message || "Cloudinary ping failed — check API key/secret and that this cloud name matches the Cloudinary console.";
      }
    }

    res.status(200).json({
      service: "patient-service",
      status: mongoOk ? "ok" : "degraded",
      buildFingerprint: "mediflow-patient-2026-storage-v2",
      revision: REVISION,
      cloudinaryConfigured: cloudinaryOk,
      cloudinaryCloudName: cloudinaryOk ? cloudinaryCloudName : null,
      cloudinaryApiOk,
      cloudinaryPingMessage: cloudinaryApiOk === false ? cloudinaryPingMessage : undefined,
      reportFileStorage: "cloudinary-only",
      preferredUploadEngine: preferredUploadEngine(),
      pid: process.pid,
      requestPath: req.path,
      alertIfYouSeeOnlyTwoFields:
        "If this JSON only had service+status, you are hitting an OLD patient-service — stop it, run from MediFlow/backend/services/patient-service, or rebuild Docker.",
      note: cloudinaryOk
        ? cloudinaryApiOk === false
          ? "Cloudinary env is set but the API ping failed — uploads will error until credentials match https://console.cloudinary.com"
          : "Report and avatar files are stored on Cloudinary only. In the console open this cloud name, folder mediflow/. PDFs appear under Resource type Raw."
        : "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET — uploads are disabled until Cloudinary is configured."
    });
  } catch {
    res.status(500).json({ service: "patient-service", message: "Health check failed" });
  }
};

exports.buildInfo = (req, res) => {
  res.status(200).json({
    ok: true,
    buildFingerprint: "mediflow-patient-2026-storage-v2",
    revision: REVISION,
    preferredUploadEngine: preferredUploadEngine(),
    pid: process.pid,
    node: process.version,
    cwd: process.cwd(),
    requestPath: req.path
  });
};
