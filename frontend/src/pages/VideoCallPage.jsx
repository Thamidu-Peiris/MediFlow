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
  const [prescriptions, setPrescriptions] = useState([
    { id: 1, name: "Ferrous Sulfate (Iron Supplement)", dosage: "65 mg", frequency: "Once Daily" }
  ]);
  const [observationNotes, setObservationNotes] = useState("Patient reports persistent fatigue and occasional dizziness for the last 3 weeks. Symptoms seem to worsen in the late afternoon. No history of cardiovascular issues.");

  /* ── state ─────────────────────────────────────────────────────── */
  const [phase,      setPhase]      = useState("idle");   // idle | joining | live | ended | error
  const [errorMsg,   setErrorMsg]   = useState("");
  const [hasRemote,  setHasRemote]  = useState(false);
  const [micMuted,   setMicMuted]   = useState(false);
  const [camOff,     setCamOff]     = useState(false);
  const [elapsed,    setElapsed]    = useState(0);

  /* ── refs ──────────────────────────────────────────────────────── */
  const clientRef        = useRef(null);
  const audioTrackRef    = useRef(null);
  const videoTrackRef    = useRef(null);
  const localDivRef      = useRef(null);
  const remoteDivRef     = useRef(null);
  const timerRef         = useRef(null);

  /* ── init call ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!channel) {
      setErrorMsg("No call channel specified.");
      setPhase("error");
      return;
    }

    let cancelled = false;
    setPhase("joining");

    (async () => {
      try {
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
      clearInterval(timerRef.current);
      audioTrackRef.current?.close();
      videoTrackRef.current?.close();
      clientRef.current?.leave().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

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

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      text: newMessage,
      role: role,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages([...chatMessages, msg]);
    setNewMessage("");
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
              background: role === "doctor" ? "rgba(0,106,97,0.55)" : "rgba(124,58,237,0.55)",
              color: role === "doctor" ? "#5efee7" : "#d8b4fe",
              border: role === "doctor" ? "1px solid rgba(0,106,97,0.4)" : "1px solid rgba(124,58,237,0.4)",
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
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded-full">
                      <span className="material-symbols-outlined text-sm">cloud_done</span>
                      Auto-saved 14:22
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {observationNotes}
                    </p>
                    <div className="pl-3 border-l-2 border-teal-200 italic text-sm text-teal-700/70">
                      Advised blood panel focusing on iron levels and Vitamin D.
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-50">
                      <span className="px-2 py-1 bg-slate-100 text-[10px] rounded font-bold text-slate-500 uppercase tracking-tight">Fatigue</span>
                      <span className="px-2 py-1 bg-slate-100 text-[10px] rounded font-bold text-slate-500 uppercase tracking-tight">Routine Follow-up</span>
                    </div>
                  </div>
                </section>

                {/* E-Prescription Section */}
                <section className="bg-teal-50/30 p-5 rounded-3xl border border-teal-100/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-teal-600" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                    <h3 className="text-base font-bold text-teal-900">E-Prescription</h3>
                  </div>
                  
                  <div className="space-y-4">
                    {prescriptions.map((p) => (
                      <div key={p.id} className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-teal-700/60 uppercase ml-1 tracking-wider">Medicine Name</label>
                          <div className="bg-white border border-teal-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700">
                            {p.name}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-teal-700/60 uppercase ml-1 tracking-wider">Dosage</label>
                            <div className="bg-white border border-teal-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700">
                              {p.dosage}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-teal-700/60 uppercase ml-1 tracking-wider">Frequency</label>
                            <div className="bg-white border border-teal-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700">
                              {p.frequency}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {role === "doctor" && (
                      <button className="w-full py-3 bg-teal-700 text-white rounded-2xl text-xs font-bold hover:bg-teal-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/10">
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add Another Medication
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-[calc(100vh-180px)]">
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                      <span className="material-symbols-outlined text-4xl opacity-20">chat_bubble</span>
                      <p className="text-sm font-medium">No messages yet</p>
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.role === role ? "items-end" : "items-start"}`}>
                        <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                          msg.role === role ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700"
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type message..."
                    className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all"
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
          <div className="p-5 border-t border-slate-100 bg-slate-50/30">
            <button className="w-full py-4 bg-teal-100/50 text-teal-800 font-bold rounded-2xl hover:bg-teal-100 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
              Finalize & Send Summary
            </button>
          </div>
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
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
      `}</style>
    </div>
  );
}
