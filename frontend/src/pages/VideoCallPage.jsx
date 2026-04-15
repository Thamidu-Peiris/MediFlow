import AgoraRTC from "agora-rtc-sdk-ng";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

/* Silence Agora's verbose console output in production */
AgoraRTC.setLogLevel(4);

/* Agora Configuration */
const AGORA_APP_ID = "813878b01fed414a85775bdf1796deb6";

export default function VideoCallPage() {
  const [searchParams] = useSearchParams();
  const channel  = searchParams.get("channel")  || "";
  const role     = searchParams.get("role")     || "patient";
  const peerName = searchParams.get("peer")     || (role === "doctor" ? "Patient" : "Doctor");

  const { authHeaders } = useAuth();

  /* Enhanced features state */
  const [activeTab, setActiveTab] = useState("notes"); // chat | notes | reports
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);
  const [observationNotes, setObservationNotes] = useState("");
  const [sessionData, setSessionData] = useState(null);
  const [patientHealthInfo, setPatientHealthInfo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // New Prescription Form State
  const [newMed, setNewMed] = useState({ name: "", dosage: "", frequency: "", duration: "" });

  /* ── state ─────────────────────────────────────────────────────── */
  const [phase,      setPhase]      = useState("idle");   // idle | joining | live | ended | error
  const [errorMsg,   setErrorMsg]   = useState("");
  const [hasRemote,  setHasRemote]  = useState(false);
  const [micMuted,   setMicMuted]   = useState(false);
  const [camOff,     setCamOff]     = useState(false);
  const [elapsed,    setElapsed]    = useState(0);
  const [chatPollInterval, setChatPollInterval] = useState(null);

  /* ── refs ──────────────────────────────────────────────────────── */
  const clientRef        = useRef(null);
  const audioTrackRef    = useRef(null);
  const videoTrackRef    = useRef(null);
  const localDivRef      = useRef(null);
  const remoteDivRef     = useRef(null);
  const timerRef         = useRef(null);

  /* ── init call ─────────────────────────────────────────────────── */
  useEffect(() => {
    // Auto-refresh prescriptions for patient
    let pollInterval;
    if (role === "patient" && sessionData?.patientId) {
      const fetchPrescriptions = async () => {
        try {
          const res = await api.get("/patients/prescriptions", authHeaders);
          // Filter prescriptions for this specific session/appointment if ID exists
          const sessionPrescs = res.data.prescriptions.filter(p => 
            p.appointmentId === sessionData.appointmentId || 
            (new Date(p.createdAt) > new Date(Date.now() - 3600000)) // Fallback: last 1 hour
          );
          if (sessionPrescs.length > 0) {
            setPrescriptions(sessionPrescs);
            // Also update observation notes from the latest prescription if empty
            if (!observationNotes && sessionPrescs[0].notes) {
              setObservationNotes(sessionPrescs[0].notes);
            }
          }
        } catch (err) {
          console.error("Failed to fetch prescriptions for patient:", err);
        }
      };

      pollInterval = setInterval(fetchPrescriptions, 5000); // Poll every 5 seconds
      fetchPrescriptions(); // Initial fetch
    }

    if (!channel) {
      setErrorMsg("No call channel specified.");
      setPhase("error");
      return;
    }

    let cancelled = false;
    setPhase("joining");

    (async () => {
      try {
        /* 0 — Fetch session data */
        try {
          const sRes = await api.get(`/telemedicine/room/${channel}`, authHeaders);
          if (sRes.data?.session) {
            const session = sRes.data.session;
            setSessionData(session);
            if (session.doctorNotes) {
              setObservationNotes(session.doctorNotes);
            }

            // If doctor, fetch patient health info
            if (role === "doctor" && session.patientId) {
              try {
                const pRes = await api.get(`/patients/${session.patientId}`, authHeaders);
                if (pRes.data?.patient) {
                  setPatientHealthInfo(pRes.data.patient);
                }
              } catch (pErr) {
                console.error("Failed to fetch patient health info:", pErr);
              }
            }
          }
        } catch (sErr) {
          console.error("Failed to fetch session metadata:", sErr);
        }

        /* 1 — use Agora App ID directly */
        const appId = AGORA_APP_ID;
        if (!appId) throw new Error("Agora App ID not configured.");

        /* 2 — create Agora client */
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        /* 3 — remote user events */
        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "video") {
            setHasRemote(true);
            if (remoteDivRef.current) {
              remoteUser.videoTrack?.play(remoteDivRef.current);
            }
          }
          if (mediaType === "audio") {
            remoteUser.audioTrack?.play();
          }
        });

        client.on("user-unpublished", (_user, mediaType) => {
          if (mediaType === "video") setHasRemote(false);
        });

        client.on("user-left", () => setHasRemote(false));

        /* 4 — fetch token for secure authentication */
        const uid = Math.floor(Math.random() * 99000) + 1000;
        const tokenRes = await api.get(`/telemedicine/token?channelName=${channel}&uid=${uid}&role=publisher`, authHeaders);
        const token = tokenRes.data?.token;
        if (!token) throw new Error("Failed to generate authentication token.");
        
        /* 5 — join channel with token */
        await client.join(appId, channel, token, uid);

        /* 6 — create local audio + video tracks */
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          {},
          { encoderConfig: "720p_1" }
        );
        audioTrackRef.current = audioTrack;
        videoTrackRef.current = videoTrack;

        await client.publish([audioTrack, videoTrack]);

        if (cancelled) return;
        setPhase("live");

        /* 7 — play local video in PiP */
        if (localDivRef.current) {
          videoTrack.play(localDivRef.current);
        }

        /* 8 — start elapsed timer */
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message || "Failed to join the call. Check camera/mic permissions.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(timerRef.current);
      audioTrackRef.current?.close();
      videoTrackRef.current?.close();
      clientRef.current?.leave().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, role, sessionData?.patientId, sessionData?.appointmentId, authHeaders]);

  /* ── controls ──────────────────────────────────────────────────── */
  const toggleMic = async () => {
    if (!audioTrackRef.current) return;
    const next = micMuted;          // if currently muted, we want to enable
    await audioTrackRef.current.setEnabled(next);
    setMicMuted(!next);
  };

  const toggleCam = async () => {
    if (!videoTrackRef.current) return;
    const next = camOff;
    await videoTrackRef.current.setEnabled(next);
    setCamOff(!next);
  };

  const leaveCall = async () => {
    clearInterval(timerRef.current);
    audioTrackRef.current?.close();
    videoTrackRef.current?.close();
    await clientRef.current?.leave().catch(() => {});
    setPhase("ended");
    setTimeout(() => window.close(), 3000);
  };

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const COMMON_DOSAGES = ["500mg", "250mg", "100mg", "10mg", "5mg", "1 tab", "2 tabs"];
  const COMMON_FREQUENCIES = ["Once daily", "Twice daily (1-0-1)", "Thrice daily (1-1-1)", "Every 4 hours", "Before meals", "At bedtime"];
  const COMMON_DURATIONS = ["3 days", "5 days", "7 days", "10 days", "14 days", "1 month"];
  const MEDICINE_SUGGESTIONS = [
    "Paracetamol", "Amoxicillin", "Ibuprofen", "Metformin", "Atorvastatin", 
    "Amlodipine", "Omeprazole", "Losartan", "Albuterol", "Gabapentin",
    "Cetirizine", "Azithromycin", "Prednisone", "Pantoprazole", "Sertraline"
  ];

  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !sessionData?._id || isSaving) return;
    
    try {
      // Clear input immediately for better UX
      setNewMessage("");
      
      const msgData = {
        text: trimmed,
        role: role,
        senderName: role === "doctor" ? "Doctor" : "Patient"
      };
      
      const res = await api.post(`/telemedicine/${sessionData._id}/chat`, msgData, authHeaders);
      if (res.data?.chatMessages) {
        setChatMessages(res.data.chatMessages.map(m => ({
          ...m,
          time: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })));
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      // Optional: restore the message if it failed
      setNewMessage(trimmed);
    }
  };

  // Chat polling effect
  useEffect(() => {
    let interval;
    if (phase === "live" && sessionData?._id) {
      const fetchMessages = async () => {
        try {
          const res = await api.get(`/telemedicine/${sessionData._id}/chat`, authHeaders);
          if (res.data?.chatMessages) {
            setChatMessages(res.data.chatMessages.map(m => ({
              ...m,
              time: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            })));
          }
        } catch (err) {
          console.error("Chat polling failed:", err);
        }
      };
      
      fetchMessages();
      interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, sessionData?._id, authHeaders]);

  const handleAddMed = () => {
    if (!newMed.name || !newMed.dosage) return;
    setPrescriptions([...prescriptions, { ...newMed, id: Date.now() }]);
    setNewMed({ name: "", dosage: "", frequency: "", duration: "" });
  };

  const handleFinalize = async () => {
    if (!sessionData) return;
    try {
      setIsSaving(true);
      
      // 1. Save Notes to Telemedicine Session
      await api.patch(`/telemedicine/${sessionData._id}/notes`, { doctorNotes: observationNotes }, authHeaders);
      
      // 2. Update Appointment to "completed" and add notes
      if (sessionData.appointmentId) {
        try {
          await api.patch(`/appointments/${sessionData.appointmentId}/complete`, { 
            notes: observationNotes 
          }, authHeaders);
        } catch (appErr) {
          console.error("Failed to mark appointment as complete:", appErr);
          // Non-blocking for the UI but logged
        }
      }

      // 3. Issue Prescription (if any)
      if (prescriptions.length > 0) {
        await api.post("/doctors/prescriptions", {
          patientId: sessionData.patientId,
          patientName: sessionData.patientName,
          appointmentId: sessionData.appointmentId,
          notes: observationNotes,
          medicines: prescriptions.map(p => ({
            name: p.name,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration
          }))
        }, authHeaders);
      }
      
      alert("Summary and prescriptions sent successfully!");
    } catch (err) {
      console.error("Finalization failed:", err);
      const errorDetail = err?.response?.data?.message || err.message || "Unknown error";
      alert(`Failed to save: ${errorDetail}. Check console for details.`);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── UI states ─────────────────────────────────────────────────── */
  if (phase === "error") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center"
        style={{ background: "#0a0f1e" }}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-900/40">
          <span className="material-symbols-outlined text-4xl text-red-400">wifi_off</span>
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">Connection Failed</h2>
        <p className="mb-8 max-w-sm text-center text-sm text-slate-400">{errorMsg}</p>
        <button
          onClick={() => window.close()}
          className="rounded-full bg-red-600 px-8 py-3 font-bold text-white hover:bg-red-700"
        >
          Close Tab
        </button>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center"
        style={{ background: "#0a0f1e" }}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
          <span className="material-symbols-outlined text-4xl text-slate-400">call_end</span>
        </div>
        <h2 className="mb-1 text-2xl font-bold text-white">Call Ended</h2>
        <p className="mb-1 text-slate-400 text-sm">Duration: {fmt(elapsed)}</p>
        <p className="mt-4 text-xs text-slate-600">This tab will close automatically…</p>
      </div>
    );
  }

  /* ── Main video call UI ─────────────────────────────────────────── */
  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden select-none"
      style={{ background: "#0a0f1e" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div
        className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-extrabold tracking-tight text-white">MediFlow</span>
          <span
            className="rounded-full px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest"
            style={{
              background: role === "doctor" ? "rgba(0,106,97,0.55)" : "rgba(139, 92, 246, 0.55)",
              color: role === "doctor" ? "#5efee7" : "#ddd6fe",
              border: role === "doctor" ? "1px solid rgba(0,106,97,0.4)" : "1px solid rgba(139, 92, 246, 0.4)",
            }}
          >
            {role === "doctor" ? "Doctor Console" : "Patient View"}
          </span>
        </div>

        {/* Workspace toggle (only if panel is hidden) */}
        {phase === "live" && !showSidePanel && (
          <button
            onClick={() => setShowSidePanel(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#006566] text-white text-xs font-bold shadow-lg hover:bg-[#004f51] transition-all"
          >
            <span className="material-symbols-outlined text-sm">dock_to_left</span>
            Open Workspace
          </button>
        )}

        {phase === "live" && (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-white/70">
              <span
                className="block h-2 w-2 rounded-full bg-green-400"
                style={{ animation: "pulse 2s infinite" }}
              />
              Live
            </span>
            <span
              className="rounded-full px-3 py-1 font-mono text-sm font-bold text-white/80"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              {fmt(elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* ── Remote video (main area) ──────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Joining spinner */}
        {phase === "joining" && (
          <div className="flex h-full flex-col items-center justify-center gap-5">
            <div
              className="h-14 w-14 rounded-full border-2 border-t-transparent"
              style={{
                borderColor: "rgba(0,106,97,0.3)",
                borderTopColor: "#006a61",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <div className="text-center">
              <p className="text-base font-semibold text-white/80">Connecting…</p>
              <p className="mt-1 text-xs text-slate-500">Setting up your camera and microphone</p>
            </div>
          </div>
        )}

        {/* Waiting for peer */}
        {phase === "live" && !hasRemote && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <span className="material-symbols-outlined text-5xl text-white/20">person</span>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-white/60">Waiting for {peerName}…</p>
              <p className="mt-1 text-xs text-slate-600">They'll appear here when they join</p>
            </div>
          </div>
        )}

        {/* Remote video stream */}
        <div
          ref={remoteDivRef}
          className="h-full w-full"
          style={{ display: hasRemote ? "block" : "none" }}
        />
      </div>

      {/* ── Local video (PiP) ────────────────────────────────────── */}
      {phase === "live" && (
        <div
          className="absolute bottom-28 right-4 z-10 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            width: "clamp(120px, 18vw, 200px)",
            height: "clamp(80px, 13vw, 130px)",
            border: "1.5px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            ref={localDivRef}
            className="h-full w-full bg-slate-900"
            style={{ display: camOff ? "none" : "block" }}
          />
          {camOff && (
            <div className="flex h-full w-full items-center justify-center bg-slate-900">
              <span className="material-symbols-outlined text-3xl text-slate-600">videocam_off</span>
            </div>
          )}
          <div
            className="absolute bottom-1.5 left-2 rounded-sm px-1 text-[9px] font-bold uppercase tracking-wide text-white/50"
            style={{ background: "rgba(0,0,0,0.4)" }}
          >
            You
          </div>
        </div>
      )}

      {/* ── Peer name overlay (top of remote) ────────────────────── */}
      {phase === "live" && hasRemote && (
        <div className="absolute left-4 top-16 z-10">
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
          >
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-sm font-semibold text-white/80">{peerName}</span>
          </div>
        </div>
      )}

      {/* ── Enhanced Side Panel (Doctor & Patient) ───────────────── */}
      {phase === "live" && showSidePanel && (
        <aside className="absolute top-0 right-0 h-full w-[400px] bg-white border-l border-slate-200 z-40 flex flex-col shadow-2xl">
          {/* Panel Tabs (Design Match) */}
          <nav className="flex items-center gap-2 px-4 py-4 border-b border-slate-100 bg-white">
            {[
              { id: "chat", icon: "chat", label: "Chat" },
              { id: "notes", icon: "medical_information", label: role === "doctor" ? "Notes" : "Health" },
              { id: "reports", icon: "description", label: "Reports" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id 
                    ? "bg-[#006566] text-white shadow-lg shadow-teal-900/20" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
            
            <button 
              onClick={() => setShowSidePanel(false)}
              className="ml-auto flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </nav>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === "notes" && (
              <>
                {/* Observation Notes Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">
                      {role === "doctor" ? "Observation Notes" : "Medical Summary"}
                    </h3>
                    {role === "doctor" && (
                      <div className="flex items-center gap-1.5 text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded-full">
                        <span className="material-symbols-outlined text-sm">cloud_done</span>
                        Auto-saved
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    {role === "doctor" ? (
                      <textarea
                        value={observationNotes}
                        onChange={(e) => setObservationNotes(e.target.value)}
                        placeholder="Type observation notes here..."
                        className="w-full min-h-[120px] text-sm text-slate-600 border-none focus:ring-0 p-0 resize-none font-medium"
                      />
                    ) : (
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {observationNotes || "No medical summary available yet."}
                      </p>
                    )}
                    {role === "doctor" && (
                      <div className="pl-3 border-l-2 border-teal-200 italic text-sm text-teal-700/70">
                        Prescription and notes will be shared with the patient.
                      </div>
                    )}
                  </div>
                </section>

                {/* Patient Health Profile (Visible only to Doctor) */}
                {role === "doctor" && patientHealthInfo && (
                  <section className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-600">contact_page</span>
                      <h3 className="text-base font-bold text-slate-800">Patient Health Profile</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {/* Allergies */}
                      <div className="bg-red-50/50 p-3 rounded-xl border border-red-100">
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Allergies</p>
                        {patientHealthInfo.allergies?.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {patientHealthInfo.allergies.map((a, i) => (
                              <span key={i} className="text-xs bg-white text-red-700 px-2 py-0.5 rounded-md border border-red-200 font-semibold">
                                {a.label}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-red-400 italic">No allergies reported</p>
                        )}
                      </div>

                      {/* Medical Conditions */}
                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Conditions</p>
                        {patientHealthInfo.medicalConditions?.length > 0 ? (
                          <div className="space-y-1">
                            {patientHealthInfo.medicalConditions.map((c, i) => (
                              <div key={i} className="text-xs text-amber-900 font-semibold flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                                {c.label}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-400 italic">No conditions reported</p>
                        )}
                      </div>

                      {/* Current Medications */}
                      <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Current Medications</p>
                        {patientHealthInfo.currentMedications?.length > 0 ? (
                          <div className="space-y-1">
                            {patientHealthInfo.currentMedications.map((m, i) => (
                              <div key={i} className="text-xs text-blue-900 font-semibold flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                                {m.label}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-blue-400 italic">No medications reported</p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* E-Prescription Section */}
                <section className="p-5 rounded-3xl border border-[#8BF79D]/30 space-y-4" style={{ backgroundColor: '#8BF79D' }}>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-900" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                    <h3 className="text-base font-bold text-emerald-900">E-Prescription</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {prescriptions.map((p, idx) => (
                      <div key={p.id || idx} className="relative bg-white/95 border border-white/20 rounded-xl px-4 py-3 shadow-md group">
                        {role === "doctor" && (
                          <button 
                            onClick={() => setPrescriptions(prescriptions.filter(x => (x.id || x._id) !== (p.id || p._id)))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        )}
                        <p className="font-bold text-black text-sm">
                          {p.name || (p.medicines && p.medicines[0]?.name) || "Prescription Item"}
                        </p>
                        {p.medicines ? (
                          <div className="space-y-1 mt-1">
                            {p.medicines.map((m, mIdx) => (
                              <p key={mIdx} className="text-[11px] font-bold text-emerald-900">
                                {m.name}: <span className="text-slate-600 font-medium">{m.dosage} • {m.frequency} • {m.duration}</span>
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] font-bold text-emerald-900">
                            {p.dosage} • <span className="text-slate-600 font-medium">{p.frequency} • {p.duration}</span>
                          </p>
                        )}
                      </div>
                    ))}
                    
                    {role === "doctor" && (
                      <div className="space-y-4 pt-3 border-t border-emerald-900/20">
                        {/* Medicine name with suggestions */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Medicine Name (e.g. Paracetamol)"
                            value={newMed.name}
                            onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                            className="w-full text-xs px-3 py-2 bg-white/90 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-900/30 font-bold text-black placeholder:text-slate-500"
                          />
                          {newMed.name.length >= 2 && MEDICINE_SUGGESTIONS.filter(m => m.toLowerCase().includes(newMed.name.toLowerCase()) && m !== newMed.name).length > 0 && (
                            <div 
                              className="absolute z-[100] left-0 right-0 top-full mt-1 border border-slate-200 rounded-xl shadow-xl max-h-40 overflow-y-auto overflow-x-hidden"
                              style={{ backgroundColor: "#ffffff", color: "#334155" }}
                            >
                              {MEDICINE_SUGGESTIONS.filter(m => m.toLowerCase().includes(newMed.name.toLowerCase())).map(m => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setNewMed({ ...newMed, name: m })}
                                  className="w-full text-left px-4 py-2.5 text-xs border-b border-slate-50 last:border-none transition-colors"
                                  style={{ 
                                    backgroundColor: "white", 
                                    color: "#0f172a", 
                                    fontWeight: "bold",
                                    display: "block"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0fdfa"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Dosage Quick Select */}
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 500mg)"
                            value={newMed.dosage}
                            onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                            className="w-full text-xs px-3 py-2 border border-teal-100 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 font-bold selection:bg-teal-100"
                          />
                          <div className="flex flex-wrap gap-1">
                            {COMMON_DOSAGES.map(d => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setNewMed({ ...newMed, dosage: d })}
                                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all"
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Frequency Quick Select */}
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Frequency (e.g. 3x/day)"
                            value={newMed.frequency}
                            onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                            className="w-full text-xs px-3 py-2 border border-teal-100 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 font-bold selection:bg-teal-100"
                          />
                          <div className="flex flex-wrap gap-1">
                            {COMMON_FREQUENCIES.map(f => (
                              <button
                                key={f}
                                type="button"
                                onClick={() => setNewMed({ ...newMed, frequency: f })}
                                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all"
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Duration Quick Select */}
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            placeholder="Duration (e.g. 5 days)"
                            value={newMed.duration}
                            onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                            className="w-full text-xs px-3 py-2 border border-teal-100 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 font-bold selection:bg-teal-100"
                          />
                          <div className="flex flex-wrap gap-1">
                            {COMMON_DURATIONS.map(dur => (
                              <button
                                key={dur}
                                onClick={() => setNewMed({ ...newMed, duration: dur })}
                                className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 hover:border-teal-400 hover:text-teal-600 transition-all"
                              >
                                {dur}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button 
                          onClick={handleAddMed}
                          disabled={!newMed.name || !newMed.dosage}
                          className="w-full py-3 bg-black text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/20 disabled:opacity-50 disabled:shadow-none border border-white/10"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span>
                          Add to Prescription
                        </button>
                      </div>
                    )}

                    {prescriptions.length === 0 && role === "patient" && (
                      <p className="text-xs text-slate-500 italic text-center py-2">No prescriptions yet.</p>
                    )}
                  </div>
                </section>
              </>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-[calc(100vh-220px)]">
                <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                      <span className="material-symbols-outlined text-4xl opacity-20">chat_bubble</span>
                      <p className="text-sm font-medium">No messages yet</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.role === role ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                          msg.role === role ? "bg-teal-600 text-white shadow-sm" : "bg-slate-100 text-slate-700 shadow-sm"
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">{msg.time}</span>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Chat input stays at the bottom */}
                <div className="mt-2 flex gap-2 p-1 bg-white border-t border-slate-50 pt-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type message..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all text-slate-700"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    disabled={!newMessage.trim()}
                    className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center min-w-[48px] shadow-md shadow-teal-600/20"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "reports" && (
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 px-1">Shared Files (2)</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group cursor-pointer hover:border-teal-200 transition-all">
                    <div className="w-10 h-10 bg-red-50 flex items-center justify-center rounded-xl text-red-500">
                      <span className="material-symbols-outlined">picture_as_pdf</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-700 truncate">Blood_Test_Result_Oct.pdf</p>
                      <p className="text-[10px] text-slate-400 font-medium">Shared 5m ago • 1.2 MB</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-lg group-hover:text-teal-500">visibility</span>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group cursor-pointer hover:border-teal-200 transition-all">
                    <div className="w-10 h-10 bg-blue-50 flex items-center justify-center rounded-xl text-blue-500">
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-bold text-slate-700 truncate">Patient_History_Summary.docx</p>
                      <p className="text-[10px] text-slate-400 font-medium">System generated • 840 KB</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-lg group-hover:text-teal-500">download</span>
                  </div>
                </div>

                <div className="mt-6 border-2 border-dashed border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-teal-200 transition-all cursor-pointer group">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-teal-50 transition-all">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-teal-600">upload_file</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600">Drag or click to upload report</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-widest">PDF, JPG up to 10MB</p>
                </div>
              </section>
            )}
          </div>

          {/* Footer Action */}
          {role === "doctor" && phase === "live" && (
            <div className="p-5 border-t border-slate-100 bg-slate-50/30">
              <button 
                onClick={handleFinalize}
                disabled={isSaving}
                className="w-full py-4 text-black font-black rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-black/10 shadow-lg shadow-[#78F1FF]/20"
                style={{ backgroundColor: '#78F1FF' }}
              >
                {isSaving ? (
                  <div className="spinner-small border-black" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg font-bold">verified</span>
                    Finalize & Send Summary
                  </>
                )}
              </button>
            </div>
          )}
        </aside>
      )}

      {/* ── Control bar ──────────────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 pb-10 pt-16"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)" }}
      >
        {/* Mic toggle */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={phase !== "live"}
          title={micMuted ? "Unmute microphone" : "Mute microphone"}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-all disabled:opacity-30"
          style={{
            background: micMuted ? "#dc2626" : "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => { if (!micMuted) e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { if (!micMuted) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
        >
          <span className="material-symbols-outlined text-xl text-white">
            {micMuted ? "mic_off" : "mic"}
          </span>
        </button>

        {/* Camera toggle */}
        <button
          type="button"
          onClick={toggleCam}
          disabled={phase !== "live"}
          title={camOff ? "Turn on camera" : "Turn off camera"}
          className="flex h-14 w-14 items-center justify-center rounded-full transition-all disabled:opacity-30"
          style={{
            background: camOff ? "#dc2626" : "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => { if (!camOff) e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={(e) => { if (!camOff) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
        >
          <span className="material-symbols-outlined text-xl text-white">
            {camOff ? "videocam_off" : "videocam"}
          </span>
        </button>

        {/* End call */}
        <button
          type="button"
          onClick={leaveCall}
          title="End call"
          className="flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
          style={{ background: "#dc2626" }}
        >
          <span className="material-symbols-outlined text-2xl text-white">call_end</span>
        </button>
      </div>

      {/* Keyframe animations via inline style tag */}
      <style>{`
        /* Global resets for the component */
        * {
          -webkit-tap-highlight-color: transparent;
        }
        ::selection {
          background-color: rgba(20, 184, 166, 0.2); /* Teal 500 with opacity */
          color: inherit;
        }
        input:focus, textarea:focus, select:focus, button:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.2) !important;
        }
        
        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(0, 101, 102, 0.2);
          border-top-color: #006566;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
      `}</style>
    </div>
  );
}
