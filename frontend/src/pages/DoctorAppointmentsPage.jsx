import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import AppointmentDateRangePicker from "../components/AppointmentDateRangePicker";
import ConfirmDialog from "../components/ConfirmDialog";
import InfoDialog from "../components/InfoDialog";
import { useAuth } from "../context/AuthContext";

/** Opens the Agora video call room in a new tab. Creates a session if needed. */
async function openVideoCall({ appt, authHeaders, user }) {
  try {
    // Try to get existing session for this appointment
    let roomId = null;
    try {
      const existRes = await api.get(`/telemedicine/by-appointment/${appt._id}`, authHeaders);
      roomId = existRes.data?.session?.roomId || null;
    } catch {
      roomId = null;
    }

    if (!roomId) {
      // Create a new session
      const createRes = await api.post(
        "/telemedicine",
        {
          appointmentId: String(appt._id),
          patientId: appt.patientId || "",
          patientName: appt.patientName || "Patient",
        },
        authHeaders
      );
      roomId = createRes.data?.session?.roomId;
    }

    if (!roomId) throw new Error("Could not obtain video room.");

    const peer = encodeURIComponent(appt.patientName || "Patient");
    window.open(`/video-call?channel=${roomId}&role=doctor&peer=${peer}`, "_blank");
  } catch (err) {
    alert(err?.response?.data?.message || err.message || "Could not start video call.");
  }
}

const PAGE_SIZE = 10;

function formatBloodType(bt) {
    if (!bt) return "—";
    const s = String(bt).trim();
    if (/positive|negative/i.test(s)) return s;
    if (s.includes("+")) return s.replace(/\s*\+\s*$/, "") + "+ Positive";
    if (s.includes("-")) return s.replace(/\s*-\s*$/, "") + "- Negative";
    return s;
}

