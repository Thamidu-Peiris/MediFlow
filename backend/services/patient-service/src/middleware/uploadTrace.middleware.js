/**
 * Step-by-step upload tracing. Logs when DEBUG_PATIENT_UPLOAD=1.
 * Response includes _uploadTrace when DEBUG_PATIENT_UPLOAD=1 or (NODE_ENV!=production and X-MediFlow-Debug-Upload: 1).
 */
function shouldAttachTraceToBody(req) {
  if (process.env.DEBUG_PATIENT_UPLOAD === "1") return true;
  if (process.env.NODE_ENV === "production") return false;
  return String(req.get("x-mediflow-debug-upload") || "") === "1";
}

function logStep(traceId, step, detail) {
  if (process.env.DEBUG_PATIENT_UPLOAD === "1") {
    console.log(`[MediFlow upload-trace ${traceId}] ${step}`, detail != null ? detail : "");
  }
}

function initUploadTrace(req, res, next) {
  const traceId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const t0 = Date.now();
  const steps = [];

  const push = (step, detail = {}) => {
    const entry = { step, ms: Date.now() - t0, ...detail };
    steps.push(entry);
    logStep(traceId, step, detail);
  };

  req._uploadTrace = { traceId, steps, push, t0 };
  req._uploadStep = push;

  push("01_route_hit", {
    path: req.path,
    method: req.method,
    pid: process.pid,
    cwd: process.cwd()
  });

  res.on("finish", () => {
    if (process.env.DEBUG_PATIENT_UPLOAD === "1") {
      console.log(`[MediFlow upload-trace ${traceId}] 99_response_sent`, {
        statusCode: res.statusCode,
        totalMs: Date.now() - t0
      });
    }
  });

  next();
}

function afterReportMulter(req, res, next) {
  if (req._uploadStep) {
    req._uploadStep("02_multer_done", {
      hasFile: Boolean(req.file),
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      bufferLength: req.file?.buffer?.length ?? 0
    });
  }
  next();
}

function attachTraceToJsonPayload(req, payload) {
  if (!req._uploadTrace || typeof payload !== "object" || payload == null) return payload;
  if (!shouldAttachTraceToBody(req)) return payload;
  return {
    ...payload,
    _uploadTrace: {
      traceId: req._uploadTrace.traceId,
      steps: req._uploadTrace.steps,
      hint: "If filePath contains /uploads/, the DB has a legacy row. New files use Cloudinary https URLs only; Atlas stores metadata, not binaries."
    }
  };
}

module.exports = {
  initUploadTrace,
  afterReportMulter,
  attachTraceToJsonPayload,
  shouldAttachTraceToBody
};
