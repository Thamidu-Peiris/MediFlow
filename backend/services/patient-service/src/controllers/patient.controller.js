const mongoose = require("mongoose");
const Patient = require("../models/patient.model");
const gridfs = require("../config/gridfs");
const cloudinaryCfg = require("../config/cloudinary");
const { preferredUploadEngine } = require("../config/storageMode");
const { REVISION } = require("../config/serviceRevision");
const { attachTraceToJsonPayload } = require("../middleware/uploadTrace.middleware");

const DEBUG_UPLOAD = process.env.DEBUG_PATIENT_UPLOAD === "1";

function cloudinaryHttpStatus(error) {
  const code = Number(error?.http_code);
  if (code === 401 || code === 403) return 502;
  if (code >= 400 && code < 500) return 502;
  return 500;
}

function cloudinaryErrorDetail(error) {
  const msg = error?.message && error.message !== "undefined" ? error.message : "";
  return msg.length > 280 ? `${msg.slice(0, 280)}…` : msg || "Unknown error";
}

function cloudinaryDestroySafe(publicId, resourceTypeRaw) {
  if (!publicId || !cloudinaryCfg.isConfigured()) return Promise.resolve();
  const rt = String(resourceTypeRaw || "");
  const resourceType =
    rt === "raw" ? "raw" : rt === "video" ? "video" : "image";
  return cloudinaryCfg.cloudinary.uploader
    .destroy(publicId, { resource_type: resourceType })
    .catch(() => {});
}

function isCloudinaryDeliveredUrl(filePath) {
  return /res\.cloudinary\.com/i.test(String(filePath || ""));
}

function isLegacyDiskUploadPath(filePath) {
  const fp = String(filePath || "").replace(/\\/g, "/");
  if (!fp || isCloudinaryDeliveredUrl(fp)) return false;
  return (
    /\/uploads\//i.test(fp) ||
    fp.includes("/api/patients/uploads") ||
    /localhost:\d+\/api\/patients\/uploads/i.test(fp)
  );
}

function serializeReport(r) {
  const o = r.toObject ? r.toObject({ flattenMaps: true }) : { ...r };
  const fp0 = String(o.filePath ?? "").trim();
  const cloudinaryId = String(o.cloudinaryPublicId ?? "").trim();

  const gfs = String(o.gridFsFileId || "").trim();
  if (gfs) {
    o.gridFsFileId = "";
    o.filePath = "";
    o.needsReupload = true;
    return o;
  }

  if (isLegacyDiskUploadPath(fp0)) {
    o.filePath = "";
    o.needsReupload = true;
    return o;
  }

  // Cloudinary-backed or any other https URL we still serve / open
  if (/^https?:\/\//i.test(fp0) || isCloudinaryDeliveredUrl(fp0) || cloudinaryId) {
    o.needsReupload = false;
    return o;
  }

  o.needsReupload = false;
  return o;
}

function serializePatientForClient(patient) {
  if (!patient) return null;
  const o = patient.toObject ? patient.toObject() : { ...patient };
  if (o.avatarGridFsId) {
    o.avatar = "";
    o.avatarGridFsId = "";
  }
  if (Array.isArray(o.reports)) {
    o.reports = o.reports.map((x) => serializeReport(x));
  }
  return o;
}

exports.upsertProfile = async (req, res) => {
  try {
    const {
      fullName,
      email = "",
      phone = "",
      dob = null,
      age = null,
      gender = "",
      address = "",
      bloodType = "",
      avatar = "",
      medicalHistory = []
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "fullName is required" });
    }

    const setDoc = {
      userId: req.user.sub,
      fullName,
      email: email.toLowerCase(),
      phone,
      dob,
      age,
      gender,
      address,
      bloodType,
      medicalHistory
    };
    if (avatar && !String(avatar).includes("/avatar/me")) {
      setDoc.avatar = avatar;
    }

    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.sub },
      { $set: setDoc },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    console.error("upsertProfile error:", error);
    return res.status(500).json({ message: "Failed to save profile", error: error.message });
  }
};

exports.getMyProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
};

exports.getPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const patient = await Patient.findOne({ userId: patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }
    
    // Authorization: Allow the patient themselves or a doctor
    if (req.user.sub !== patientId && req.user.role !== "doctor" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch patient profile" });
  }
};

