import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import AppointmentDateRangePicker from "../components/AppointmentDateRangePicker";
import ConfirmDialog from "../components/ConfirmDialog";
import InfoDialog from "../components/InfoDialog";
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

export default function DoctorAppointmentsPage() {
    const { authHeaders } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("upcoming");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    /** Inclusive YYYY-MM-DD; empty string = no bound on that side */
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const dateRangeInitializedRef = useRef(false);
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

    /** Once real appointments load, default the calendar to the min–max dates in the dataset */
    useEffect(() => {
        if (loading || dateRangeInitializedRef.current) return;
        const keys = appointmentDateKeys(appointments);
        if (keys.length === 0) return;
        dateRangeInitializedRef.current = true;
        setFilterDateFrom(keys[0]);
        setFilterDateTo(keys[keys.length - 1]);
    }, [loading, appointments]);

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
        if (filterDateFrom && filterDateTo) {
            return `${formatShortDate(filterDateFrom)} - ${formatShortDate(filterDateTo)}`;
        }
        if (filterDateFrom) return `From ${formatShortDate(filterDateFrom)}`;
        if (filterDateTo) return `Until ${formatShortDate(filterDateTo)}`;
        return "All dates";
    }, [filterDateFrom, filterDateTo]);

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

    const appointmentFilterTabs = [
        {
            id: "upcoming",
            label: "Upcoming",
            count: counts.upcoming,
            active: "bg-blue-600 text-white shadow-md shadow-blue-600/25",
            idle: "bg-blue-50 text-blue-800 hover:bg-blue-100",
        },
        {
            id: "pending",
            label: "Pending Requests",
            count: counts.pending,
            active: "bg-amber-500 text-white shadow-md shadow-amber-500/35",
            idle: "bg-amber-50 text-amber-900 hover:bg-amber-100",
        },
        {
            id: "completed",
            label: "Completed",
            count: counts.completed,
            active: "bg-emerald-600 text-white shadow-md shadow-emerald-600/30",
            idle: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
        },
        {
            id: "cancelled",
            label: "Cancelled",
            count: counts.cancelled,
            active: "bg-rose-600 text-white shadow-md shadow-rose-600/30",
            idle: "bg-rose-50 text-rose-800 hover:bg-rose-100",
        },
    ];

    return (
        <DoctorShell>
            <div className="relative mx-auto w-full max-w-7xl space-y-6 p-8">
                {statusError && (
                    <div
                        className="flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
                        role="alert"
                    >
                        <span>{statusError}</span>
                        <button
                            type="button"
                            className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                            onClick={() => setStatusError(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                )}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter appointments">
                        {appointmentFilterTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const suffix = tab.count > 0 ? ` (${tab.count})` : "";
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                                        isActive ? tab.active : tab.idle
                                    }`}
                                >
                                    {tab.label}
                                    {suffix}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-12 md:gap-4">
                        <div className="md:col-span-5">
                            <label className="mb-1 block text-xs font-medium text-slate-500">Search</label>
                            <div className="relative">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                                search
                            </span>
                            <input
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/25"
                                placeholder="Search patient name, ID, or phone..."
                                type="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            </div>
                        </div>
                        <div className="md:col-span-7">
                            <AppointmentDateRangePicker
                                fromYmd={filterDateFrom}
                                toYmd={filterDateTo}
                                onChange={({ from, to }) => {
                                    setFilterDateFrom(from);
                                    setFilterDateTo(to);
                                }}
                            />
                            <p className="mt-1 truncate text-xs text-slate-500" title={dateRangeSummary}>
                                Showing: {dateRangeSummary}
                            </p>
                        </div>
                    </div>

                    {loading && (
                        <div className="mt-6 flex items-center justify-center border-t border-slate-100 py-14">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
                            <span className="ml-3 text-sm font-medium text-slate-600">Loading appointments...</span>
                        </div>
                    )}

                    {!loading && filteredAppointments.length === 0 && (
                        <div className="mt-6 border-t border-slate-100 py-14 text-center">
                            <span className="material-symbols-outlined mb-4 block text-7xl font-light text-slate-200">
                                calendar_today
                            </span>
                            <p className="text-lg font-medium text-slate-500">No appointments found.</p>
                        </div>
                    )}

                    {!loading && filteredAppointments.length > 0 && (
                        <div className="mt-6 space-y-5 border-t border-slate-100 pt-6">
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
                        <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
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
                                    className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-40"
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
                                                ? "rounded-full bg-slate-800 text-white shadow-md shadow-slate-900/20"
                                                : "rounded-xl border border-slate-200/80 bg-white font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    className="rounded-xl border border-slate-200/80 bg-white p-2 text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-40"
                                >
                                    <span className="material-symbols-outlined text-[22px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

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
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
    const status = String(appt.status || "").toLowerCase();
    const isCancelled = status === "cancelled" || status === "rejected";
    const isPending = status === "pending";
    const isAccepted = status === "accepted" || status === "confirmed";
    const isCompleted = status === "completed";
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
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-none transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300/60";
    const iconMutedClass =
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-none transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/60";

    const patientLabel = appt.patientName?.trim() || "this patient";
    const hasBloodType = String(appt.bloodType || "").trim().length > 0;
    const visitReasonText =
        String(appt.reason || "").trim() || String(appt.notes || "").trim() || "";

    const submitConfirm = () => {
        if (!confirmDialog) return;
        onStatusUpdate(appt._id, confirmDialog.action);
        setConfirmDialog(null);
    };

    return (
        <Fragment>
        <div
            className={`group relative flex flex-col items-center gap-6 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-none transition-all duration-300 md:flex-row ${
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
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                        <span>{appt.patientAge != null ? `${appt.patientAge} Years` : "—"}</span>
                        <span className="text-slate-300">•</span>
                        <span>{appt.patientGender || "—"}</span>
                        {hasBloodType && (
                            <>
                                <span className="text-slate-300">•</span>
                                <span className="font-bold text-teal-700">
                                    {formatBloodType(appt.bloodType)}
                                </span>
                            </>
                        )}
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
                <div className="flex w-[220px] shrink-0 items-center justify-end gap-3">
                    <button
                        type="button"
                        className={iconOutlineClass}
                        aria-label="Reason for visit"
                        onClick={() => setReasonDialogOpen(true)}
                    >
                        <span className="material-symbols-outlined text-[20px]">description</span>
                    </button>
                    <span
                        className={`inline-flex h-6 w-[108px] items-center justify-center rounded-full px-3 text-[10px] font-black uppercase tracking-wider ${getStatusBadgeClass(status)}`}
                    >
                        {formatStatusLabel(status)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                {isAccepted && !isCompleted && (
                    <>
                        <button
                            type="button"
                            onClick={() =>
                                setConfirmDialog({
                                    title: "Complete visit?",
                                    message: `Mark this visit as completed for ${patientLabel}?`,
                                    action: "complete",
                                    confirmLabel: "Complete",
                                    variant: "primary",
                                })
                            }
                            className="inline-flex h-10 items-center justify-center rounded-full bg-black px-6 py-0 font-headline text-sm font-bold text-white transition-colors hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-400/40"
                        >
                            Start Call
                        </button>
                    </>
                )}
                {isPending && (
                    <>
                        <button
                            type="button"
                            onClick={() =>
                                setConfirmDialog({
                                    title: "Confirm appointment",
                                    message: `Confirm appointment with ${patientLabel}?`,
                                    action: "accept",
                                    confirmLabel: "Confirm",
                                    variant: "primary",
                                })
                            }
                            className="inline-flex h-10 items-center justify-center rounded-full bg-amber-400 px-6 py-0 font-headline text-sm font-bold text-black transition-colors hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        >
                            Confirm
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setConfirmDialog({
                                    title: "Decline appointment",
                                    message: `Decline the appointment with ${patientLabel}?`,
                                    action: "reject",
                                    confirmLabel: "Decline",
                                    variant: "danger",
                                })
                            }
                            className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-red-600 px-6 py-0 font-headline text-sm font-bold text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                        >
                            Decline
                        </button>
                    </>
                )}
                {isCompleted && (
                    <>
                        <span className="rounded-full bg-emerald-50 px-6 py-2.5 font-headline text-sm font-bold text-emerald-800 ring-1 ring-emerald-100">
                            Completed
                        </span>
                    </>
                )}
                {isCancelled && (
                    <>
                        <button
                            type="button"
                            onClick={() =>
                                setConfirmDialog({
                                    title: "Restore appointment",
                                    message: `Restore appointment for ${patientLabel}?`,
                                    action: "accept",
                                    confirmLabel: "Restore",
                                    variant: "primary",
                                })
                            }
                            className="inline-flex h-10 items-center justify-center rounded-full bg-slate-100 px-6 py-0 font-headline text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
        <InfoDialog
            open={reasonDialogOpen}
            title="Reason for visit"
            onClose={() => setReasonDialogOpen(false)}
        >
            <p className="whitespace-pre-wrap">
                {visitReasonText || "No reason provided."}
            </p>
        </InfoDialog>
        <ConfirmDialog
            open={!!confirmDialog}
            title={confirmDialog?.title}
            message={confirmDialog?.message}
            confirmLabel={confirmDialog?.confirmLabel ?? "Confirm"}
            cancelLabel="Cancel"
            variant={confirmDialog?.variant ?? "primary"}
            onConfirm={submitConfirm}
            onCancel={() => setConfirmDialog(null)}
        />
        </Fragment>
    );
}

function getStatusBadgeClass(status) {
    const s = String(status || "").toLowerCase();
    switch (s) {
        case "pending":
            return "bg-amber-400 text-black";
        case "accepted":
        case "confirmed":
            return "bg-green-600 text-white";
        case "completed":
            return "bg-slate-100 text-slate-600";
        case "cancelled":
        case "rejected":
            return "bg-rose-50 text-rose-800 ring-1 ring-rose-100";
        default:
            return "bg-slate-100 text-slate-600";
    }
}
