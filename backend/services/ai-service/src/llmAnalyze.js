const { ORDERED_SPECIALTIES } = require("./symptomAnalyzer");

const LLM_TIMEOUT_MS = Math.min(Math.max(Number(process.env.LLM_TIMEOUT_MS) || 45000, 5000), 120000);

/** Read API keys from process.env with trim + optional surrounding quotes (common in .env files). */
function envApiKey(name) {
  const v = process.env[name];
  if (v == null) return "";
  let t = String(v).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

function truncate(str, max) {
  const s = String(str || "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function patientContextBlock(ctx) {
  if (!ctx || typeof ctx !== "object") return "No structured patient profile was supplied.";
  try {
    return truncate(JSON.stringify(ctx, null, 0), 6000);
  } catch {
    return "";
  }
}

function normalizeSpecialtyList(raw) {
  const fromArray = Array.isArray(raw) ? raw : [];
  const set = new Set();
  for (const x of fromArray) {
    const s = String(x || "").trim();
    if (!s) continue;
    const lowered = s.toLowerCase();
    if (lowered.includes("psychiat")) {
      set.add("Psychiatry");
      continue;
    }
    if (lowered.includes("pediatr") || lowered.includes("infant") || lowered.includes("child")) {
      set.add("Pediatrics");
      continue;
    }
    const match = ORDERED_SPECIALTIES.find(
      (o) => o.toLowerCase() === lowered || lowered.includes(o.toLowerCase())
    );
    set.add(match || "General");
  }
  const list = [...set];
  if (!list.length) return ["General"];
  return list.slice(0, 3);
}

const SYSTEM_INSTRUCTION = `You assist a hospital patient portal (MediFlow). You must NOT provide a definitive medical diagnosis.
Return ONLY a JSON object with this exact shape:
{
  "severity": "Low" | "Medium" | "High",
  "conditions": [ { "name": string, "probability": "Low" | "Medium" | "High" } ],
  "recommendedSpecialties": string[],
  "suggestions": string[]
}
Rules:
- Use 1 to 4 conditions max; name them cautiously (e.g. "possible ... pattern").
- recommendedSpecialties: 1-3 values, each MUST be one of: Cardiology, Dermatology, Neurology, Orthopedics, Psychiatry, Pediatrics, General.
- suggestions: 3-6 short bullet strings: self-care, red flags, when to seek urgent care, and how profile context matters if relevant.
- severity High only if red-flag symptoms appear in the text.`;

function buildUserContent(symptoms, patientContext) {
  return `Patient-reported symptoms:\n${truncate(symptoms, 4000)}\n\nStructured context from their MediFlow record (may be empty):\n${patientContextBlock(patientContext)}`;
}

function parseLlmJson(content) {
  if (!content || typeof content !== "string") return null;
  const trimmed = content.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(trimmed);
  const raw = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) return JSON.parse(raw.slice(start, end + 1));
    } catch {
      /* ignore */
    }
  }
  return null;
}

function shapeResult(parsed, source, modelLabel) {
  const severity = ["Low", "Medium", "High"].includes(parsed.severity) ? parsed.severity : "Low";
  const conditions = Array.isArray(parsed.conditions)
    ? parsed.conditions
        .filter((c) => c && c.name)
        .map((c) => ({
          name: String(c.name).slice(0, 160),
          probability: ["Low", "Medium", "High"].includes(c.probability) ? c.probability : "Low"
        }))
        .slice(0, 5)
    : [];

  const recommendedSpecialties = normalizeSpecialtyList(parsed.recommendedSpecialties);
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
    : [];

  if (!conditions.length) return null;

  return {
    severity,
    conditions,
    recommendedSpecialty: recommendedSpecialties[0],
    recommendedSpecialties,
    suggestions: suggestions.length
      ? suggestions
      : ["Follow up with a clinician for personalized advice."],
    disclaimer:
      "MediFlow AI Symptom Checker provides preliminary, non-diagnostic information. Always consult a licensed healthcare professional.",
    source,
    llmProvider: source,
    llmModel: modelLabel
  };
}