exports.uploadReport = async (req, res) => {
  try {
    req._uploadStep?.("03_controller_enter", {
      hasFile: Boolean(req.file),
      userSub: req.user?.sub
    });

    if (!req.file) {
      req._uploadStep?.("03b_reject_no_file", {});
      return res
        .status(400)
        .json(attachTraceToJsonPayload(req, { message: "No report file uploaded" }));
    }

    const useCloudinary = cloudinaryCfg.isConfigured();
    req._uploadStep?.("04_storage_flags", {
      cloudinaryConfigured: useCloudinary,
      preferredEngine: preferredUploadEngine()
    });

    if (!useCloudinary) {
      req._uploadStep?.("04b_reject_no_cloudinary", {});
      return res.status(503).json(
        attachTraceToJsonPayload(req, {
          message:
            "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to patient-service .env (see .env.example)."
        })
      );
    }

    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      req._uploadStep?.("05_reject_no_patient_profile", { userId: req.user.sub });
      return res
        .status(404)
        .json(attachTraceToJsonPayload(req, { message: "Create profile before uploading reports" }));
    }

    req._uploadStep?.("05_patient_found", { patientId: String(patient._id) });

    const title = (req.body.title || req.file.originalname || "").toString().trim();
    const category = (req.body.category || "Lab Results").toString().trim();
    const doctor = (req.body.doctor || "").toString().trim();

    const base = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype || "",
      title,
      category,
      doctor,
      fileSize: req.file.size || 0,
      filePath: "",
      gridFsFileId: "",
      cloudinaryPublicId: "",
      cloudinaryResourceType: ""
    };

    req._uploadStep?.("06_uploading_cloudinary", {});
    const mime = String(req.file.mimetype || "").toLowerCase();
    const nameLower = (req.file.originalname || "").toLowerCase();
    const looksImage =
      mime.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(req.file.originalname || "");
    const looksPdf = mime === "application/pdf" || nameLower.endsWith(".pdf");
    const resourceType = looksPdf ? "raw" : looksImage ? "image" : "raw";

    const result = await cloudinaryCfg.uploadBuffer(req.file.buffer, {
      folder: `mediflow/patients/${req.user.sub}/reports`,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true
    });

    const secureUrl = String(result.secure_url || "").trim();
    const publicId = String(result.public_id || "").trim();
    if (
      !secureUrl ||
      !/^https:\/\//i.test(secureUrl) ||
      !publicId ||
      isLegacyDiskUploadPath(secureUrl)
    ) {
      req._uploadStep?.("06c_cloudinary_invalid_result", {
        hasUrl: Boolean(secureUrl),
        hasPublicId: Boolean(publicId)
      });
      if (publicId) {
        await cloudinaryDestroySafe(publicId, result.resource_type || resourceType);
      }
      return res.status(502).json(
        attachTraceToJsonPayload(req, {
          message:
            "Cloudinary response was invalid. Check CLOUDINARY_* in patient-service .env. If you use Docker, rebuild: docker compose build patient-service && docker compose up -d patient-service"
        })
      );
    }

    base.filePath = secureUrl;
    base.cloudinaryPublicId = publicId;
    base.cloudinaryResourceType = result.resource_type || resourceType;
    const engineUsed = "cloudinary";
    req._uploadStep?.("06b_cloudinary_ok", {
      secureUrlPrefix: secureUrl.slice(0, 48),
      publicId
    });

    patient.reports.push(base);
    await patient.save();
    req._uploadStep?.("07_mongodb_saved", { reportCount: patient.reports.length });

    const last = patient.reports[patient.reports.length - 1];
    const serialized = (patient.reports || []).map((r) => serializeReport(r));
    const lastSer = serialized[serialized.length - 1];

    res.setHeader("X-MediFlow-Upload-Engine", engineUsed);

    console.log("[MediFlow patient-service] upload-report OK", {
      revision: REVISION,
      pid: process.pid,
      engine: engineUsed,
      userId: req.user.sub,
      gridFsFileId: String(last?.gridFsFileId || ""),
      cloudinaryPublicId: String(last?.cloudinaryPublicId || ""),
      reportSubdocId: String(last?._id || ""),
      filePathReturned: lastSer?.filePath,
      needsReupload: lastSer?.needsReupload
    });

    if (lastSer?.filePath && isLegacyDiskUploadPath(lastSer.filePath)) {
      console.error(
        "[MediFlow patient-service] BUG: upload returned legacy /uploads/ path — another process may be writing MongoDB or serializer error."
      );
    }

    const payload = { reports: serialized };
    if (DEBUG_UPLOAD) {
      payload._debug = {
        revision: REVISION,
        uploadEngine: engineUsed,
        preferredEngine: preferredUploadEngine(),
        pid: process.pid,
        lastReportRaw: {
          gridFsFileId: String(last?.gridFsFileId || ""),
          cloudinaryPublicId: String(last?.cloudinaryPublicId || ""),
          _id: String(last?._id || ""),
          fileName: last?.fileName
        },
        lastReportSerialized: lastSer
      };
    }

    req._uploadStep?.("08_response_ready", {
      engineUsed,
      filePathReturned: String(lastSer?.filePath || "").slice(0, 120),
      containsLegacyUploadsPath: String(lastSer?.filePath || "").includes("/uploads/")
    });

    return res.status(201).json(attachTraceToJsonPayload(req, payload));
  } catch (error) {
    console.error("uploadReport:", error?.http_code || "", error?.message || error);
    req._uploadStep?.("ERR_caught", { message: error?.message });
    return res.status(cloudinaryHttpStatus(error)).json(
      attachTraceToJsonPayload(req, {
        message: `Cloudinary upload failed: ${cloudinaryErrorDetail(error)}. Confirm CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET in patient-service .env match the Cloudinary console (Dashboard → Programmable Media → API Keys).`
      })
    );
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    if (!cloudinaryCfg.isConfigured()) {
      return res.status(503).json({
        message:
          "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to patient-service .env."
      });
    }

    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Create profile before uploading a photo" });
    }

    const result = await cloudinaryCfg.uploadBuffer(req.file.buffer, {
      folder: `mediflow/patients/${req.user.sub}/avatar`,
      resource_type: "image",
      use_filename: true,
      unique_filename: true
    });

    if (patient.avatarPublicId) {
      await cloudinaryDestroySafe(patient.avatarPublicId, "image");
    }
    if (patient.avatarGridFsId) {
      await gridfs.deleteFile(patient.avatarGridFsId);
    }

    patient.avatar = result.secure_url;
    patient.avatarPublicId = result.public_id;
    patient.avatarGridFsId = "";
    patient.avatarContentType = "";
    await patient.save();

    res.setHeader("X-MediFlow-Upload-Engine", "cloudinary");
    console.log("[MediFlow patient-service] upload-avatar OK", { engine: "cloudinary", pid: process.pid });

    return res.status(200).json({
      avatarUrl: result.secure_url,
      patient: serializePatientForClient(patient)
    });
  } catch (error) {
    console.error("uploadAvatar:", error?.http_code || "", error?.message || error);
    return res.status(cloudinaryHttpStatus(error)).json({
      message: `Cloudinary upload failed: ${cloudinaryErrorDetail(error)}. Check CLOUDINARY_* in patient-service .env.`
    });
  }
};

