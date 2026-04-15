const path = require("path");
const envPath = path.join(__dirname, "..", ".env");
const dotenvResult = require("dotenv").config({ path: envPath });
if (dotenvResult.error) {
  console.warn("ai-service: could not load .env at", envPath, "(using existing process.env)");
} else {
  console.log("ai-service: loaded env from", envPath);
}

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { verifyAuth, requirePatientOrAdmin } = require("./middleware/auth.middleware");
const {
  analyzeWithLlm,
  isLlmConfigured,
  llmCapabilities,
  LLM_TIMEOUT_MS
} = require("./llmAnalyze");
const app = express();
const PORT = process.env.PORT || 8008;

app.use(cors());
app.use(express.json({ limit: "512kb" }));

app.get("/health", (req, res) => {
  const caps = llmCapabilities();
  res.status(200).json({
    service: "ai-service",
    status: "ok",
    llm: {
      ...caps,
      configured: isLlmConfigured(),
      timeoutMs: LLM_TIMEOUT_MS
    }
  });
});

/** Legacy — AI-only stack: use POST /analyze-symptoms */
app.post("/symptom-check", (req, res) => {
  return res.status(503).json({
    code: "AI_ONLY",
    message: "Symptom analysis is cloud-LLM only. Use POST /analyze-symptoms with a Bearer token."
  });
});

app.post("/analyze-symptoms", verifyAuth, requirePatientOrAdmin, async (req, res) => {
  try {
    const symptoms = String(req.body.symptoms || "").trim();
    if (!symptoms) {
      return res.status(400).json({ message: "symptoms text is required" });
    }

    const rawCtx = req.body.patientContext;
    let patientContext = null;
    if (rawCtx && typeof rawCtx === "object" && !Array.isArray(rawCtx)) {
      patientContext = rawCtx;
    }

    const outcome = await analyzeWithLlm(symptoms, patientContext);
    if (!outcome.ok) {
      const status = outcome.code === "LLM_NOT_CONFIGURED" ? 503 : 502;
      return res.status(status).json({
        code: outcome.code,
        message: outcome.message
      });
    }

    const result = outcome.data;
    const llmUsed = result.source === "gemini";

    return res.status(200).json({
      ...result,
      aiEnabled: isLlmConfigured(),
      llmUsed,
      usedPatientContext: Boolean(patientContext)
    });
  } catch (err) {
    console.error("analyze-symptoms error:", err);
    return res.status(500).json({ message: "Symptom analysis failed" });
  }
});

// Listen immediately so /health is reachable for the API gateway. MongoDB is optional for this service
// and must not block startup (slow Atlas / DNS otherwise causes 504 from the gateway).
app.listen(PORT, () => {
  const caps = llmCapabilities();
  console.log(`AI Service listening on ${PORT}`);
  console.log(
      `LLM: gemini configured=${isLlmConfigured()} keys=`,
      caps
  );
});

connectDB().catch((err) => {
  console.error("AI service MongoDB (optional):", err?.message || err);
});
