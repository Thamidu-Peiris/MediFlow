import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientShell from "../components/PatientShell";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const COMMON_SYMPTOMS = [
  "Headache", "Fever", "Fatigue", "Cough", "Chest Pain",
  "Shortness of Breath", "Nausea", "Dizziness", "Rash", "Joint Pain"
];

const PNS = { value: "Prefer not to say", label: "Prefer not to say" };

function healthLabels(items) {
  if (!Array.isArray(items)) return [];
  return items.map((x) => (typeof x === "string" ? x : x?.label)).filter(Boolean);
}

function buildPatientContextForAI(patient, history) {
  if (!patient && !history) return null;
  const allergies = healthLabels(patient?.allergies);
  const medicalConditions = healthLabels(patient?.medicalConditions);
  const currentMedications = healthLabels(patient?.currentMedications);
  const reports = (patient?.reports || []).slice(0, 10).map((r) => ({
    title: r.title || r.fileName || "Report",
    category: r.category || ""
  }));
  const appointments = (history?.appointments || patient?.appointments || [])
    .slice(0, 8)
    .map((a) => ({
      doctorName: a.doctorName,
      date: a.date,
      status: a.status,
      diagnosis: a.diagnosis
    }));
  const prescriptions = (history?.prescriptions || patient?.prescriptions || []).slice(0, 6).map((p) => ({
    medicines: p.medicines || [],
    notes: p.notes || ""
  }));

  return {
    demographics: {
      age: patient?.age ?? null,
      gender: patient?.gender || "",
      bloodType: patient?.bloodType || ""
    },
    allergies,
    medicalConditions,
    currentMedications,
    medicalHistory: patient?.medicalHistory || [],
    pastDiagnoses: (history?.diagnoses || []).filter(Boolean).slice(0, 12),
    appointments,
    prescriptions,
    recentReports: reports
  };
}

function profileSummaryLines(ctx) {
  if (!ctx) return [];
  const lines = [];
  const { demographics } = ctx;
  if (demographics?.age != null || demographics?.gender) {
    const bits = [];
    if (demographics.age != null) bits.push(`age ${demographics.age}`);
    if (demographics.gender) bits.push(demographics.gender);
    lines.push(bits.join(", "));
  }
  if (demographics?.bloodType) lines.push(`Blood type: ${demographics.bloodType}`);
  if (ctx.allergies?.length) lines.push(`Allergies: ${ctx.allergies.join(", ")}`);
  if (ctx.medicalConditions?.length) lines.push(`Conditions: ${ctx.medicalConditions.join(", ")}`);
  if (ctx.currentMedications?.length) lines.push(`Medications: ${ctx.currentMedications.join(", ")}`);
  if (ctx.medicalHistory?.length) lines.push(`History notes: ${ctx.medicalHistory.slice(0, 3).join("; ")}`);
  return lines.slice(0, 8);
}

function engineDisplayName(source) {
  if (source === "gemini") return "Google Gemini 3";
  return source || "Google Gemini 3";
}

function specialtyLabelToSearch(label) {
  const t = String(label || "").toLowerCase();
  if (t.includes("cardio")) return "Cardiology";
  if (t.includes("derma") || t.includes("skin")) return "Dermatology";
  if (t.includes("neuro")) return "Neurology";
  if (t.includes("ortho") || t.includes("joint") || t.includes("bone")) return "Orthopedics";
  if (t.includes("psych")) return "Psychiatry";
  if (t.includes("pediatr")) return "Pediatrics";
  if (t.includes("pulmon") || t.includes("lung") || t.includes("respir")) return "General";
  if (t.includes("gastro")) return "General";
  if (t.includes("general") || t.includes("physician") || t.includes("family")) return "General";
  return String(label || "General").replace(/^You may need a\s+/i, "").trim() || "General";
}