exports.streamReportFile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid report id" });
    }

    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Not found" });
    }

    const report = patient.reports.id(id);
    if (!report) {
      return res.status(404).json({ message: "Not found" });
    }

    if (report.gridFsFileId) {
      return res.status(410).json({
        message:
          "This report used MongoDB GridFS storage, which MediFlow no longer uses. Delete the entry and upload again — files are stored on Cloudinary only."
      });
    }

    if (report.filePath && /^https?:\/\//i.test(report.filePath)) {
      return res.redirect(302, report.filePath);
    }

    if (isLegacyDiskUploadPath(report.filePath)) {
      return res.status(410).json({
        message: "This report used old local storage and the file is no longer available. Please delete the entry and upload again."
      });
    }

    return res.status(404).json({ message: "No file for this report" });
  } catch (error) {
    console.error("streamReportFile:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Failed to stream file" });
    }
    return undefined;
  }
};

exports.streamAvatar = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select(
      "avatarGridFsId avatar avatarContentType"
    );
    if (!patient) {
      return res.status(404).end();
    }

    if (patient.avatarGridFsId) {
      return res.status(404).end();
    }

    if (patient.avatar && /^https?:\/\//i.test(patient.avatar)) {
      return res.redirect(302, patient.avatar);
    }

    return res.status(404).end();
  } catch (error) {
    console.error("streamAvatar:", error);
    if (!res.headersSent) {
      return res.status(500).end();
    }
    return undefined;
  }
};

