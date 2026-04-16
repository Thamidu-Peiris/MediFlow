import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

export default function TelemedicinePage() {
    const { authHeaders, user } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRoom, setActiveRoom] = useState(null);

    // Create form
    const [createForm, setCreateForm] = useState({ appointmentId: "", patientId: "", patientName: "" });

    const fetchSessions = () => {
        setLoading(true);
        api.get("/telemedicine/my", authHeaders)
            .then((res) => setSessions(res.data.sessions || []))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchSessions();
        // eslint-disable-next-line
    }, [authHeaders]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post("/telemedicine", createForm, authHeaders);
            setCreateForm({ appointmentId: "", patientId: "", patientName: "" });
            fetchSessions();
        } catch (err) {
            alert("Failed to create session");
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === "start" || action === "end") {
                await api.patch(`/telemedicine/${id}/${action}`, {}, authHeaders);
                fetchSessions();
            }
        } catch (err) {
            alert(`Failed to ${action} session`);
        }
    };

    const joinVideoCall = (session) => {
        const peerName = encodeURIComponent(session.patientName || "Patient");
        const videoCallUrl = `/video-call?channel=${session.roomId}&role=doctor&peer=${peerName}`;
        window.open(videoCallUrl, '_blank');
    };

    if (activeRoom) {
        return (
            <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#111" }}>
                <div style={{ background: "#222", color: "#fff", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Telemedicine Session</h2>
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", opacity: 0.7 }}>Room ID: {activeRoom}</p>
                    </div>
                    <button
                        onClick={() => setActiveRoom(null)}
                        style={{ padding: "0.5rem 1rem", background: "#e74c3c", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}
                    >
                        Leave Video
                    </button>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        color: "#ffffff",
                        textAlign: "center"
                    }}>
                        <div style={{
                            background: "rgba(255,255,255,0.1)",
                            padding: "2rem",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.2)",
                            maxWidth: "400px"
                        }}>
                            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem" }}>In Video Call</h3>
                            <p style={{ margin: "0 0 1.5rem 0", opacity: 0.8 }}>
                                You are currently conducting a video consultation.
                            </p>
                            <p style={{ fontSize: "0.9rem", opacity: 0.6 }}>
                                Room ID: <strong>{activeRoom}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <DoctorShell>
            <div className="max-w-6xl mx-auto space-y-10 p-2 md:p-4">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CBF79D]/20 text-[#437A00] text-[10px] font-bold uppercase tracking-widest border border-[#CBF79D]/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#437A00] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#437A00]"></span>
                            </span>
                            Live Telemedicine Hub
                        </div>
                        <h1 className="text-4xl font-headline font-black text-[#043927] tracking-tight">Virtual Consultations</h1>
                        <p className="text-[#043927]/50 font-medium text-lg">Manage and conduct secure video sessions with patients.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: Create Session Card (5/12) */}
                    <div className="lg:col-span-5">
                        <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-[#043927]/5 border border-[#356600]/5 sticky top-8">
                            <div className="flex items-center gap-4 mb-10 pb-4 border-b border-[#356600]/10">
                                <div className="w-12 h-12 rounded-2xl bg-[#CBF79D] flex items-center justify-center text-[#043927] shadow-sm">
                                    <span className="material-symbols-outlined text-3xl">video_call</span>
                                </div>
                                <div>
                                    <h3 className="text-xl font-headline font-black text-[#043927]">Initiate Session</h3>
                                    <p className="text-xs font-bold text-[#437A00] uppercase tracking-wider">Start Virtual Meeting</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Patient Identity (ID)</label>
                                    <input 
                                        type="text" 
                                        value={createForm.patientId} 
                                        onChange={e => setCreateForm({ ...createForm, patientId: e.target.value })} 
                                        required 
                                        placeholder="Enter Patient unique ID"
                                        className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Patient Full Name</label>
                                    <input 
                                        type="text" 
                                        value={createForm.patientName} 
                                        onChange={e => setCreateForm({ ...createForm, patientName: e.target.value })} 
                                        placeholder="Full legal name"
                                        className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Appointment Reference</label>
                                    <input 
                                        type="text" 
                                        value={createForm.appointmentId} 
                                        onChange={e => setCreateForm({ ...createForm, appointmentId: e.target.value })} 
                                        placeholder="Ref ID (Optional)"
                                        className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl px-6 py-4 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm"
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    className="group w-full relative flex items-center justify-center gap-4 bg-[#043927] text-white font-black px-12 py-5 rounded-[2rem] hover:bg-[#437A00] transition-all duration-300 active:scale-95 shadow-2xl shadow-[#043927]/20"
                                >
                                    <span className="material-symbols-outlined text-2xl transition-transform group-hover:scale-110 group-hover:rotate-12">add_circle</span>
                                    <span className="tracking-wide">Create Clinical Room</span>
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Sessions List (7/12) */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center justify-between px-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#437A00]">history</span>
                                <h3 className="text-xl font-headline font-black text-[#043927]">Active & Recent Sessions</h3>
                            </div>
                            <span className="px-3 py-1 bg-white border border-[#356600]/10 rounded-full text-[10px] font-black text-[#043927]/40 uppercase tracking-widest">
                                {sessions.length} Found
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border border-[#356600]/5">
                                <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#CBF79D]/30 border-t-[#437A00]"></div>
                                <p className="mt-4 text-[#043927]/40 font-bold uppercase tracking-widest text-xs">Fetching sessions...</p>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border border-[#356600]/5 text-center">
                                <div className="w-20 h-20 bg-[#fcfdfa] rounded-[2rem] flex items-center justify-center text-[#043927]/20 mb-6">
                                    <span className="material-symbols-outlined text-5xl">no_accounts</span>
                                </div>
                                <h4 className="text-xl font-headline font-black text-[#043927]">No active sessions</h4>
                                <p className="text-sm text-[#043927]/40 font-medium max-w-xs mt-2 italic">Initiate a clinical room on the left to start consulting patients virtually.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {sessions.map((s) => (
                                    <article 
                                        key={s._id} 
                                        className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-[#043927]/5 border border-[#356600]/5 transition-all duration-300 hover:shadow-2xl hover:shadow-[#043927]/10 hover:-translate-y-1 group"
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-2xl bg-[#CBF79D] flex items-center justify-center text-[#043927] shadow-sm transition-colors">
                                                    <span className="material-symbols-outlined text-3xl">
                                                        {s.status === 'active' ? 'sensors' : s.status === 'ended' ? 'video_chat' : 'pending'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-headline font-black text-[#043927] group-hover:text-[#437A00] transition-colors">
                                                        {s.patientName || s.patientId}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="material-symbols-outlined text-[14px] text-[#043927]/30">schedule</span>
                                                        <p className="text-[10px] font-bold text-[#043927]/40 uppercase tracking-widest italic">
                                                            {new Date(s.createdAt).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                s.status === 'active' ? 'bg-[#CBF79D] text-[#043927] border-[#043927]/10' : 
                                                s.status === 'ended' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                                                'bg-amber-100 text-amber-900 border-amber-200'
                                            }`}>
                                                {s.status}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-[#356600]/5">
                                            {s.status === "waiting" && (
                                                <button 
                                                    onClick={() => handleAction(s._id, "start")} 
                                                    className="inline-flex items-center gap-2 bg-[#437A00] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-[#043927] transition-all shadow-lg shadow-[#437A00]/20"
                                                >
                                                    <span className="material-symbols-outlined text-lg">play_circle</span>
                                                    Start Session
                                                </button>
                                            )}

                                            {(s.status === "waiting" || s.status === "active") && (
                                                <button 
                                                    onClick={() => joinVideoCall(s)} 
                                                    className="inline-flex items-center gap-2 bg-[#CBF79D] text-[#043927] px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-lg">video_call</span>
                                                    Join Video Call
                                                </button>
                                            )}

                                            {s.status === "active" && (
                                                <button 
                                                    onClick={() => handleAction(s._id, "end")} 
                                                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-red-600 border border-red-100 hover:bg-red-50 transition-all ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-lg">call_end</span>
                                                    End
                                                </button>
                                            )}
                                        </div>

                                        <div className="mt-6 p-4 bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#437A00]/40">
                                                    <span className="material-symbols-outlined text-lg">link</span>
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-[9px] font-black text-[#043927]/40 uppercase tracking-widest">Shareable Room ID</p>
                                                    <p className="text-xs font-bold text-[#437A00] truncate">{s.roomId}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/telemedicine/${s.roomId}`);
                                                    // Optional: add a toast here
                                                }}
                                                className="p-2 hover:bg-[#CBF79D]/20 rounded-lg text-[#437A00] transition-colors"
                                                title="Copy Room Link"
                                            >
                                                <span className="material-symbols-outlined text-xl">content_copy</span>
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DoctorShell>
    );
}