function withTimeout(ms) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, cancel: () => clearTimeout(id) };
}

/**
 * Gemini 3 preview ids (see https://ai.google.dev/gemini-api/docs/gemini-3).
 * Falls back to 2.x if a key cannot access preview models (404).
 */
function geminiModelCandidates() {
  const preferred =
    String(process.env.GEMINI_MODEL || "").trim() || "gemini-3-flash-preview";
  const fallbacks = [
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-pro-preview",
    "gemini-2.0-flash"
  ];
  const list = [preferred, ...fallbacks];
  return [...new Set(list)];
}

async function callGemini(symptoms, patientContext) {
  const key = envApiKey("GEMINI_API_KEY");
  if (!key) return null;

  const { signal, cancel } = withTimeout(LLM_TIMEOUT_MS);
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [
      {
        role: "user",
        parts: [{ text: buildUserContent(symptoms, patientContext) }]
      }
    ],
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 900,
      responseMimeType: "application/json"
    }
  };

  try {
    let lastErr = "";
    for (const model of geminiModelCandidates()) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const raw = await res.text().catch(() => "");
      if (res.status === 404) {
        console.warn(`Gemini model "${model}" returned 404, trying next…`, raw.slice(0, 240));
        lastErr = raw.slice(0, 400);
        continue;
      }

      if (!res.ok) {
        console.error("Gemini API error:", res.status, raw.slice(0, 500));
        return null;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error("Gemini: invalid JSON body");
        return null;
      }

      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = parseLlmJson(content);
      if (!parsed) {
        console.error("Gemini: could not parse model JSON output");
        return null;
      }
      const userModel = String(process.env.GEMINI_MODEL || "").trim();
      if (userModel && model !== userModel) {
        console.log(
          `Gemini: using "${model}" because "${userModel}" was unavailable. Set GEMINI_MODEL=${model} in .env to skip fallback.`
        );
      }
      return shapeResult(parsed, "gemini", model);
    }

    console.error("Gemini: all model candidates failed.", lastErr);
    return null;
  } catch (e) {
    if (e.name === "AbortError") console.error("Gemini request timed out");
    else console.error("Gemini request failed:", e.message);
    return null;
  } finally {
    cancel();
  }
}

function llmCapabilities() {
  return {
    provider: "gemini",
    gemini: Boolean(envApiKey("GEMINI_API_KEY")),
    defaultGeminiModel: "gemini-3-flash-preview"
  };
}

function isLlmConfigured() {
  return Boolean(envApiKey("GEMINI_API_KEY"));
}

/**
 * Symptom checker is AI-only: no rule-based fallback.
 * Returns { ok: true, data } or { ok: false, code, message }.
 */
async function analyzeWithLlm(symptoms, patientContext) {
  if (!isLlmConfigured()) {
    return {
      ok: false,
      code: "LLM_NOT_CONFIGURED",
      message:
        "GEMINI_API_KEY is not set on the ai-service. Add it to backend/services/ai-service/.env (see .env.example), then restart ai-service."
    };
  }

  try {
    const out = await callGemini(symptoms, patientContext);
    if (out) return { ok: true, data: out };
  } catch (e) {
    console.error("Gemini provider error:", e.message);
  }

  return {
    ok: false,
    code: "LLM_UNAVAILABLE",
    message:
      "Google Gemini did not return a valid response. Use a Gemini 3 id your key supports (e.g. gemini-3-flash-preview). See https://ai.google.dev/gemini-api/docs/gemini-3 and https://ai.google.dev/gemini-api/docs/models"
  };
}

module.exports = {
  analyzeWithLlm,
  llmCapabilities,
  isLlmConfigured,
  LLM_TIMEOUT_MS
};