/** Targeted follow-up questions: duration, red flags, and symptom-specific detail. */
function buildFollowUpQuestions(symptomsText, patientContext) {
  const text = String(symptomsText || "").toLowerCase();
  const out = [];
  const add = (q) => {
    if (!out.find((x) => x.id === q.id)) {
      out.push({
        ...q,
        options: [...(q.options || []), PNS]
      });
    }
  };

  add({
    id: "duration",
    question: "How long have you had these symptoms?",
    type: "choice",
    options: [
      { value: "Less than 24 hours", label: "Less than 24 hours" },
      { value: "1–3 days", label: "1–3 days" },
      { value: "4–7 days", label: "4–7 days" },
      { value: "More than a week", label: "More than a week" }
    ]
  });

  if (/fever|chills|temperature|\bhot\b/.test(text)) {
    add({
      id: "fever_level",
      question: "How high does the fever feel, or have you measured it?",
      type: "choice",
      options: [
        { value: "Not measured / unsure", label: "Not measured / unsure" },
        { value: "Mild (below ~38°C)", label: "Mild (below ~38°C)" },
        { value: "Moderate (~38–39°C)", label: "Moderate (~38–39°C)" },
        { value: "High (above ~39°C) or shaking chills", label: "High (above ~39°C) or shaking chills" }
      ]
    });
  }

  if (/chest|heart|pressure|tight/.test(text)) {
    add({
      id: "chest_exertion",
      question: "Is chest discomfort mainly with exertion or stress, or also at rest?",
      type: "choice",
      options: [
        { value: "Mainly with exertion or stress", label: "Mainly with exertion or stress" },
        { value: "Also at rest", label: "Also at rest" },
        { value: "Unsure", label: "Unsure" }
      ]
    });
    add({
      id: "chest_radiation",
      question: "Does discomfort spread to your arm, jaw, neck, or back?",
      type: "choice",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
        { value: "Unsure", label: "Unsure" }
      ]
    });
  }

  if (/headache|migraine/.test(text)) {
    add({
      id: "head_thunder",
      question: "Did pain reach maximum within seconds to a minute (sudden “thunderclap” onset)?",
      type: "choice",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
        { value: "Unsure", label: "Unsure" }
      ]
    });
    add({
      id: "head_neck_fever",
      question: "Any stiff neck, confusion, or high fever with the headache?",
      type: "choice",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" }
      ]
    });
  }

  if (/cough|throat|cold|flu|runny/.test(text)) {
    add({
      id: "cough_productive",
      question: "Is your cough mainly dry, or are you bringing up mucus?",
      type: "choice",
      options: [
        { value: "Dry cough", label: "Dry cough" },
        { value: "Productive (mucus)", label: "Productive (mucus)" },
        { value: "Both / varies", label: "Both / varies" }
      ]
    });
  }

  if (/breath|sob|shortness|wheeze/.test(text)) {
    add({
      id: "sob_timing",
      question: "Is shortness of breath worse at rest, only on exertion, or both?",
      type: "choice",
      options: [
        { value: "Mainly at rest", label: "Mainly at rest" },
        { value: "Only on exertion", label: "Only on exertion" },
        { value: "Both", label: "Both" }
      ]
    });
  }

  if (/rash|skin|itch|hives/.test(text)) {
    add({
      id: "rash_spread",
      question: "Is the rash spreading quickly, or affecting your face, lips, or tongue?",
      type: "choice",
      options: [
        { value: "Yes — fast spread or face/mouth", label: "Yes — fast spread or face/mouth" },
        { value: "No — mostly localized", label: "No — mostly localized" },
        { value: "Unsure", label: "Unsure" }
      ]
    });
  }

  if (/nausea|vomit|diarrhea|stomach|abdomen|belly/.test(text)) {
    add({
      id: "gi_context",
      question: "Any recent travel, restaurant meals, or new medications before this started?",
      type: "choice",
      options: [
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
        { value: "Unsure", label: "Unsure" }
      ]
    });
  }

  if (/joint|knee|back pain|arthritis|swelling/.test(text)) {
    add({
      id: "joint_count",
      question: "Is pain mainly in one area or in several places?",
      type: "choice",
      options: [
        { value: "One area", label: "One area" },
        { value: "Several areas", label: "Several areas" },
        { value: "Widespread", label: "Widespread" }
      ]
    });
  }

  if (patientContext?.allergies?.length) {
    add({
      id: "exposure",
      question: "Any new foods, medications, insects, or products before symptoms began?",
      type: "choice",
      options: [
        { value: "Yes, possible new exposure", label: "Yes, possible new exposure" },
        { value: "No obvious new exposure", label: "No obvious new exposure" },
        { value: "Unsure", label: "Unsure" }
      ]
    });
  }

  add({
    id: "trend",
    question: "Compared to when they started, your symptoms are:",
    type: "choice",
    options: [
      { value: "Getting worse", label: "Getting worse" },
      { value: "About the same", label: "About the same" },
      { value: "Improving", label: "Improving" }
    ]
  });

  return out.slice(0, 9);
}