function formatStatusLabel(status) {
    if (!status) return "";
    const s = String(status).toLowerCase();
    if (s === "accepted") return "Confirmed";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseApptDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplayDate(dateStr) {
    const d = parseApptDate(dateStr);
    if (!d) return dateStr || "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Normalize appointment date to YYYY-MM-DD for comparison */
function toDateKey(dateStr) {
    if (!dateStr) return null;
    const s = String(dateStr).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function formatShortDate(isoYmd) {
    if (!isoYmd) return "";
    const d = new Date(`${isoYmd}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoYmd;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function appointmentDateKeys(apps) {
    const keys = apps
        .map((a) => toDateKey(a.date))
        .filter(Boolean)
        .sort();
    return keys;
}

function matchesDateFilter(apptDate, fromYmd, toYmd) {
    const key = toDateKey(apptDate);
    if (!key) return true;
    if (fromYmd && key < fromYmd) return false;
    if (toYmd && key > toYmd) return false;
    return true;
}

function estimateEndTime(timeStr, durationMins) {
    if (!timeStr || !durationMins) return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ap = match[3]?.toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const total = h * 60 + m + durationMins;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    const isPm = nh >= 12;
    const h12 = nh % 12 || 12;
    const ampm = isPm ? "PM" : "AM";
    return `${h12}:${String(nm).padStart(2, "0")} ${ampm}`;
}

function getStatusBadgeClass(status) {
    const s = String(status || "").toLowerCase();
    if (s === "pending") return "bg-amber-100 text-amber-900 border-amber-200";
    if (s === "accepted" || s === "confirmed" || s === "active") return "bg-[#CBF79D] text-[#043927] border-[#043927]/10";
    if (s === "completed") return "bg-emerald-100 text-emerald-900 border-emerald-200";
    if (s === "cancelled" || s === "rejected") return "bg-red-100 text-red-900 border-red-200";
    return "bg-slate-100 text-slate-900 border-slate-200";
}

export default function DoctorAppointmentsPage() {
    const { authHeaders, user } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [statusError, setStatusError] = useState(null);

    const fetchAppointments = () => {
        setLoading(true);
        api.get("/appointments/doctor", authHeaders)
            .then((res) => setAppointments(res.data.appointments || []))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchAppointments();
    }, [authHeaders]);

    useEffect(() => {
        setPage(1);
    }, [activeTab, searchQuery, filterDateFrom, filterDateTo]);

    const handleStatusUpdate = async (id, action) => {
        try {
            setStatusError(null);
            await api.patch(`/appointments/${id}/${action}`, {}, authHeaders);
            fetchAppointments();
        } catch (err) {
            console.error(err);
            setStatusError("Failed to update status. Please try again.");
        }
    };

    const filteredAppointments = appointments.filter((appt) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            appt.patientName?.toLowerCase().includes(q) ||
            appt.reason?.toLowerCase().includes(q) ||
            appt.patientId?.toLowerCase().includes(q);
        const matchesDate = matchesDateFilter(appt.date, filterDateFrom, filterDateTo);

        switch (activeTab) {
            case "upcoming":
                return (
                    (appt.status === "pending" ||
                        appt.status === "accepted" ||
                        appt.status === "confirmed") &&
                    matchesSearch &&
                    matchesDate
                );
            case "pending":
                return appt.status === "pending" && matchesSearch && matchesDate;
            case "completed":
                return appt.status === "completed" && matchesSearch && matchesDate;
            case "cancelled":
                return (
                    (appt.status === "cancelled" || appt.status === "rejected") &&
                    matchesSearch &&
                    matchesDate
                );
            default:
                return matchesSearch && matchesDate;
        }
    });

    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginatedAppointments = filteredAppointments.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    const dateRangeSummary = useMemo(() => {
        if (filterDateFrom && filterDateTo) return `${formatShortDate(filterDateFrom)} - ${formatShortDate(filterDateTo)}`;
        if (filterDateFrom) return `From ${formatShortDate(filterDateFrom)}`;
        if (filterDateTo) return `Until ${formatShortDate(filterDateTo)}`;
        return "All dates";
    }, [filterDateFrom, filterDateTo]);

    const counts = {
        upcoming: appointments.filter(a => ["pending", "accepted", "confirmed"].includes(a.status?.toLowerCase())).length,
        pending: appointments.filter(a => a.status === "pending").length,
        completed: appointments.filter(a => a.status === "completed").length,
        cancelled: appointments.filter(a => ["cancelled", "rejected"].includes(a.status?.toLowerCase())).length,
    };

    const appointmentFilterTabs = [
        { id: "upcoming", label: "Active Schedule", count: counts.upcoming, active: "bg-[#043927] text-white shadow-xl shadow-[#043927]/20", idle: "bg-white text-[#043927]/60 hover:bg-[#CBF79D]/10" },
        { id: "pending", label: "Patient Requests", count: counts.pending, active: "bg-amber-500 text-white shadow-xl shadow-amber-500/20", idle: "bg-white text-[#043927]/60 hover:bg-amber-50" },
        { id: "completed", label: "Clinical History", count: counts.completed, active: "bg-[#437A00] text-white shadow-xl shadow-[#437A00]/20", idle: "bg-white text-[#043927]/60 hover:bg-[#CBF79D]/10" },
        { id: "cancelled", label: "Archived", count: counts.cancelled, active: "bg-red-600 text-white shadow-xl shadow-red-600/20", idle: "bg-white text-[#043927]/60 hover:bg-red-50" },
    ];

    return (
        <DoctorShell>
            <div className="max-w-6xl mx-auto space-y-10 p-2 md:p-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CBF79D]/20 text-[#437A00] text-[9px] font-bold uppercase tracking-widest border border-[#CBF79D]/30">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#437A00] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#437A00]"></span>
                            </span>
                            Clinical Operations
                        </div>
                        <h1 className="text-2xl font-headline font-black text-[#043927]">Appointment Center</h1>
                        <p className="text-[#043927]/50 font-medium text-sm">Manage your clinical sessions and virtual consultations.</p>
                    </div>
                </div>

                {statusError && (
                    <div className="mx-4 flex items-center gap-3 bg-red-50 text-red-600 px-6 py-4 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-4">
                        <span className="material-symbols-outlined text-xl">error_outline</span>
                        <span className="text-xs font-bold flex-1">{statusError}</span>
                        <button onClick={() => setStatusError(null)} className="p-2 hover:bg-red-100 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                )}

                <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-2xl shadow-[#043927]/5 border border-[#356600]/5 space-y-8">
                    <div className="flex flex-wrap gap-3 p-1.5 bg-[#fcfdfa] border border-[#356600]/10 rounded-[2.5rem]">
                        {appointmentFilterTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    activeTab === tab.id ? tab.active : tab.idle
                                }`}
                            >
                                {tab.label}
                                {tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#043927]/10 text-[#043927]'}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                        <div className="lg:col-span-5 space-y-3">
                            <label className="text-[10px] font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1">Search Directory</label>
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#CBF79D]/10 rounded-xl flex items-center justify-center text-[#437A00] transition-colors group-focus-within:bg-[#CBF79D]/30">
                                    <span className="material-symbols-outlined text-2xl">search</span>
                                </div>
                                <input
                                    type="search"
                                    placeholder="Patient name, ID, or phone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#fcfdfa] border border-[#356600]/10 rounded-2xl pl-20 pr-8 py-5 text-[#043927] font-bold focus:ring-4 focus:ring-[#CBF79D]/30 focus:border-[#437A00]/40 focus:outline-none transition-all shadow-sm placeholder-[#043927]/30"
                                />
                            </div>
                        </div>
                        <div className="lg:col-span-7 space-y-3">
                            <label className="text-[10px] font-black text-[#043927]/60 uppercase tracking-[0.15em] ml-1 flex justify-between items-center">
                                Date Parameters
                                <span className="text-[9px] lowercase font-bold italic opacity-60">Filtered: {dateRangeSummary}</span>
                            </label>
                            <AppointmentDateRangePicker
                                fromYmd={filterDateFrom}
                                toYmd={filterDateTo}
                                onChange={({ from, to }) => {
                                    setFilterDateFrom(from);
                                    setFilterDateTo(to);
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border border-[#356600]/5">
                                <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#CBF79D]/30 border-t-[#437A00]"></div>
                                <p className="mt-4 text-[#043927]/40 font-bold uppercase tracking-widest text-[10px]">Accessing clinical database...</p>
                            </div>
                        ) : filteredAppointments.length === 0 ? (
                            <div className="bg-white p-20 rounded-[3rem] text-center border border-[#356600]/5 shadow-xl shadow-[#043927]/5">
                                <div className="w-24 h-24 bg-[#fcfdfa] rounded-[2.5rem] flex items-center justify-center text-[#043927]/10 mx-auto mb-8">
                                    <span className="material-symbols-outlined text-6xl text-slate-200">event_busy</span>
                                </div>
                                <h4 className="text-lg font-headline font-black text-[#043927]">No records match</h4>
                                <p className="text-[#043927]/40 font-medium max-w-sm mx-auto mt-2 italic text-xs">Adjust your filters or search parameters to locate specific clinical sessions.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {paginatedAppointments.map((appt) => (
                                    <AppointmentRow
                                        key={appt._id}
                                        appt={appt}
                                        onStatusUpdate={handleStatusUpdate}
                                        authHeaders={authHeaders}
                                        user={user}
                                    />
                                ))}
                            </div>
                        )}

                        {!loading && filteredAppointments.length > PAGE_SIZE && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] border border-[#356600]/5 shadow-lg shadow-[#043927]/5 mx-2">
                                <span className="text-xs font-black text-[#043927]/40 uppercase tracking-widest">
                                    Records {(safePage - 1) * PAGE_SIZE + 1} - {Math.min(safePage * PAGE_SIZE, filteredAppointments.length)} of {filteredAppointments.length}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        disabled={safePage <= 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="w-12 h-12 rounded-xl border border-[#356600]/10 flex items-center justify-center text-[#043927] hover:bg-[#CBF79D] transition-all disabled:opacity-30"
                                    >
                                        <span className="material-symbols-outlined">chevron_left</span>
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setPage(n)}
                                            className={`w-12 h-12 rounded-xl text-[10px] font-black transition-all ${
                                                n === safePage ? 'bg-[#043927] text-white shadow-lg' : 'bg-[#fcfdfa] text-[#043927] border border-[#356600]/10 hover:bg-[#CBF79D]/30'
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                    <button
                                        disabled={safePage >= totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        className="w-12 h-12 rounded-xl border border-[#356600]/10 flex items-center justify-center text-[#043927] hover:bg-[#CBF79D] transition-all disabled:opacity-30"
                                    >
                                        <span className="material-symbols-outlined">chevron_right</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="fixed bottom-10 right-10 z-50">
                    <button className="group w-16 h-16 rounded-[1.5rem] bg-[#043927] text-white flex items-center justify-center shadow-2xl shadow-[#043927]/40 hover:bg-[#437A00] transition-all hover:scale-110 active:scale-90">
                        <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform duration-500">add_task</span>
                    </button>
                </div>
            </div>
        </DoctorShell>
    );
}

function AppointmentRow({ appt, onStatusUpdate, authHeaders, user }) {
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const status = String(appt.status || "").toLowerCase();
    const isCancelled = ["cancelled", "rejected"].includes(status);
    const isPending = status === "pending";
    const isAccepted = ["accepted", "confirmed", "active"].includes(status);
    const isCompleted = status === "completed";
    const isOnline = String(appt.appointmentType || "").toLowerCase() === "online";

    const handleStartVideoCall = async () => {
        setVideoLoading(true);
        await openVideoCall({ appt, authHeaders, user });
        setVideoLoading(false);
    };

    const durationMinsNum = typeof appt.durationMins === "number" ? appt.durationMins : parseInt(String(appt.duration).replace(/\D/g, ""), 10) || 30;
    const endDisplay = appt.endTime || estimateEndTime(appt.time, durationMinsNum) || "—";
    const visitReasonText = String(appt.reason || "").trim() || String(appt.notes || "").trim() || "";

    return (
        <Fragment>
            <article className={`bg-white p-6 rounded-[2rem] shadow-xl shadow-[#043927]/5 border border-[#356600]/5 transition-all duration-300 hover:shadow-2xl hover:shadow-[#043927]/10 ${isCancelled ? 'opacity-60' : ''}`}>
                <div className="flex flex-col lg:flex-row gap-6 items-center">
                    <div className="flex-1 flex items-center gap-4 min-w-[260px]">
                        <div className="relative group flex-shrink-0">
                            <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#CBF79D]/40 shadow-sm bg-[#f1f5f9]">
                                <img
                                    src={appt.patientImage || "/default-profile-avatar.png"}
                                    alt="Patient"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    onError={(e) => { e.currentTarget.src = "/default-profile-avatar.png"; }}
                                />
                            </div>
                            <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-white border border-gray-100 shadow flex items-center justify-center ${isOnline ? 'text-violet-600' : 'text-[#437A00]'}`}>
                                <span className="material-symbols-outlined text-sm">{isOnline ? 'videocam' : 'local_hospital'}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <h4 className="text-base font-headline font-black text-[#043927]">{appt.patientName || "Anonymous Patient"}</h4>
                                {isOnline && <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[8px] font-black uppercase tracking-widest rounded-lg border border-violet-200">Digital</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-[9px] font-black text-[#043927]/40 uppercase tracking-widest">
                                <div className="flex items-center gap-1.5 bg-[#fcfdfa] px-3 py-1 rounded-lg border border-[#356600]/5">
                                    <span className="material-symbols-outlined text-[14px]">person</span> {appt.patientAge || "—"} Years
                                </div>
                                <div className="flex items-center gap-1.5 bg-[#fcfdfa] px-3 py-1 rounded-lg border border-[#356600]/5">
                                    <span className="material-symbols-outlined text-[14px]">family_restroom</span> {appt.patientGender || "—" }
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center gap-5 px-6 border-x border-[#356600]/5">
                        <div className="w-11 h-11 rounded-xl bg-[#CBF79D] flex items-center justify-center text-[#043927] shadow-sm flex-shrink-0">
                            <span className="material-symbols-outlined text-xl">{isCancelled ? 'event_busy' : 'schedule'}</span>
                        </div>
                        <div>
                            <p className={`text-base font-black ${isCancelled ? 'text-[#043927]/30 line-through' : 'text-[#043927]'}`}>{appt.time || "—"} - {endDisplay}</p>
                            <p className="text-[10px] font-bold text-[#437A00] uppercase tracking-widest mt-1">{formatDisplayDate(appt.date)}</p>
                        </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-3 min-w-[240px] justify-end">
                        <button onClick={() => setReasonDialogOpen(true)} className="w-9 h-9 rounded-xl border border-[#356600]/10 flex items-center justify-center text-[#043927]/60 hover:bg-[#CBF79D]/30 transition-colors shadow-sm"><span className="material-symbols-outlined text-[18px]">description</span></button>
                        <div className="flex flex-col items-end gap-3">
                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${getStatusBadgeClass(status)}`}>{formatStatusLabel(status)}</div>
                            <div className="flex items-center gap-2">
                                {isAccepted && !isCompleted && (
                                    isOnline ? (
                                        <button onClick={handleStartVideoCall} disabled={videoLoading} className="inline-flex items-center justify-center gap-2.5 bg-[#437A00] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#043927] transition-all shadow-lg shadow-[#437A00]/20 disabled:opacity-50">
                                            <span className="material-symbols-outlined text-base">{videoLoading ? 'hourglass_top' : 'sensors'}</span> {videoLoading ? 'Connecting...' : 'Join'}
                                        </button>
                                    ) : (
                                        <button onClick={() => setConfirmDialog({ title: "Clinical Completion", message: `Verify session completion for ${appt.patientName || "this patient"}?`, action: "complete", confirmLabel: "Complete Visit", variant: "primary" })} className="bg-[#043927] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#437A00] transition-all shadow-lg shadow-[#043927]/20">Verify Visit</button>
                                    )
                                )}
                                {isPending && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setConfirmDialog({ title: "Accept Appointment", message: `Add ${appt.patientName || "this patient"} to your schedule?`, action: "accept", confirmLabel: "Confirm Session", variant: "primary" })} className="bg-[#CBF79D] text-[#043927] px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all">Confirm</button>
                                        <button onClick={() => setConfirmDialog({ title: "Decline Session", message: `Reject appointment request from ${appt.patientName || "this patient"}?`, action: "reject", confirmLabel: "Decline", variant: "danger" })} className="w-9 h-9 rounded-xl border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"><span className="material-symbols-outlined text-[18px]">close</span></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </article>

            <InfoDialog open={reasonDialogOpen} title="Clinical Presentation" onClose={() => setReasonDialogOpen(false)}>
                <div className="p-6 bg-[#fcfdfa] rounded-[2rem] border border-[#356600]/10">
                    <p className="text-[#043927] font-medium leading-relaxed whitespace-pre-wrap">{visitReasonText || "No session reason provided."}</p>
                </div>
            </InfoDialog>

            <ConfirmDialog
                open={!!confirmDialog}
                title={confirmDialog?.title}
                message={confirmDialog?.message}
                confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
                cancelLabel="Cancel"
                variant={confirmDialog?.variant ?? "primary"}
                onConfirm={() => { onStatusUpdate(appt._id, confirmDialog.action); setConfirmDialog(null); }}
                onCancel={() => setConfirmDialog(null)}
            />
        </Fragment>
    );
}
