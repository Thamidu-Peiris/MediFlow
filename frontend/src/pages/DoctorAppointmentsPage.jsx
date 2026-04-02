import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

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
    if (status === "accepted") return "Confirmed";
    return status.charAt(0).toUpperCase() + status.slice(1);
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

function formatDateRangeLabel(appointments) {
    const dates = appointments
        .map((a) => parseApptDate(a.date))
        .filter(Boolean)
        .sort((a, b) => a - b);
    if (dates.length === 0) return "—";
    const start = dates[0];
    const end = dates[dates.length - 1];
    const opts = { month: "short", day: "numeric", year: "numeric" };
    if (start.getTime() === end.getTime()) return start.toLocaleDateString("en-US", opts);
    return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
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

export default function DoctorAppointmentsPage() {
    const { authHeaders } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [viewMode, setViewMode] = useState("list");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [page, setPage] = useState(1);

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
    }, [activeTab, searchQuery, filterType]);

    const handleStatusUpdate = async (id, action) => {
        try {
            await api.patch(`/appointments/${id}/${action}`, {}, authHeaders);
            fetchAppointments();
        } catch (err) {
            alert("Failed to update status");
        }
    };

    const filteredAppointments = appointments.filter((appt) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            appt.patientName?.toLowerCase().includes(q) ||
            appt.reason?.toLowerCase().includes(q) ||
            appt.patientId?.toLowerCase().includes(q);
        const matchesType =
            filterType === "all" ||
            (filterType === "video" && appt.type?.toLowerCase().includes("video")) ||
            (filterType === "inperson" && !appt.type?.toLowerCase().includes("video"));

        switch (activeTab) {
            case "upcoming":
                return (
                    (appt.status === "pending" ||
                        appt.status === "accepted" ||
                        appt.status === "confirmed") &&
                    matchesSearch &&
                    matchesType
                );
            case "pending":
                return appt.status === "pending" && matchesSearch && matchesType;
            case "completed":
                return appt.status === "completed" && matchesSearch && matchesType;
            case "cancelled":
                return (
                    (appt.status === "cancelled" || appt.status === "rejected") &&
                    matchesSearch &&
                    matchesType
                );
            default:
                return matchesSearch && matchesType;
        }
    });

    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginatedAppointments = filteredAppointments.slice(
        (safePage - 1) * PAGE_SIZE,
        safePage * PAGE_SIZE
    );

    const dateRangeLabel = useMemo(
        () => formatDateRangeLabel(filteredAppointments),
        [filteredAppointments]
    );

    const getStatusCounts = () => ({
        upcoming: appointments.filter(
            (a) => a.status === "pending" || a.status === "accepted" || a.status === "confirmed"
        ).length,
        pending: appointments.filter((a) => a.status === "pending").length,
        completed: appointments.filter((a) => a.status === "completed").length,
        cancelled: appointments.filter((a) => a.status === "cancelled" || a.status === "rejected")
            .length,
    });

    const counts = getStatusCounts();

    const groupedByDate = useMemo(() => {
        const map = new Map();
        for (const appt of filteredAppointments) {
            const key = appt.date || "Unknown date";
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(appt);
        }
        return Array.from(map.entries()).sort(([a], [b]) => {
            const da = parseApptDate(a);
            const db = parseApptDate(b);
            if (da && db) return da - db;
            return String(a).localeCompare(String(b));
        });
    }, [filteredAppointments]);

    return (
        <DoctorShell>
            <div className="relative mx-auto w-full max-w-7xl space-y-6 p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-slate-800">
                            Appointment Management
                        </h2>
                        <p className="mt-1 text-slate-600">
                            Review and manage your daily clinical consultation flow.
                        </p>
                    </div>
                    <div
                        className="inline-flex h-11 min-w-[240px] shrink-0 items-stretch rounded-full bg-slate-200/90 p-1 sm:min-w-[280px]"
                        role="group"
                        aria-label="Appointment view"
                    >
                        <button
                            type="button"
                            onClick={() => setViewMode("list")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-l-full rounded-r-none px-4 text-sm transition-colors sm:px-5 ${
                                viewMode === "list"
                                    ? "bg-blue-600 font-semibold text-white shadow-sm"
                                    : "bg-transparent font-medium text-slate-600 hover:bg-slate-300/40 hover:text-slate-800"
                            }`}
                        >
                            <span
                                className="material-symbols-outlined text-lg leading-none"
                                style={{
                                    color: viewMode === "list" ? "#ffffff" : "#64748b",
                                }}
                                aria-hidden
                            >
                                format_list_bulleted
                            </span>
                            List View
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("calendar")}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-l-none rounded-r-full px-4 text-sm transition-colors sm:px-5 ${
                                viewMode === "calendar"
                                    ? "bg-blue-600 font-semibold text-white shadow-sm"
                                    : "bg-transparent font-medium text-slate-600 hover:bg-slate-300/40 hover:text-slate-800"
                            }`}
                        >
                            <span
                                className="material-symbols-outlined text-lg leading-none"
                                style={{
                                    color: viewMode === "calendar" ? "#ffffff" : "#64748b",
                                }}
                                aria-hidden
                            >
                                calendar_view_day
                            </span>
                            Calendar
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("upcoming")}
                            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === "upcoming"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                    : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                            }`}
                        >
                            Upcoming{counts.upcoming > 0 ? ` (${counts.upcoming})` : ""}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("pending")}
                            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === "pending"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                    : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                            }`}
                        >
                            Pending Requests{counts.pending > 0 ? ` (${counts.pending})` : ""}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("completed")}
                            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === "completed"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                    : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                            }`}
                        >
                            Completed
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("cancelled")}
                            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === "cancelled"
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                    : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                            }`}
                        >
                            Cancelled
                        </button>
                    </div>

                    <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-12 md:gap-4">
                        <div className="relative md:col-span-5">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                                search
                            </span>
                            <input
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Search patient name, ID, or phone..."
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="relative md:col-span-3">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                                event
                            </span>
                            <input
                                className="w-full cursor-default rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-700 shadow-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                readOnly
                                type="text"
                                value={dateRangeLabel}
                            />
                        </div>
                        <div className="relative md:col-span-3">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                                stethoscope
                            </span>
                            <select
                                className="w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                <option value="video">Video Call</option>
                                <option value="inperson">In-person Visit</option>
                            </select>
                        </div>
                        <div className="flex justify-center md:col-span-1">
                            <button
                                type="button"
                                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-500 shadow-sm transition-colors hover:border-blue-200 hover:bg-white hover:text-blue-600"
                                aria-label="More filters"
                            >
                                <span className="material-symbols-outlined">filter_list</span>
                            </button>
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-16 shadow-sm">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                        <span className="ml-3 text-sm font-medium text-slate-600">Loading appointments...</span>
                    </div>
                )}

                {!loading && filteredAppointments.length === 0 && (
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center shadow-sm">
                        <span className="material-symbols-outlined mb-4 block text-7xl font-light text-slate-200">
                            calendar_today
                        </span>
                        <p className="text-lg font-medium text-slate-500">No appointments found.</p>
                    </div>
                )}

                {!loading && filteredAppointments.length > 0 && viewMode === "calendar" && (
                    <div className="space-y-8 rounded-2xl bg-slate-100/70 p-5 md:p-6">
                        {groupedByDate.map(([dateKey, rows]) => (
                            <div key={dateKey}>
                                <h3 className="font-headline mb-4 text-lg font-bold text-slate-800">
                                    {formatDisplayDate(dateKey)}
                                </h3>
                                <div className="space-y-5">
                                    {rows.map((appt) => (
                                        <AppointmentRow
                                            key={appt._id}
                                            appt={appt}
                                            onStatusUpdate={handleStatusUpdate}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredAppointments.length > 0 && viewMode === "list" && (
                    <div className="space-y-5 rounded-2xl bg-slate-100/70 p-5 md:p-6">
                        {paginatedAppointments.map((appt) => (
                            <AppointmentRow
                                key={appt._id}
                                appt={appt}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        ))}
                    </div>
                )}

                {!loading && filteredAppointments.length > 0 && (
                    <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium text-slate-500">
                            Showing {(safePage - 1) * PAGE_SIZE + 1}-
                            {Math.min(safePage * PAGE_SIZE, filteredAppointments.length)} of{" "}
                            {filteredAppointments.length} appointments
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={safePage <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:border-teal-200 hover:text-teal-700 disabled:opacity-40"
                            >
                                <span className="material-symbols-outlined text-[22px]">chevron_left</span>
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setPage(n)}
                                    className={`min-h-10 min-w-10 px-3 text-sm font-bold transition-all ${
                                        n === safePage
                                            ? "rounded-full bg-teal-800 text-white shadow-md shadow-teal-900/25"
                                            : "rounded-xl border border-slate-200/80 bg-white font-semibold text-slate-600 shadow-sm hover:border-teal-200 hover:text-teal-700"
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                            <button
                                type="button"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:border-teal-200 hover:text-teal-700 disabled:opacity-40"
                            >
                                <span className="material-symbols-outlined text-[22px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4">
                    <button
                        type="button"
                        className="rounded-full bg-teal-800 p-4 text-white shadow-xl shadow-teal-900/35 transition-all hover:bg-teal-900 hover:scale-105 active:scale-95"
                        aria-label="Quick task"
                    >
                        <span className="material-symbols-outlined text-[26px]">add_task</span>
                    </button>
                </div>
            </div>
        </DoctorShell>
    );
}

function AppointmentRow({ appt, onStatusUpdate }) {
    const isCancelled = appt.status === "cancelled" || appt.status === "rejected";
    const isPending = appt.status === "pending";
    const isAccepted = appt.status === "accepted" || appt.status === "confirmed";
    const isCompleted = appt.status === "completed";
    const isVideo = appt.type?.toLowerCase().includes("video");
    const rawDur = appt.durationMins ?? appt.duration;
    const durationMinsNum =
        typeof rawDur === "number" && !Number.isNaN(rawDur)
            ? rawDur
            : parseInt(String(rawDur).replace(/\D/g, ""), 10) || 30;
    const durationLabel =
        typeof appt.duration === "string" && /mins?/i.test(appt.duration)
            ? appt.duration
            : `${durationMinsNum} mins`;
    const endDisplay =
        appt.endTime || estimateEndTime(appt.time, durationMinsNum) || "—";

    const iconOutlineClass =
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-teal-200 hover:bg-slate-50 hover:text-teal-800";
    const iconCancelClass =
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white shadow-md transition-colors hover:bg-slate-900";
    const iconMutedClass =
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50";

    return (
        <div
            className={`group relative flex flex-col items-center gap-6 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-md shadow-slate-200/60 transition-all duration-300 hover:shadow-lg hover:shadow-slate-300/50 md:flex-row ${
                isCancelled ? "opacity-[0.72]" : ""
            }`}
        >
            <div className="absolute left-3 cursor-grab text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="material-symbols-outlined">drag_indicator</span>
            </div>

            <div className="flex min-w-[280px] items-center gap-4">
                <div
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ${isCancelled ? "bg-slate-200" : "bg-teal-50 ring-2 ring-teal-100"}`}
                >
                    <img
                        alt=""
                        className={`h-full w-full object-cover ${isCancelled ? "grayscale" : ""}`}
                        src={
                            appt.patientImage ||
                            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
                        }
                    />
                </div>
                <div>
                    <h4 className="font-headline text-lg font-bold text-slate-800">
                        {appt.patientName || "Patient"}
                    </h4>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                        <span>{appt.patientAge != null ? `${appt.patientAge} Years` : "—"}</span>
                        <span className="text-slate-300">•</span>
                        <span>{appt.patientGender || "—"}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-teal-700">{formatBloodType(appt.bloodType)}</span>
                    </div>
                </div>
            </div>

            <div className="flex w-full flex-1 items-center justify-between gap-6 md:gap-8">
                <div className="flex items-center gap-4">
                    <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                            isCancelled ? "bg-slate-100" : "bg-teal-50"
                        }`}
                    >
                        <span
                            className={`material-symbols-outlined text-[22px] ${isCancelled ? "text-slate-400" : "text-teal-700"}`}
                        >
                            {isCancelled ? "event_busy" : "schedule"}
                        </span>
                    </div>
                    <div>
                        <div
                            className={`text-base font-bold ${isCancelled ? "text-slate-400 line-through" : "text-slate-800"}`}
                        >
                            {appt.time || "—"} - {endDisplay}
                        </div>
                        <div className="text-xs font-medium text-slate-500">
                            {formatDisplayDate(appt.date)}
                            {isCancelled ? " • Cancelled" : ` • ${durationLabel}`}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    {isCancelled ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
                            <span className="material-symbols-outlined text-sm">
                                {isVideo ? "videocam" : "person"}
                            </span>
                            {isVideo ? "Video Call" : "In-person"}
                        </span>
                    ) : isVideo ? (
                        <span className="flex items-center gap-1.5 rounded-full bg-teal-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-teal-800">
                            <span
                                className="material-symbols-outlined text-sm"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                videocam
                            </span>
                            Video Call
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-800">
                            <span className="material-symbols-outlined text-sm">person</span>
                            In-person
                        </span>
                    )}
                    <span
                        className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(appt.status)}`}
                    >
                        {formatStatusLabel(appt.status)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-6">
                {isAccepted && !isCompleted && (
                    <>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate(appt._id, "complete")}
                            className="rounded-full bg-teal-800 px-6 py-2.5 font-headline text-sm font-bold text-white shadow-md shadow-teal-900/20 transition-all hover:bg-teal-900 hover:scale-[1.02] active:scale-95"
                        >
                            Start Call
                        </button>
                        <button type="button" className={iconOutlineClass} aria-label="Edit appointment">
                            <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
                        </button>
                        <button type="button" className={iconOutlineClass} aria-label="Details">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate(appt._id, "cancel")}
                            className={iconCancelClass}
                            aria-label="Cancel appointment"
                        >
                            <span className="material-symbols-outlined text-[20px]" style={{ color: "#fff" }}>
                                cancel
                            </span>
                        </button>
                    </>
                )}
                {isPending && (
                    <>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate(appt._id, "accept")}
                            className="rounded-full bg-sky-100 px-6 py-2.5 font-headline text-sm font-bold text-blue-800 shadow-sm transition-all hover:bg-sky-600 hover:text-white"
                        >
                            Confirm Visit
                        </button>
                        <button type="button" className={iconOutlineClass} aria-label="Edit appointment">
                            <span className="material-symbols-outlined text-[20px]">edit_calendar</span>
                        </button>
                        <button type="button" className={iconOutlineClass} aria-label="Details">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate(appt._id, "reject")}
                            className={iconCancelClass}
                            aria-label="Decline appointment"
                        >
                            <span className="material-symbols-outlined text-[20px]" style={{ color: "#fff" }}>
                                cancel
                            </span>
                        </button>
                    </>
                )}
                {isCompleted && (
                    <>
                        <span className="rounded-full bg-emerald-50 px-6 py-2.5 font-headline text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
                            Completed
                        </span>
                        <button type="button" className={iconOutlineClass} aria-label="Details">
                            <span className="material-symbols-outlined text-[20px]">description</span>
                        </button>
                    </>
                )}
                {isCancelled && (
                    <>
                        <button
                            type="button"
                            onClick={() => onStatusUpdate(appt._id, "accept")}
                            className="rounded-full bg-slate-100 px-6 py-2.5 font-headline text-sm font-bold text-slate-600 transition-all hover:bg-slate-200"
                        >
                            Restore
                        </button>
                        <button type="button" className={iconMutedClass} aria-label="Delete">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

function getStatusBadgeClass(status) {
    switch (status) {
        case "pending":
            return "bg-amber-50 text-amber-800 ring-1 ring-amber-100";
        case "accepted":
        case "confirmed":
            return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100";
        case "completed":
            return "bg-slate-100 text-slate-600";
        case "cancelled":
        case "rejected":
            return "bg-rose-50 text-rose-800 ring-1 ring-rose-100";
        default:
            return "bg-slate-100 text-slate-600";
    }
}