exports.listReports = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select("reports");
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.setHeader("X-MediFlow-Upload-Engine", preferredUploadEngine());

    const raw = (patient.reports || []).map((r) => ({
      id: String(r._id || ""),
      rawFilePath: r.filePath,
      gridFsFileId: String(r.gridFsFileId || "")
    }));

    const legacyInDb = raw.filter((x) => isLegacyDiskUploadPath(x.rawFilePath));
    if (legacyInDb.length) {
      console.warn(
        "[MediFlow patient-service] listReports: MongoDB still has legacy disk paths on",
        legacyInDb.length,
        "row(s). API strips these; sample raw:",
        legacyInDb[0]?.rawFilePath
      );
    }

    if (DEBUG_UPLOAD) {
      console.log("[MediFlow patient-service] listReports raw snapshot", raw);
    }

    const reports = (patient.reports || []).map((r) => serializeReport(r));

    if (DEBUG_UPLOAD) {
      console.log(
        "[MediFlow patient-service] listReports serialized filePaths",
        reports.map((r) => ({ id: r._id, filePath: r.filePath, needsReupload: r.needsReupload }))
      );
    }

    const payload = { reports };
    if (DEBUG_UPLOAD) {
      payload._debug = {
        revision: REVISION,
        pid: process.pid,
        preferredUploadEngine: preferredUploadEngine(),
        rawReportPaths: raw
      };
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports" });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const report = (patient.reports || []).find((r) => String(r._id) === String(req.params.id));
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.gridFsFileId) {
      await gridfs.deleteFile(report.gridFsFileId);
    }
    if (report.cloudinaryPublicId) {
      await cloudinaryDestroySafe(report.cloudinaryPublicId, report.cloudinaryResourceType);
    }

    patient.reports = patient.reports.filter((r) => String(r._id) !== String(req.params.id));
    await patient.save();

    return res.status(200).json({ reports: (patient.reports || []).map((r) => serializeReport(r)) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete report" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    if (patient.avatarGridFsId) {
      await gridfs.deleteFile(patient.avatarGridFsId);
    }
    if (patient.avatarPublicId) {
      await cloudinaryDestroySafe(patient.avatarPublicId, "image");
    }
    for (const r of patient.reports || []) {
      if (r.gridFsFileId) {
        await gridfs.deleteFile(r.gridFsFileId);
      }
      if (r.cloudinaryPublicId) {
        await cloudinaryDestroySafe(r.cloudinaryPublicId, r.cloudinaryResourceType);
      }
    }
    return res.status(200).json({ message: "Patient account data deleted" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete account" });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select(
      "medicalHistory appointments prescriptions"
    );
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    const diagnoses = (patient.appointments || [])
      .map((item) => item.diagnosis)
      .filter(Boolean);

    return res.status(200).json({
      medicalHistory: patient.medicalHistory || [],
      diagnoses,
      prescriptions: patient.prescriptions || [],
      appointments: patient.appointments || []
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch medical history" });
  }
};

exports.getPrescriptions = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select("prescriptions");
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ prescriptions: patient.prescriptions || [] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch prescriptions" });
  }
};

exports.syncPrescription = async (req, res) => {
  try {
    const { patientId, doctorId, doctorName, appointmentId, medicines = [], notes = "" } = req.body;
    
    if (!patientId) {
      return res.status(400).json({ message: "patientId is required" });
    }

    const patient = await Patient.findOneAndUpdate(
      { userId: patientId },
      { 
        $push: { 
          prescriptions: { 
            doctorId, 
            doctorName,
            appointmentId, 
            medicines, 
            notes 
          } 
        } 
      },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient profile not found" });
    }

    return res.status(200).json({ message: "Prescription synced successfully" });
  } catch (error) {
    console.error("syncPrescription error:", error);
    return res.status(500).json({ message: "Failed to sync prescription" });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub }).select("appointments");
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(200).json({ appointments: patient.appointments || [] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch appointments" });
  }
};

