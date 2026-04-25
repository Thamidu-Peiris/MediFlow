import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64;           // px per hour in day/week grid
const DAY_START   = 7;            // 7 AM
const DAY_END     = 21;           // 9 PM (last labelled row = 8 PM)
const HOURS       = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

const DAY_NAMES   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_STYLE = {
  pending:   { bg: "#FEF3C7", border: "#F59E0B", text: "#92400E", label: "Pending"   },
  accepted:  { bg: "#D1FAE5", border: "#059669", text: "#064E3B", label: "Confirmed" },
  confirmed: { bg: "#D1FAE5", border: "#059669", text: "#064E3B", label: "Confirmed" },
  active:    { bg: "#D1FAE5", border: "#059669", text: "#064E3B", label: "Active"    },
  completed: { bg: "#DBEAFE", border: "#3B82F6", text: "#1E3A8A", label: "Completed" },
  cancelled: { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B", label: "Cancelled" },
  rejected:  { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B", label: "Rejected"  },
};

// ── Pure helpers ──────────────────────────────────────────────────────────────
function parseTime12h(str = "") {
  const m = String(str).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = +m[1], min = +m[2];
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return { hour: h, minute: min };
}

function parse24h(str = "") {
  const p = String(str).split(":");
  return p.length >= 2 ? { hour: +p[0], minute: +p[1] } : null;
}

function toMins(h, m = 0) { return h * 60 + m; }

function cloneDate(d) { return new Date(d instanceof Date ? d.getTime() : d); }

function addDays(date, n) {
  const d = cloneDate(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeekMon(date) {
  const d = cloneDate(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d;
}

function getWeekDays(date) {
  const mon = startOfWeekMon(date);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

function getMonthGrid(date) {
  const y = date.getFullYear(), mo = date.getMonth();
  const first = new Date(y, mo, 1);
  const last  = new Date(y, mo + 1, 0);
  const offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const total  = Math.ceil((offset + last.getDate()) / 7) * 7;
  return Array.from({ length: total }, (_, i) => addDays(addDays(first, -offset), i));
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

function isToday(d) { return isSameDay(d, new Date()); }

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function hourLabel(h) {
  if (h === 0)  return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function fmtDisplayDate(str) {
  if (!str) return "—";
  const d = new Date(`${str}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? str
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Computes absolute pixel positions for a set of appointments in a day column,
 * handling overlaps by splitting the column width.
 */
function layoutEvents(appts) {
  const items = appts.map(appt => {
    const p = parseTime12h(appt.time);
    if (!p) return null;
    const dur = typeof appt.durationMins === "number"
      ? appt.durationMins
      : (parseInt(String(appt.duration || "").replace(/\D/g, ""), 10) || 30);
    const start = toMins(p.hour, p.minute);
    return { appt, start, end: start + dur };
  }).filter(Boolean);

  if (!items.length) return [];
  items.sort((a, b) => a.start - b.start);

  // Assign each item to the first column whose last end time ≤ item.start
  const colEnds = [];
  const colIdx  = items.map(item => {
    const c = colEnds.findIndex(e => e <= item.start);
    if (c === -1) { colEnds.push(item.end); return colEnds.length - 1; }
    colEnds[c] = item.end;
    return c;
  });

  // Determine max concurrent column for each item (for width splitting)
  return items.map((item, i) => {
    let maxCol = colIdx[i];
    items.forEach((other, j) => {
      if (other.start < item.end && other.end > item.start)
        maxCol = Math.max(maxCol, colIdx[j]);
    });
    const totalCols = maxCol + 1;
    const top    = (item.start / 60 - DAY_START) * HOUR_HEIGHT;
    const height = Math.max(((item.end - item.start) / 60) * HOUR_HEIGHT - 4, 24);
    return {
      appt: item.appt,
      top,
      height,
      leftPct:  (colIdx[i] / totalCols) * 100,
      widthPct: (1 / totalCols) * 100,
    };
  });
}

// ── Shared sub-components ─────────────────────────────────────────────────────

/** Red dot + horizontal line showing the current wall-clock time. */
function CurrentTimeLine() {
  const calcTop = () => {
    const now = new Date();
    return (toMins(now.getHours(), now.getMinutes()) / 60 - DAY_START) * HOUR_HEIGHT;
  };
  const [top, setTop] = useState(calcTop);

  useEffect(() => {
    const id = setInterval(() => setTop(calcTop()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (top < 0 || top > HOURS.length * HOUR_HEIGHT) return null;
  return (
    <div
      className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
      style={{ top }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-[#437A00] -ml-1 flex-shrink-0" />
      <div className="flex-1 h-px bg-[#437A00] opacity-60" />
    </div>
  );
}

/** Left-side time labels column used by both DayView and WeekView. */
function TimeGutter() {
  return (
    <div className="relative flex-shrink-0 select-none" style={{ width: 52 }}>
      {HOURS.map((h, i) => (
        <div
          key={h}
          className="absolute w-full flex items-start justify-end pr-2"
          style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
        >
          <span className="text-[9px] font-bold text-[#043927]/30 -translate-y-2 whitespace-nowrap">
            {hourLabel(h)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ currentDate, getApptsForDate, isWorkingHour, onSelect }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      scrollRef.current.scrollTop = Math.max(0, (now.getHours() - DAY_START - 1) * HOUR_HEIGHT);
    }
  }, []);

  const appts  = getApptsForDate(currentDate);
  const layout = useMemo(() => layoutEvents(appts), [appts]);

  return (
    <div className="bg-white rounded-2xl border border-[#356600]/10 shadow-sm overflow-hidden flex flex-col">
      {/* Column header */}
      <div className="flex border-b border-[#356600]/10 flex-shrink-0" style={{ paddingLeft: 52 }}>
        <div className="flex-1 py-3 text-center border-l border-[#356600]/10">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#043927]/40">
            {DAY_NAMES[currentDate.getDay()]}
          </p>
          <div className={`mx-auto mt-1 w-8 h-8 flex items-center justify-center rounded-full text-sm font-black ${
            isToday(currentDate) ? "bg-[#043927] text-white" : "text-[#043927]"
          }`}>
            {currentDate.getDate()}
          </div>
        </div>
      </div>

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        style={{ maxHeight: "calc(100vh - 255px)", overflowY: "auto" }}
      >
        <div className="flex" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          <TimeGutter />
          <div className="flex-1 relative border-l border-[#356600]/10">
            {/* Hour row backgrounds */}
            {HOURS.map((h, hi) => (
              <div
                key={h}
                className={`absolute w-full border-b border-[#356600]/5 ${
                  !isWorkingHour(currentDate, h) ? "bg-slate-50/70" : ""
                }`}
                style={{ top: hi * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              />
            ))}

            {/* Appointment blocks */}
            {layout.map(({ appt, top, height, leftPct, widthPct }) => {
              const s = STATUS_STYLE[appt.status?.toLowerCase()] || STATUS_STYLE.pending;
              return (
                <button
                  key={appt._id}
                  onClick={() => onSelect(appt)}
                  className="absolute rounded-xl px-2.5 py-1.5 text-left overflow-hidden border-l-[3px] transition-all hover:brightness-95 hover:shadow-lg z-10 cursor-pointer"
                  style={{
                    top: top + 2,
                    height,
                    left:  `calc(${leftPct}%  + 4px)`,
                    width: `calc(${widthPct}% - 8px)`,
                    backgroundColor: s.bg,
                    borderLeftColor: s.border,
                    color: s.text,
                  }}
                >
                  <p className="text-[10px] font-black truncate leading-tight">{appt.patientName}</p>
                  <p className="text-[9px] opacity-60 truncate capitalize">{appt.time} · {appt.appointmentType || "physical"}</p>
                </button>
              );
            })}

            {isToday(currentDate) && <CurrentTimeLine />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ currentDate, getApptsForDate, isWorkingHour, isWorkingDay, onSelect }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      scrollRef.current.scrollTop = Math.max(0, (now.getHours() - DAY_START - 1) * HOUR_HEIGHT);
    }
  }, []);

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const layouts  = useMemo(
    () => weekDays.map(d => layoutEvents(getApptsForDate(d))),
    [weekDays, getApptsForDate],
  );

  return (
    <div className="bg-white rounded-2xl border border-[#356600]/10 shadow-sm overflow-hidden flex flex-col">
      {/* Day headers */}
      <div className="flex border-b border-[#356600]/10 flex-shrink-0" style={{ paddingLeft: 52 }}>
        {weekDays.map((d, i) => {
          const today   = isToday(d);
          const working = isWorkingDay(d);
          return (
            <div
              key={i}
              className={`flex-1 py-2 text-center border-l border-[#356600]/10 ${!working ? "bg-slate-50/40" : ""}`}
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-[#043927]/40">
                {DAY_SHORT[d.getDay()]}
              </p>
              <div className={`mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-xs font-black transition-colors ${
                today ? "bg-[#043927] text-white" : "text-[#043927]"
              }`}>
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        style={{ maxHeight: "calc(100vh - 255px)", overflowY: "auto" }}
      >
        <div className="flex" style={{ height: HOURS.length * HOUR_HEIGHT }}>
          <TimeGutter />

          {weekDays.map((day, di) => (
            <div
              key={di}
              className={`flex-1 relative border-l border-[#356600]/10 min-w-0 ${
                !isWorkingDay(day) ? "bg-slate-50/30" : ""
              }`}
            >
              {/* Hour row backgrounds */}
              {HOURS.map((h, hi) => (
                <div
                  key={h}
                  className={`absolute w-full border-b border-[#356600]/5 ${
                    !isWorkingHour(day, h) ? "bg-slate-50/50" : ""
                  }`}
                  style={{ top: hi * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}

              {/* Appointment blocks */}
              {layouts[di].map(({ appt, top, height, leftPct, widthPct }) => {
                const s = STATUS_STYLE[appt.status?.toLowerCase()] || STATUS_STYLE.pending;
                return (
                  <button
                    key={appt._id}
                    onClick={() => onSelect(appt)}
                    className="absolute rounded-lg px-1.5 py-1 text-left overflow-hidden border-l-2 transition-all hover:brightness-95 hover:shadow-md z-10 cursor-pointer"
                    style={{
                      top: top + 2,
                      height,
                      left:  `calc(${leftPct}%  + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      backgroundColor: s.bg,
                      borderLeftColor: s.border,
                      color: s.text,
                    }}
                  >
                    <p className="text-[9px] font-black truncate leading-tight">{appt.patientName}</p>
                    <p className="text-[8px] opacity-60 truncate">{appt.time}</p>
                  </button>
                );
              })}

              {isToday(day) && <CurrentTimeLine />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ currentDate, getApptsForDate, isWorkingDay, onSelect }) {
  const grid  = useMemo(() => getMonthGrid(currentDate), [currentDate]);
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < grid.length; i += 7) w.push(grid.slice(i, i + 7));
    return w;
  }, [grid]);

  return (
    <div className="bg-white rounded-2xl border border-[#356600]/10 shadow-sm overflow-hidden flex flex-col">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 border-b border-[#356600]/10 flex-shrink-0">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="py-2.5 text-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#043927]/40">{d}</span>
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div style={{ maxHeight: "calc(100vh - 230px)", overflowY: "auto" }}>
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-7 border-b border-[#356600]/10 last:border-b-0"
            style={{ minHeight: 108 }}
          >
            {week.map((date, di) => {
              const appts     = getApptsForDate(date);
              const sameMonth = date.getMonth() === currentDate.getMonth();
              const working   = isWorkingDay(date);
              const today     = isToday(date);

              return (
                <div
                  key={di}
                  className={`p-2 border-r border-[#356600]/10 last:border-r-0 ${
                    !sameMonth
                      ? "bg-slate-50/80"
                      : !working
                        ? "bg-slate-50/30"
                        : ""
                  }`}
                >
                  {/* Date number */}
                  <div className="mb-1.5">
                    <span className={`inline-flex w-6 h-6 items-center justify-center text-[10px] font-black rounded-full ${
                      today
                        ? "bg-[#043927] text-white"
                        : sameMonth
                          ? "text-[#043927]"
                          : "text-[#043927]/25"
                    }`}>
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div className="space-y-0.5">
                    {appts.slice(0, 3).map(appt => {
                      const s = STATUS_STYLE[appt.status?.toLowerCase()] || STATUS_STYLE.pending;
                      return (
                        <button
                          key={appt._id}
                          onClick={() => onSelect(appt)}
                          className="w-full text-left px-1.5 py-0.5 rounded text-[9px] font-bold truncate hover:opacity-75 transition-opacity"
                          style={{
                            backgroundColor: s.bg,
                            color: s.text,
                            borderLeft: `2px solid ${s.border}`,
                          }}
                        >
                          {appt.time} {appt.patientName}
                        </button>
                      );
                    })}
                    {appts.length > 3 && (
                      <button
                        onClick={() => onSelect(appts[3])}
                        className="text-[9px] font-bold text-[#043927]/40 pl-1.5 hover:text-[#043927] transition-colors"
                      >
                        +{appts.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Appointment Detail Modal ──────────────────────────────────────────────────
function DetailItem({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5">
      <span className="material-symbols-outlined text-[15px] text-[#437A00] flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-xs font-bold text-[#043927] truncate">{value}</p>
      </div>
    </div>
  );
}

function AppointmentModal({ appt, onClose, onAction, actionLoading, actionMsg }) {
  const status     = String(appt.status || "").toLowerCase();
  const isPending  = status === "pending";
  const isAccepted = ["accepted","confirmed","active"].includes(status);
  const s          = STATUS_STYLE[status] || STATUS_STYLE.pending;
  const isOnline   = String(appt.appointmentType || "").toLowerCase() === "online";

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(4,57,39,0.25)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: "0 32px 64px rgba(4,57,39,0.18)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Status colour strip at top */}
        <div className="h-1" style={{ backgroundColor: s.border }} />

        {/* Header: patient info */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                <img
                  src={appt.patientImage || "/default-profile-avatar.png"}
                  alt={appt.patientName}
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.src = "/default-profile-avatar.png"; }}
                />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-[#043927] truncate">{appt.patientName || "Patient"}</h3>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span
                    className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: s.bg, color: s.text }}
                  >
                    {s.label}
                  </span>
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isOnline ? "bg-violet-100 text-violet-700" : "bg-[#CBF79D]/50 text-[#043927]"
                  }`}>
                    <span className="material-symbols-outlined text-[11px]">{isOnline ? "videocam" : "local_hospital"}</span>
                    {isOnline ? "Online" : "Physical"}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-100 flex-shrink-0 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        {/* Detail grid */}
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <DetailItem icon="calendar_today" label="Date"   value={fmtDisplayDate(appt.date)} />
            <DetailItem icon="schedule"       label="Time"   value={appt.time || "—"} />
            <DetailItem icon="person"         label="Age"    value={appt.patientAge ? `${appt.patientAge} yrs` : "—"} />
            <DetailItem icon="wc"             label="Gender" value={appt.patientGender || "—"} />
          </div>

          {(appt.reason || appt.notes) && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Reason for visit</p>
              <p className="text-xs text-[#043927] font-medium leading-relaxed">{appt.reason || appt.notes}</p>
            </div>
          )}

          {actionMsg && (
            <div className={`rounded-xl px-3 py-2 text-xs font-bold ${
              actionMsg.toLowerCase().includes("fail") || actionMsg.toLowerCase().includes("error")
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-[#CBF79D]/30 text-[#043927] border border-[#CBF79D]"
            }`}>
              {actionMsg}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {(isPending || isAccepted) && (
          <div className="px-5 pb-5 flex gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => onAction(appt, "accept")}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#CBF79D] text-[#043927] hover:bg-[#b3f065] transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "…" : "Accept"}
                </button>
                <button
                  onClick={() => onAction(appt, "reject")}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? "…" : "Reject"}
                </button>
              </>
            )}
            {isAccepted && (
              <button
                onClick={() => onAction(appt, "complete")}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#043927] text-white hover:bg-[#437A00] transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Processing…" : "Mark Complete"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DoctorCalendarPage() {
  const { authHeaders } = useAuth();

  const [view,          setView]          = useState("week");
  const [currentDate,   setCurrentDate]   = useState(new Date());
  const [appointments,  setAppointments]  = useState([]);
  const [doctorInfo,    setDoctorInfo]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [selectedAppt,  setSelectedAppt]  = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg,     setActionMsg]     = useState("");

  // ── Data fetching ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authHeaders) return;
    setLoading(true);
    Promise.all([
      api.get("/appointments/doctor", authHeaders),
      api.get("/doctors/me", authHeaders),
    ])
      .then(([aRes, dRes]) => {
        setAppointments(aRes.data.appointments || []);
        setDoctorInfo(dRes.data.doctor || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authHeaders]);

  // ── Calendar navigation ─────────────────────────────────────────────────────
  const navigate = useCallback((dir) => {
    setCurrentDate(prev => {
      const d = cloneDate(prev);
      if (view === "day")        d.setDate(d.getDate() + dir);
      else if (view === "week")  d.setDate(d.getDate() + dir * 7);
      else                       d.setMonth(d.getMonth() + dir);
      return d;
    });
  }, [view]);

  // Reset to week view when switching to day (so today is shown)
  const handleViewChange = useCallback((v) => {
    setView(v);
    if (v === "day") setCurrentDate(new Date());
  }, []);

  // ── Availability helpers ────────────────────────────────────────────────────
  const getSlotsForDay = useCallback((dayName) => {
    if (!doctorInfo) return [];
    const phys = doctorInfo.physicalAvailability?.length
      ? doctorInfo.physicalAvailability
      : (doctorInfo.availability || []);
    const online = doctorInfo.onlineAvailability || [];
    return [
      ...(phys.find(a => a.day === dayName)?.slots   || []),
      ...(online.find(a => a.day === dayName)?.slots || []),
    ];
  }, [doctorInfo]);

  const isWorkingDay = useCallback(
    (date) => getSlotsForDay(DAY_NAMES[date.getDay()]).length > 0,
    [getSlotsForDay],
  );

  const isWorkingHour = useCallback((date, hour) => {
    return getSlotsForDay(DAY_NAMES[date.getDay()]).some(slot => {
      const s = parse24h(slot.start);
      const e = parse24h(slot.end);
      return s && e && hour >= s.hour && hour < e.hour;
    });
  }, [getSlotsForDay]);

  const getApptsForDate = useCallback(
    (date) => appointments.filter(a => a.date === toIso(date)),
    [appointments],
  );

  // ── Appointment actions ─────────────────────────────────────────────────────
  const handleAction = async (appt, action) => {
    setActionLoading(true);
    setActionMsg("");
    try {
      await api.patch(`/appointments/${appt._id}/${action}`, {}, authHeaders);
      const res      = await api.get("/appointments/doctor", authHeaders);
      const updated  = res.data.appointments || [];
      setAppointments(updated);
      const refreshed = updated.find(a => a._id === appt._id);
      setSelectedAppt(refreshed || null);
      const msgs = { accept: "Appointment accepted.", reject: "Appointment rejected.", complete: "Marked as complete." };
      setActionMsg(msgs[action] || "Done.");
    } catch (err) {
      setActionMsg(err?.response?.data?.message || "Action failed. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Header label ────────────────────────────────────────────────────────────
  const headerTitle = useMemo(() => {
    if (view === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      });
    }
    if (view === "week") {
      const [first, last] = [getWeekDays(currentDate)[0], getWeekDays(currentDate)[6]];
      if (first.getMonth() === last.getMonth())
        return `${MONTH_NAMES[first.getMonth()]} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
      return `${first.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${last.toLocaleDateString("en-US",{month:"short",day:"numeric"})}, ${last.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [view, currentDate]);

  // ── Mini summary badge ──────────────────────────────────────────────────────
  const summary = useMemo(() => {
    let visible = [];
    if (view === "day") {
      visible = getApptsForDate(currentDate);
    } else if (view === "week") {
      visible = getWeekDays(currentDate).flatMap(d => getApptsForDate(d));
    } else {
      visible = getMonthGrid(currentDate)
        .filter(d => d.getMonth() === currentDate.getMonth())
        .flatMap(d => getApptsForDate(d));
    }
    return {
      total:   visible.length,
      pending: visible.filter(a => a.status === "pending").length,
    };
  }, [view, currentDate, getApptsForDate]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DoctorShell>
      <div className="flex flex-col gap-4 px-1">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-headline font-black text-[#043927]">Calendar</h1>
              {summary.total > 0 && (
                <span className="px-2 py-0.5 bg-[#CBF79D]/40 text-[#043927] text-[9px] font-black uppercase tracking-widest rounded-full border border-[#CBF79D]">
                  {summary.total} appt{summary.total !== 1 ? "s" : ""}
                  {summary.pending > 0 && ` · ${summary.pending} pending`}
                </span>
              )}
            </div>
            <p className="text-xs text-[#043927]/50 font-medium mt-0.5">{headerTitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div className="flex bg-[#f4f9f4] border border-[#356600]/10 rounded-xl p-1 gap-0.5">
              {["day","week","month"].map(v => (
                <button
                  key={v}
                  onClick={() => handleViewChange(v)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    view === v
                      ? "bg-[#043927] text-white shadow"
                      : "text-[#043927]/50 hover:text-[#043927] hover:bg-white"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Prev / Today / Next */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-lg border border-[#356600]/10 flex items-center justify-center text-[#043927] hover:bg-[#CBF79D]/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-lg border border-[#356600]/10 text-[10px] font-black text-[#043927] hover:bg-[#CBF79D]/30 transition-colors uppercase tracking-wider"
              >
                Today
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 rounded-lg border border-[#356600]/10 flex items-center justify-center text-[#043927] hover:bg-[#CBF79D]/30 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-4 flex-wrap">
          {[
            { key: "pending",   label: "Pending"   },
            { key: "accepted",  label: "Confirmed" },
            { key: "completed", label: "Completed" },
            { key: "cancelled", label: "Cancelled" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_STYLE[key].border }} />
              <span className="text-[9px] font-black uppercase tracking-wider text-[#043927]/40">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-slate-200" />
            <span className="text-[9px] font-black uppercase tracking-wider text-[#043927]/40">Off hours</span>
          </div>
        </div>

        {/* ── Calendar body ── */}
        <div>
          {loading ? (
            <div className="flex items-center justify-center bg-white rounded-2xl border border-[#356600]/10 shadow-sm" style={{ height: 480 }}>
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin w-10 h-10 rounded-full border-[3px] border-[#CBF79D]/30 border-t-[#437A00]" />
                <p className="text-[10px] font-black text-[#043927]/40 uppercase tracking-widest">
                  Loading calendar…
                </p>
              </div>
            </div>
          ) : view === "month" ? (
            <MonthView
              currentDate={currentDate}
              getApptsForDate={getApptsForDate}
              isWorkingDay={isWorkingDay}
              onSelect={setSelectedAppt}
            />
          ) : view === "week" ? (
            <WeekView
              currentDate={currentDate}
              getApptsForDate={getApptsForDate}
              isWorkingHour={isWorkingHour}
              isWorkingDay={isWorkingDay}
              onSelect={setSelectedAppt}
            />
          ) : (
            <DayView
              currentDate={currentDate}
              getApptsForDate={getApptsForDate}
              isWorkingHour={isWorkingHour}
              onSelect={setSelectedAppt}
            />
          )}
        </div>

        {/* ── Appointment detail modal ── */}
        {selectedAppt && (
          <AppointmentModal
            appt={selectedAppt}
            onClose={() => { setSelectedAppt(null); setActionMsg(""); }}
            onAction={handleAction}
            actionLoading={actionLoading}
            actionMsg={actionMsg}
          />
        )}
      </div>
    </DoctorShell>
  );
}