function compileSymptomsBundle(baseSymptoms, questions, answers) {
  const lines = questions.map((q) => {
    const a = answers[q.id];
    return `- ${q.question} ${a ? `→ ${a}` : "→ (not answered)"}`;
  });
  return `Patient-reported symptoms:\n${String(baseSymptoms).trim()}\n\nFollow-up responses:\n${lines.join("\n")}`;
}

export default function AICheckerPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();

  /** 0 = welcome, 1 = describe, 2 = follow-up questions, 3 = results */
  const [phase, setPhase] = useState(0);
  const [symptoms, setSymptoms] = useState("");
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [followUpIndex, setFollowUpIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const [includeProfile, setIncludeProfile] = useState(true);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState("");
  const [patientContext, setPatientContext] = useState(null);
  const [summaryLines, setSummaryLines] = useState([]);

  const [llmStatus, setLlmStatus] = useState({ loading: true, configured: false, error: null });

  useEffect(() => {
    api
      .get("/ai/health")
      .then((r) => {
        const configured = Boolean(r.data?.llm?.configured);
        setLlmStatus({ loading: false, configured, error: null });
      })
      .catch(() => {
        setLlmStatus({
          loading: false,
          configured: false,
          error:
            "Could not reach the AI service. Ensure the API gateway and ai-service are running and reachable."
        });
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setContextLoading(true);
    setContextError("");

    Promise.allSettled([
      api.get("/patients/me", authHeaders),
      api.get("/patients/history", authHeaders)
    ])
      .then(([meRes, histRes]) => {
        if (cancelled) return;
        const patient =
          meRes.status === "fulfilled" ? meRes.value.data?.patient : null;
        const history =
          histRes.status === "fulfilled" ? histRes.value.data : null;

        if (meRes.status === "rejected" && histRes.status === "rejected") {
          setContextError("Could not load your MediFlow profile for context.");
          setPatientContext(null);
          setSummaryLines([]);
          return;
        }

        const ctx = buildPatientContextForAI(patient, history);
        setPatientContext(ctx);
        setSummaryLines(profileSummaryLines(ctx));
      })
      .catch(() => {
        if (!cancelled) {
          setContextError("Could not load profile data.");
          setPatientContext(null);
        }
      })
      .finally(() => {
        if (!cancelled) setContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const runAnalysis = async (compiledSymptoms) => {
    setLoading(true);
    setError("");
    setResult(null);

    const payload = {
      symptoms: compiledSymptoms,
      patientContext: includeProfile ? patientContext : null
    };

    try {
      const response = await api.post("/ai/analyze-symptoms", payload, authHeaders);
      const data = response.data;
      const specs =
        Array.isArray(data.recommendedSpecialties) && data.recommendedSpecialties.length
          ? data.recommendedSpecialties
          : data.recommendedSpecialty
            ? [specialtyLabelToSearch(data.recommendedSpecialty)]
            : ["General"];

      setResult({
        ...data,
        recommendedSpecialties: specs,
        recommendedSpecialty: data.recommendedSpecialty || specs[0]
      });
      return true;
    } catch (err) {
      const code = err.response?.data?.code;
      const msg =
        err.response?.data?.message ||
        (code === "LLM_NOT_CONFIGURED"
          ? "Gemini is not configured on the server. Set GEMINI_API_KEY in ai-service .env."
          : code === "LLM_UNAVAILABLE"
            ? "Gemini did not return a valid response. Try again or check server logs."
            : "AI analysis failed. Please try again.");
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setPhase(0);
    setSymptoms("");
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    setFollowUpIndex(0);
    setResult(null);
    setError("");
  };

  const goDescribe = () => {
    if (!aiReady) return;
    setError("");
    setPhase(1);
  };

  const goFollowUps = (e) => {
    e?.preventDefault?.();
    if (!symptoms.trim()) {
      setError("Please describe your symptoms to continue.");
      return;
    }
    setError("");
    const qs = buildFollowUpQuestions(symptoms, includeProfile ? patientContext : null);
    setFollowUpQuestions(qs);
    const init = {};
    qs.forEach((q) => {
      init[q.id] = "";
    });
    setFollowUpAnswers(init);
    setFollowUpIndex(0);
    setPhase(2);
  };

  const goResults = async (e) => {
    e?.preventDefault?.();
    const current = followUpQuestions[followUpIndex];
    if (!current) return;

    if (!followUpAnswers[current.id]) {
      setError("Please answer this question (or choose 'Prefer not to say').");
      return;
    }

    setError("");
    const isLast = followUpIndex >= followUpQuestions.length - 1;
    if (!isLast) {
      setFollowUpIndex((prev) => prev + 1);
      return;
    }

    const bundle = compileSymptomsBundle(symptoms, followUpQuestions, followUpAnswers);
    const ok = await runAnalysis(bundle);
    if (ok) setPhase(3);
  };

  const addSymptom = (symptom) => {
    setSymptoms((prev) => {
      if (prev.includes(symptom)) return prev;
      return prev ? `${prev}, ${symptom.toLowerCase()}` : symptom.toLowerCase();
    });
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case "High": return "#ef4444";
      case "Medium": return "#f59e0b";
      case "Low": return "#10b981";
      default: return "#64748b";
    }
  };

  const goFindDoctors = (search) => {
    const s = encodeURIComponent(search || "General");
    navigate(`/patient/doctors?search=${s}`);
  };

  const specialties =
    result?.recommendedSpecialties?.length
      ? result.recommendedSpecialties
      : result?.recommendedSpecialty
        ? [specialtyLabelToSearch(result.recommendedSpecialty)]
        : [];

  const currentFollowUpQuestion = followUpQuestions[followUpIndex] || null;
  const isLastFollowUpQuestion = followUpIndex >= followUpQuestions.length - 1;

  const stepperLabels = ["DESCRIBE", "REFINE", "INSIGHTS"];
  const currentStepperStep = phase <= 1 ? 1 : phase === 2 ? 2 : 3;

  const aiReady =
    llmStatus.configured && !llmStatus.loading && !llmStatus.error;
  const aiStatusMessage = llmStatus.loading
    ? "Checking AI service…"
    : llmStatus.error
      ? llmStatus.error
      : !llmStatus.configured
        ? "Set GEMINI_API_KEY in backend/services/ai-service/.env (see .env.example), then restart ai-service."
        : "";

  return (
    <PatientShell>
      <div className={`sc-page${phase === 3 ? " sc-page--compact-results" : ""}`}>
        <div className="sc-wizard">
          {phase === 0 ? (
            <header className="sc-page-hero">
              <h1 className="sc-page-hero__title">
                <span className="sc-page-hero__line sc-page-hero__line--teal">AI Symptom Checker:</span>
                <span className="sc-page-hero__line sc-page-hero__line--navy">Powered by Clinical Intelligence</span>
              </h1>
              <p className="sc-page-hero__lead">
                Identify possible conditions and understand your health better with our medically-vetted AI analysis.
              </p>
            </header>
          ) : null}

          <section className={`sc-main-card${phase === 3 ? " sc-main-card--results-compact" : ""}`}>
            {phase > 0 ? (
              <div className="sc-stepper" aria-label="Progress">
                {stepperLabels.map((label, i) => {
                  const n = i + 1;
                  const active = n === currentStepperStep;
                  const done = phase > 0 && n < currentStepperStep;
                  return (
                    <div
                      key={label}
                      className={`sc-stepper__item${active ? " sc-stepper__item--active" : ""}${done ? " sc-stepper__item--done" : ""}`}
                    >
                      <span className="sc-stepper__num" aria-hidden>
                        {n}
                      </span>
                      <span className="sc-stepper__label">{label}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}

          {phase === 0 ? (
            <div className="sc-main-card__inner sc-main-card--intro">
              {!aiReady ? (
                <div className="sc-ai-banner" role="alert">
                  {aiStatusMessage}
                </div>
              ) : null}
              <h2 className="sc-card-title">Symptom checker</h2>
              <p className="sc-card-lead">
                Describe how you feel, answer a few targeted questions, then see guidance and specialties you can book
                in MediFlow. This is not a diagnosis or emergency triage.
              </p>
              <div className="sc-card-footer">
                <button
                  type="button"
                  className="sc-btn-primary sc-btn-primary--arrow"
                  onClick={goDescribe}
                  disabled={!aiReady}
                >
                  Start analysis
                </button>
              </div>
              <p className="sc-privacy">
                Privacy: symptom text is used for this check only. Your profile is sent only when the option below is
                enabled on the next step.
              </p>
            </div>
          ) : null}

          {phase === 1 ? (
            <div className="sc-main-card__inner">
              {!aiReady ? (
                <div className="sc-ai-banner" role="alert">
                  {aiStatusMessage}
                </div>
              ) : null}
              <div className="sc-context-panel">
                <label className="sc-check-label">
                  <input
                    type="checkbox"
                    checked={includeProfile}
                    onChange={(e) => setIncludeProfile(e.target.checked)}
                    disabled={contextLoading || !patientContext}
                  />
                  Include my MediFlow health profile (allergies, conditions, meds, history snippets)
                </label>
                {contextLoading ? (
                  <p className="sc-muted">Loading profile…</p>
                ) : contextError ? (
                  <p className="sc-warn">{contextError}</p>
                ) : summaryLines.length ? (
                  <ul className="sc-summary-list">
                    {summaryLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="sc-muted">Complete your Profile to improve suggestions.</p>
                )}
              </div>

              <form className="sc-form" onSubmit={goFollowUps}>
                <h2 className="sc-card-title sc-card-title--solo">How are you feeling today?</h2>
                <textarea
                  className="sc-textarea"
                  rows={6}
                  placeholder="Example: I've had a persistent headache and a slight fever for the last two days. I also feel more tired than usual…"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  aria-label="Describe your symptoms"
                />
                <p className="sc-chip-hint">Suggestions — tap to add</p>
                <div className="sc-tag-row">
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      className="sc-tag"
                      onClick={() => addSymptom(symptom)}
                    >
                      + {symptom}
                    </button>
                  ))}
                </div>
                {error ? <div className="message-toast error sc-toast">{error}</div> : null}
                <div className="sc-card-footer sc-card-footer--split">
                  <button type="button" className="sc-btn-ghost" onClick={() => setPhase(0)}>
                    Back
                  </button>
                  <button
                    type="submit"
                    className="sc-btn-primary sc-btn-primary--arrow"
                    disabled={contextLoading || !aiReady}
                  >
                    Start analysis
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {phase === 2 ? (
            <div className="sc-main-card__inner sc-main-card--followup">
              <h2 className="sc-panel-title">A few follow-up questions</h2>
              <p className="sc-muted sc-panel-sub">
                Answer based on how you feel right now. This mirrors guided symptom checkers so the analysis can weigh
                duration and warning signs.
              </p>
              {currentFollowUpQuestion ? (
                <p className="sc-q-progress">
                  Question {followUpIndex + 1} of {followUpQuestions.length}
                </p>
              ) : null}
              <form className="sc-followup-form" onSubmit={goResults}>
                {currentFollowUpQuestion ? (
                  <fieldset key={currentFollowUpQuestion.id} className="sc-q-block">
                    <legend className="sc-q-legend">{currentFollowUpQuestion.question}</legend>
                    <div className="sc-q-options">
                      {currentFollowUpQuestion.options.map((opt) => (
                        <label key={opt.value} className="sc-radio-line">
                          <input
                            type="radio"
                            name={currentFollowUpQuestion.id}
                            value={opt.value}
                            checked={followUpAnswers[currentFollowUpQuestion.id] === opt.value}
                            onChange={() =>
                              setFollowUpAnswers((prev) => ({
                                ...prev,
                                [currentFollowUpQuestion.id]: opt.value
                              }))
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                {error ? <div className="message-toast error sc-toast">{error}</div> : null}
                <div className="sc-nav-row">
                  <button
                    type="button"
                    className="sc-btn-ghost"
                    onClick={() => {
                      if (followUpIndex > 0) {
                        setFollowUpIndex((prev) => prev - 1);
                        setError("");
                      } else {
                        setPhase(1);
                      }
                    }}
                  >
                    {followUpIndex > 0 ? "Previous question" : "Back"}
                  </button>
                  <button
                    type="submit"
                    className={`sc-btn-primary${loading ? "" : " sc-btn-primary--arrow"}`}
                    disabled={loading || !aiReady || !currentFollowUpQuestion}
                  >
                    {loading ? (
                      <>
                        <span className="spinner" /> Getting insights…
                      </>
                    ) : isLastFollowUpQuestion ? (
                      "Get insights"
                    ) : (
                      "Next question"
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {phase === 3 && result ? (
            <div className="sc-main-card__inner sc-results">
            <div className="sc-results-head">
              <h2 className="sc-panel-title">Your insights</h2>
              <button type="button" className="sc-btn-ghost sc-btn-small" onClick={resetWizard}>
                New check
              </button>
            </div>

            <div className="sc-badges">
              <span className="sc-badge">
                Engine: {engineDisplayName(result.source)}
                {result.llmModel ? ` (${result.llmModel})` : ""}
              </span>
              {typeof result.aiEnabled === "boolean" && result.aiEnabled ? (
                <span className="sc-badge">Mode: Google Gemini 3 (API)</span>
              ) : null}
              {result.llmUsed ? <span className="sc-badge">LLM response</span> : null}
              {result.usedPatientContext ? <span className="sc-badge">Profile used</span> : null}
            </div>

            <div className="sc-severity-row">
              <span className="sc-severity-label">Severity (triage hint)</span>
              <span
                className="sc-severity-pill"
                style={{
                  background: `${getSeverityColor(result.severity)}22`,
                  color: getSeverityColor(result.severity)
                }}
              >
                {result.severity}
              </span>
            </div>

            {Array.isArray(result.suggestions) && result.suggestions.length > 0 ? (
              <div className="sc-block">
                <h3 className="sc-block-title">Guidance and next steps</h3>
                <ul className="sc-bullet-list">
                  {result.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="sc-block">
              <h3 className="sc-block-title">Possible patterns</h3>
              <div className="sc-conditions">
                {result.conditions?.map((condition, idx) => (
                  <div key={idx} className="sc-condition-row">
                    <span>{condition.name}</span>
                    <span className="sc-prob">{condition.probability}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sc-block">
              <h3 className="sc-block-title">Recommended specialties</h3>
              <div className="sc-tag-row">
                {specialties.map((sp) => (
                  <button key={sp} type="button" className="sc-tag sc-tag-accent" onClick={() => goFindDoctors(sp)}>
                    Find {sp} →
                  </button>
                ))}
              </div>
              <p className="sc-muted sc-tight-top">
                Primary: <strong>{result.recommendedSpecialty || specialties[0]}</strong>
              </p>
            </div>

            <div className="sc-nav-row">
              <button type="button" className="sc-btn-primary" onClick={() => goFindDoctors(specialties[0] || "General")}>
                Find doctors
              </button>
              <button type="button" className="sc-btn-secondary" onClick={() => navigate("/patient/appointments")}>
                My appointments
              </button>
            </div>

              <p className="sc-disclaimer">{result.disclaimer}</p>
            </div>
          ) : null}
          </section>
        </div>
      </div>
    </PatientShell>
  );
}