const HEALTH_SECTION_TO_FIELD = {
  allergies: "allergies",
  "medical-conditions": "medicalConditions",
  medications: "currentMedications"
};

function healthArrayFieldFromParam(section) {
  return HEALTH_SECTION_TO_FIELD[section] || null;
}

exports.addHealthItem = async (req, res) => {
  try {
    const field = healthArrayFieldFromParam(req.params.section);
    if (!field) {
      return res.status(400).json({ message: "Invalid health section" });
    }
    const label = String(req.body.label || "").trim();
    const note = String(req.body.note || "").trim();
    if (!label) {
      return res.status(400).json({ message: "label is required" });
    }
    /** $push works even when the array field is missing on older MongoDB documents */
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.sub },
      { $push: { [field]: { label, note } } },
      { new: true }
    );
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    return res.status(201).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    console.error("addHealthItem error:", error);
    return res.status(500).json({ message: "Failed to add item", error: error.message });
  }
};

exports.updateHealthItem = async (req, res) => {
  try {
    const field = healthArrayFieldFromParam(req.params.section);
    if (!field) {
      return res.status(400).json({ message: "Invalid health section" });
    }
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const oid = new mongoose.Types.ObjectId(itemId);
    const updatePayload = {};
    if (req.body.label !== undefined) {
      const lbl = String(req.body.label || "").trim();
      if (!lbl) {
        return res.status(400).json({ message: "label cannot be empty" });
      }
      updatePayload[`${field}.$.label`] = lbl;
    }
    if (req.body.note !== undefined) {
      updatePayload[`${field}.$.note`] = String(req.body.note || "").trim();
    }
    if (Object.keys(updatePayload).length === 0) {
      const patient = await Patient.findOne({ userId: req.user.sub });
      if (!patient) {
        return res.status(404).json({ message: "Profile not found" });
      }
      return res.status(200).json({ patient: serializePatientForClient(patient) });
    }
    const patient = await Patient.findOneAndUpdate(
      { userId: req.user.sub, [`${field}._id`]: oid },
      { $set: updatePayload },
      { new: true }
    );
    if (!patient) {
      return res.status(404).json({ message: "Item not found" });
    }
    return res.status(200).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    console.error("updateHealthItem error:", error);
    return res.status(500).json({ message: "Failed to update item", error: error.message });
  }
};

exports.deleteHealthItem = async (req, res) => {
  try {
    const field = healthArrayFieldFromParam(req.params.section);
    if (!field) {
      return res.status(400).json({ message: "Invalid health section" });
    }
    const { itemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }
    const oid = new mongoose.Types.ObjectId(itemId);
    const pullResult = await Patient.updateOne(
      { userId: req.user.sub },
      { $pull: { [field]: { _id: oid } } }
    );
    if (pullResult.matchedCount === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }
    if (pullResult.modifiedCount === 0) {
      return res.status(404).json({ message: "Item not found" });
    }
    const patient = await Patient.findOne({ userId: req.user.sub });
    return res.status(200).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    console.error("deleteHealthItem error:", error);
    return res.status(500).json({ message: "Failed to delete item", error: error.message });
  }
};

exports.setEmergencyContact = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const relationship = String(req.body.relationship || "").trim();
    const phone = String(req.body.phone || "").trim();
    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    patient.emergencyContact = { name, relationship, phone };
    await patient.save();
    return res.status(200).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    console.error("setEmergencyContact error:", error);
    return res.status(500).json({ message: "Failed to save emergency contact", error: error.message });
  }
};

exports.clearEmergencyContact = async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user.sub });
    if (!patient) {
      return res.status(404).json({ message: "Profile not found" });
    }
    patient.emergencyContact = { name: "", relationship: "", phone: "" };
    await patient.save();
    return res.status(200).json({ patient: serializePatientForClient(patient) });
  } catch (error) {
    console.error("clearEmergencyContact error:", error);
    return res.status(500).json({ message: "Failed to clear emergency contact", error: error.message });
  }
};
