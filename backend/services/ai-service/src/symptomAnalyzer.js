const SPECIALTY_MAP = [
  { id: "Cardiology", keys: ["heart", "chest pain", "palpitation", "blood pressure", "cardiovascular", "cardiac"] },
  { id: "Dermatology", keys: ["skin", "rash", "acne", "mole", "itch", "dermatitis", "hives"] },
  { id: "Neurology", keys: ["headache", "migraine", "seizure", "numbness", "dizziness", "concussion", "tremor"] },
  { id: "Orthopedics", keys: ["joint pain", "fracture", "bone", "back pain", "sprain", "arthritis", "knee", "shoulder"] },
  { id: "General", keys: ["stomach", "nausea", "vomit", "diarrhea", "constipation", "heartburn", "gastro"] },
  { id: "General", keys: ["cough", "shortness of breath", "breath", "asthma", "wheeze", "pneumonia", "lung"] },
  { id: "General", keys: ["fever", "cold", "flu", "fatigue", "weakness", "chills"] }
];

const ORDERED_SPECIALTIES = [
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Psychiatry",
  "Pediatrics",
  "General"
];

function pickSpecialties(text) {
  const t = text.toLowerCase();
  const hits = new Set();
  for (const { id, keys } of SPECIALTY_MAP) {
    if (keys.some((k) => t.includes(k))) hits.add(id);
  }
  if (hits.size === 0) hits.add("General");
  return ORDERED_SPECIALTIES.filter((s) => hits.has(s));
}

function contextHints(ctx) {
  if (!ctx || typeof ctx !== "object") return "";
  const parts = [];
  const allergies = ctx.allergies;
  if (Array.isArray(allergies) && allergies.length) {
    parts.push(`Known allergies: ${allergies.join(", ")}.`);
  }
  const meds = ctx.currentMedications;
  if (Array.isArray(meds) && meds.length) {
    parts.push(`Current medications/supplements: ${meds.join(", ")}.`);
  }
  const cond = ctx.medicalConditions;
  if (Array.isArray(cond) && cond.length) {
    parts.push(`Documented conditions: ${cond.join(", ")}.`);
  }
  return parts.join(" ");
}

function analyzeRuleBased(symptoms, patientContext) {
  const text = String(symptoms || "").toLowerCase();
  const ctxLine = contextHints(patientContext);
  const merged = ctxLine ? `${text}\n${ctxLine.toLowerCase()}` : text;

  const conditions = [];
  let severity = "Low";

  if (merged.includes("chest pain") || merged.includes("pressure")) {
    conditions.push({ name: "Possible cardiac-related discomfort (non-specific)", probability: "Medium" });
    severity = "High";
  }
  if (merged.includes("shortness of breath") || merged.includes("cant breathe")) {
    conditions.push({ name: "Respiratory distress pattern (non-specific)", probability: "Medium" });
    severity = "High";
  }
  if (merged.includes("headache") || merged.includes("migraine")) {
    conditions.push({ name: "Tension-type or primary headache (common)", probability: "High" });
    if (merged.includes("severe") || merged.includes("worst") || merged.includes("thunderclap")) {
      conditions.push({ name: "Features warrant urgent evaluation", probability: "Medium" });
      severity = severity === "High" ? "High" : "Medium";
    }
  }
  if (merged.includes("fever")) {
    conditions.push({ name: "Febrile illness (often viral)", probability: "High" });
    if (merged.includes("high") || merged.includes("103") || merged.includes("104")) severity = "High";
  }
  if (merged.includes("rash") || merged.includes("skin") || merged.includes("hives")) {
    conditions.push({ name: "Dermatologic or allergic skin reaction (non-specific)", probability: "Medium" });
    if (ctxLine.toLowerCase().includes("allerg")) severity = severity === "Low" ? "Medium" : severity;
  }
  if (merged.includes("cough") || merged.includes("cold")) {
    conditions.push({ name: "Upper respiratory irritation / common cold spectrum", probability: "High" });
  }
  if (merged.includes("nausea") || merged.includes("vomit") || merged.includes("stomach")) {
    conditions.push({ name: "Gastrointestinal upset (many causes)", probability: "Medium" });
  }
  if (merged.includes("dizziness") || merged.includes("lightheaded")) {
    conditions.push({ name: "Vertigo / orthostatic symptoms (non-specific)", probability: "Medium" });
  }
  if (merged.includes("joint pain") || merged.includes("arthritis")) {
    conditions.push({ name: "Musculoskeletal joint inflammation (non-specific)", probability: "Medium" });
  }

  if (conditions.length === 0) {
    conditions.push({ name: "Non-specific symptoms — clinical correlation needed", probability: "Low" });
  }

  const highKw = ["severe", "extreme", "unbearable", "emergency", "cant move", "worst headache"];
  if (highKw.some((kw) => merged.includes(kw))) severity = "High";
  else if (conditions.length >= 3) severity = severity === "Low" ? "Medium" : severity;

  const recommendedSpecialties = pickSpecialties(merged);
  const recommendedSpecialty = recommendedSpecialties[0] || "General";

  const suggestions = [
    "This is educational triage only — it is not a diagnosis.",
    "Seek emergency care for crushing chest pain, trouble breathing, stroke symptoms, or loss of consciousness.",
    "Track onset, duration, triggers, and associated symptoms to share with a clinician."
  ];
  if (ctxLine) {
    suggestions.unshift("Your saved profile (allergies, meds, conditions) was included to highlight interactions and chronic context.");
  }

  return {
    severity,
    conditions,
    recommendedSpecialty,
    recommendedSpecialties,
    suggestions,
    disclaimer:
      "MediFlow AI Symptom Checker provides preliminary, non-diagnostic information. Always consult a licensed healthcare professional.",
    source: "rule"
  };
}

module.exports = { analyzeRuleBased, ORDERED_SPECIALTIES };
