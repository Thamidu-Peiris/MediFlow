import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, format, isToday, startOfWeek } from "date-fns";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

/* ─────────────────────────────── constants ─────────────────────────────── */
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const TIME_LABELS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM",
];

const HOUR_HEIGHT = 80;          // px per hour row
const GRID_START_MINS = 8 * 60;  // 08:00 in minutes
const GRID_END_MINS   = 20 * 60; // 20:00 in minutes  (08 AM + 12 h = 20:00, but we show 13 rows ending at 21:00)
// 13 rows → 08:00 .. 20:00 inclusive start labels; last row ends at 21:00
const TOTAL_GRID_MINS = 13 * 60; // 780 min displayed

/* ─────────────────────────────── pure helpers ───────────────────────────── */
const toMinutes = (time) => {
  const [h, m] = String(time || "0:0").split(":").map(Number);
  return h * 60 + m;
};

const toMinutes12h = (timeLabel = "") => {
  const m = String(timeLabel).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3].toUpperCase();
  if (h === 12) h = 0;
  if (ampm === "PM") h += 12;
  return h * 60 + min;
};

const getCurrentWeekBounds = () => {
  const now = new Date();
  const diff = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
};

const toTimeString = (minutes) => {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
};

const normalizeSlots = (slots) => {
  const cleaned = slots
    .filter((s) => s?.start && s?.end)
    .filter((s) => toMinutes(s.start) < toMinutes(s.end))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const merged = [];
  for (const slot of cleaned) {
    if (!merged.length) { merged.push({ ...slot }); continue; }
    const last = merged[merged.length - 1];
    if (toMinutes(slot.start) <= toMinutes(last.end)) {
      if (toMinutes(slot.end) > toMinutes(last.end)) last.end = slot.end;
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
};

const subtractRangeFromSlot = (slot, bStart, bEnd) => {
  const ss = toMinutes(slot.start), se = toMinutes(slot.end);
  if (bEnd <= ss || bStart >= se) return [slot];
  if (bStart <= ss && bEnd >= se) return [];
  if (bStart <= ss) return [{ start: toTimeString(bEnd), end: slot.end }];
  if (bEnd >= se)   return [{ start: slot.start, end: toTimeString(bStart) }];
  return [{ start: slot.start, end: toTimeString(bStart) }, { start: toTimeString(bEnd), end: slot.end }];
};

const findConflictDays = (schedA, schedB) => {
  const out = new Set();
  for (const dA of schedA) {
    const dB = schedB.find((d) => d.day === dA.day);
    if (!dB?.slots?.length) continue;
    for (const sA of dA.slots) {
      const [sa, ea] = [toMinutes(sA.start), toMinutes(sA.end)];
      for (const sB of dB.slots) {
        const [sb, eb] = [toMinutes(sB.start), toMinutes(sB.end)];
        if (sa < eb && ea > sb) { out.add(dA.day); break; }
      }
      if (out.has(dA.day)) break;
    }
  }
  return [...out];
};

const emptySchedule = () => DAYS.map((day) => ({ day, slots: [] }));

const mergeWithDays = (avail) =>
  DAYS.map((day) => {
    const ex = (avail || []).find((a) => a.day === day);
    return ex ? { ...ex, slots: normalizeSlots(ex.slots || []) } : { day, slots: [] };
  });

/* Calendar positioning */
const slotStyle = (startStr, endStr) => {
  const s = Math.max(toMinutes(startStr), GRID_START_MINS);
  const e = Math.min(toMinutes(endStr), GRID_START_MINS + TOTAL_GRID_MINS);
  const top    = (s - GRID_START_MINS) * (HOUR_HEIGHT / 60);
  const height = Math.max((e - s) * (HOUR_HEIGHT / 60), 20);
  return { top: `${top}px`, height: `${height}px` };
};

const bookedStyle = (timeLabel) => {
  const mins = toMinutes12h(timeLabel);
  if (mins == null) return { top: "0px", height: `${HOUR_HEIGHT}px` };
  const top = Math.max(0, (mins - GRID_START_MINS) * (HOUR_HEIGHT / 60));
  return { top: `${top}px`, height: `${HOUR_HEIGHT}px` };
};

const calcHours = (sched) =>
  sched.reduce((acc, d) =>
    acc + d.slots.reduce((s, slot) =>
      s + (toMinutes(slot.end) - toMinutes(slot.start)) / 60, 0), 0);

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */
export default function DoctorAvailabilityPage() {
  const { authHeaders } = useAuth();

  /* ── week navigation ─────────────────────────────────────────────────── */
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  /* ── tab ─────────────────────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState("physical");

  /* ── schedules ───────────────────────────────────────────────────────── */
  const [physicalSchedule, setPhysicalSchedule] = useState(emptySchedule);
  const [onlineSchedule,   setOnlineSchedule]   = useState(emptySchedule);

  /* ── blocked-time entries (per tab) ─────────────────────────────────── */
  const [physicalBlocked, setPhysicalBlocked] = useState([]);
  const [onlineBlocked,   setOnlineBlocked]   = useState([]);

  /* ── booked appointments ─────────────────────────────────────────────── */
  const [allBooked, setAllBooked] = useState([]);

  /* ── block-time form ─────────────────────────────────────────────────── */
  const [blockDay,        setBlockDay]        = useState("Monday");
  const [blockStart,      setBlockStart]      = useState("09:00");
  const [blockEnd,        setBlockEnd]        = useState("12:00");
  const [editingBlockId,  setEditingBlockId]  = useState(null);
  const [showBlockPanel,  setShowBlockPanel]  = useState(false);

  /* ── context menu ────────────────────────────────────────────────────── */
  const [contextMenu, setContextMenu] = useState(null);
  const ctxRef = useRef(null);

  /* ── misc UI ─────────────────────────────────────────────────────────── */
  const [msg,     setMsg]     = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  /* ── derived (active tab) ────────────────────────────────────────────── */
  const schedule         = activeTab === "physical" ? physicalSchedule : onlineSchedule;
  const conflictSchedule = activeTab === "physical" ? onlineSchedule   : physicalSchedule;
  const blockedEntries   = activeTab === "physical" ? physicalBlocked   : onlineBlocked;
  const setBlockedEntries = activeTab === "physical" ? setPhysicalBlocked : setOnlineBlocked;
  const bookedSlots      = allBooked.filter((b) => (b.appointmentType || "physical") === activeTab);
  const endpoint         = activeTab === "physical" ? "/doctors/physical-availability" : "/doctors/online-availability";

  const TAB_COLOR  = activeTab === "physical" ? "#0f766e" : "#7c3aed";
  const TAB_LIGHT  = activeTab === "physical" ? "rgba(15,118,110,0.08)" : "rgba(124,58,237,0.08)";
  const TAB_BORDER = activeTab === "physical" ? "rgba(15,118,110,0.15)" : "rgba(124,58,237,0.15)";
  const TAB_TEXT   = activeTab === "physical" ? "#0f766e"                 : "#6d28d9";

  /* ── stats ───────────────────────────────────────────────────────────── */
  const physHours  = useMemo(() => calcHours(physicalSchedule), [physicalSchedule]);
  const onlineHours = useMemo(() => calcHours(onlineSchedule),  [onlineSchedule]);
  const utilization = useMemo(
    () => Math.min(100, Math.round(((physHours + onlineHours) / 84) * 100)),
    [physHours, onlineHours]
  );
  const conflictDays = useMemo(
    () => findConflictDays(
      activeTab === "physical" ? physicalSchedule : onlineSchedule,
      activeTab === "physical" ? onlineSchedule   : physicalSchedule
    ),
    [physicalSchedule, onlineSchedule, activeTab]
  );

  /* ─────────────────────────── effects ──────────────────────────────── */

  /* load doctor profile */
  useEffect(() => {
    api.get("/doctors/me", authHeaders)
      .then((res) => {
        const doc = res.data.doctor;
        const physAvail = doc?.physicalAvailability?.length ? doc.physicalAvailability : doc?.availability;
        if (physAvail?.length)             setPhysicalSchedule(mergeWithDays(physAvail));
        if (doc?.onlineAvailability?.length) setOnlineSchedule(mergeWithDays(doc.onlineAvailability));
      })
      .catch((e) => console.log("Missing profile or availability", e))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  /* load booked appointments */
  useEffect(() => {
    api.get("/appointments/doctor", authHeaders)
      .then((res) => {
        const appts = res.data?.appointments || [];
        const { weekStart: ws, weekEnd: we } = getCurrentWeekBounds();
        const grouped = {};
        for (const apt of appts) {
          if (["cancelled", "rejected"].includes(apt.status)) continue;
          const d = new Date(`${apt.date}T12:00:00`);
          if (isNaN(d) || d < ws || d > we) continue;
          const di  = d.getDay() === 0 ? 6 : d.getDay() - 1;
          const day = DAYS[di];
          const mins = toMinutes12h(apt.time);
          if (!day || mins == null) continue;
          const label = TIME_LABELS.find((l) => {
            const s = toMinutes12h(l);
            return s != null && mins >= s && mins < s + 60;
          });
          if (!label) continue;
          const type = apt.appointmentType || "physical";
          const key  = `${day}|${label}|${type}`;
          if (!grouped[key]) grouped[key] = { day, time: label, appointmentType: type, names: [] };
          grouped[key].names.push(apt.patientName || "Patient");
        }
        setAllBooked(Object.values(grouped).map((g) => {
          const u = [...new Set(g.names)];
          return { day: g.day, time: g.time, appointmentType: g.appointmentType,
            patientName: u.length === 1 ? u[0] : `${u[0]} +${u.length - 1}` };
        }));
      })
      .catch(() => setAllBooked([]));
  }, [authHeaders]);

  /* reset UI on tab switch */
  useEffect(() => {
    setMsg(""); setEditingBlockId(null); setContextMenu(null);
    setBlockDay("Monday"); setBlockStart("09:00"); setBlockEnd("12:00");
  }, [activeTab]);

  /* close context menu on outside click */
  useEffect(() => {
    if (!contextMenu) return;
    const h = (e) => { if (ctxRef.current && !ctxRef.current.contains(e.target)) setContextMenu(null); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [contextMenu]);

  /* ─────────────────────────── slot helpers ──────────────────────────── */

  const setter = () => activeTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;

  const addSlot = (di) => {
    setter()((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[di].slots.push({ start: "09:00", end: "17:00" });
      next[di].slots = normalizeSlots(next[di].slots);
      return next;
    });
  };

  const removeSlot = (di, si) => {
    setter()((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[di].slots.splice(si, 1);
      next[di].slots = normalizeSlots(next[di].slots);
      return next;
    });
  };

  const updateSlot = (di, si, field, value) => {
    setter()((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[di].slots[si] = { ...next[di].slots[si], [field]: value };
      next[di].slots = normalizeSlots(next[di].slots);
      return next;
    });
  };

  const isHourCovered = (di, hi) => {
    const s = (8 + hi) * 60;
    return schedule[di].slots.some((sl) => toMinutes(sl.start) <= s && toMinutes(sl.end) > s);
  };

  const isConflicted = (di, hi) => {
    const s = (8 + hi) * 60, e = s + 60;
    return conflictSchedule[di].slots.some((sl) => s < toMinutes(sl.end) && e > toMinutes(sl.start));
  };

  const isBooked = (di, hi) => {
    const hm = (8 + hi) * 60;
    return bookedSlots.some((b) => b.day === DAYS[di] && toMinutes12h(b.time) === hm);
  };

  const toggleHourSlot = (di, hi) => {
    if (isConflicted(di, hi)) {
      const other = activeTab === "physical" ? "online" : "physical";
      setMsg(`This hour conflicts with your ${other} schedule.`);
      return;
    }
    const sm = (8 + hi) * 60, em = sm + 60;
    setter()((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      const covered = next[di].slots.some((sl) => toMinutes(sl.start) <= sm && toMinutes(sl.end) >= em);
      if (covered) {
        next[di].slots = normalizeSlots(next[di].slots.flatMap((sl) => subtractRangeFromSlot(sl, sm, em)));
      } else {
        next[di].slots = normalizeSlots([...next[di].slots, { start: toTimeString(sm), end: toTimeString(em) }]);
      }
      return next;
    });
  };

  /* ─────────────────────────── bulk actions ──────────────────────────── */

  const handleMarkAllAvailable = () => {
    const all = DAYS.map((day) => ({ day, slots: [{ start: "08:00", end: "21:00" }] }));
    const other = activeTab === "physical" ? onlineSchedule : physicalSchedule;
    const cf = findConflictDays(all, other);
    if (cf.length) { setMsg(`Conflicts with ${activeTab === "physical" ? "online" : "physical"} schedule on: ${cf.join(", ")}.`); return; }
    setter()(all); setMsg("");
  };

  const handleMarkAllUnavailable = () => { setter()(emptySchedule()); setMsg(""); };

  const handleCopyMonday = () => {
    const mon = schedule[0].slots;
    setter()(DAYS.map((day) => ({ day, slots: normalizeSlots([...mon]) })));
    setMsg("Monday's slots copied to all days. Save to apply.");
  };

  /* ─────────────────────────── context menu ──────────────────────────── */

  const ctxMarkUnavailable = () => {
    if (!contextMenu) return;
    removeSlot(contextMenu.di, contextMenu.si);
    setContextMenu(null);
  };

  const ctxBlockTime = () => {
    if (!contextMenu) return;
    setBlockDay(DAYS[contextMenu.di]);
    setBlockStart(contextMenu.slot.start);
    setBlockEnd(contextMenu.slot.end);
    setShowBlockPanel(true);
    setContextMenu(null);
  };

  const ctxMoveType = () => {
    if (!contextMenu) return;
    const { di, si, slot } = contextMenu;
    if (activeTab === "physical") {
      setPhysicalSchedule((p) => p.map((d, i) => i === di ? { ...d, slots: d.slots.filter((_, idx) => idx !== si) } : d));
      setOnlineSchedule((p) => p.map((d, i) => i === di ? { ...d, slots: normalizeSlots([...d.slots, slot]) } : d));
      setMsg("Slot moved to Online schedule. Save both tabs to apply.");
    } else {
      setOnlineSchedule((p) => p.map((d, i) => i === di ? { ...d, slots: d.slots.filter((_, idx) => idx !== si) } : d));
      setPhysicalSchedule((p) => p.map((d, i) => i === di ? { ...d, slots: normalizeSlots([...d.slots, slot]) } : d));
      setMsg("Slot moved to Physical schedule. Save both tabs to apply.");
    }
    setContextMenu(null);
  };

  /* ─────────────────────────── save ─────────────────────────────────── */

  const handleSave = async () => {
    const curSched  = activeTab === "physical" ? physicalSchedule : onlineSchedule;
    const otherSched = activeTab === "physical" ? onlineSchedule  : physicalSchedule;
    try {
      setSaving(true); setMsg("Saving...");
      const cleaned = curSched.map((d) => ({ ...d, slots: normalizeSlots(d.slots) }));
      if (cleaned.some((d) => d.slots.some((s) => toMinutes(s.start) >= toMinutes(s.end)))) {
        setMsg("Fix invalid time ranges before saving."); return;
      }
      const cf = findConflictDays(cleaned, otherSched);
      if (cf.length) { setMsg(`Conflict on: ${cf.join(", ")}. Resolve before saving.`); return; }
      await api.put(endpoint, { availability: cleaned.filter((d) => d.slots.length) }, authHeaders);
      if (activeTab === "physical") setPhysicalSchedule(cleaned); else setOnlineSchedule(cleaned);
      setMsg(`${activeTab === "physical" ? "Physical" : "Online"} schedule updated successfully.`);
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to save schedule.");
    } finally { setSaving(false); }
  };

  /* ─────────────────────────── block time ────────────────────────────── */

  const handleBlockTime = async () => {
    const curTab    = activeTab;
    const curSched  = curTab === "physical" ? physicalSchedule : onlineSchedule;
    const setSched  = curTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    const setBlocked = curTab === "physical" ? setPhysicalBlocked  : setOnlineBlocked;
    const curBlocked = curTab === "physical" ? physicalBlocked      : onlineBlocked;
    const ep        = curTab === "physical" ? "/doctors/physical-availability" : "/doctors/online-availability";

    const sm = toMinutes(blockStart), em = toMinutes(blockEnd);
    if (sm >= em) { setMsg("End time must be after start time."); return; }
    try {
      setSaving(true); setMsg("Saving blocked time...");
      const editing = editingBlockId ? curBlocked.find((e) => e.id === editingBlockId) : null;
      let work = curSched.map((d) => ({ ...d, slots: [...d.slots] }));
      if (editing) {
        work = work.map((d) => d.day !== editing.day ? d :
          { ...d, slots: normalizeSlots([...d.slots, { start: editing.start, end: editing.end }]) });
      }
      const updated = work.map((d) => d.day !== blockDay ? d :
        { ...d, slots: normalizeSlots(normalizeSlots(d.slots).flatMap((s) => subtractRangeFromSlot(s, sm, em))
          .filter((s) => toMinutes(s.start) < toMinutes(s.end))) });
      await api.put(ep, { availability: updated.filter((d) => d.slots.length) }, authHeaders);
      setSched(updated);
      setBlocked((prev) => editingBlockId
        ? prev.map((e) => e.id === editingBlockId ? { ...e, day: blockDay, start: blockStart, end: blockEnd } : e)
        : [...prev, { id: `${Date.now()}-${Math.random()}`, day: blockDay, start: blockStart, end: blockEnd }]
      );
      setEditingBlockId(null); setShowBlockPanel(false);
      setMsg(`${blockDay} blocked ${blockStart}–${blockEnd}.`);
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to save blocked time.");
    } finally { setSaving(false); }
  };

  const handleEditBlock = (entry) => {
    setBlockDay(entry.day); setBlockStart(entry.start); setBlockEnd(entry.end);
    setEditingBlockId(entry.id); setShowBlockPanel(true);
    setMsg(`Editing block: ${entry.day} ${entry.start}–${entry.end}`);
  };

  const handleDeleteBlock = async (entry) => {
    const curTab  = activeTab;
    const curSched = curTab === "physical" ? physicalSchedule : onlineSchedule;
    const setSched  = curTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    const setBlocked = curTab === "physical" ? setPhysicalBlocked  : setOnlineBlocked;
    const ep = curTab === "physical" ? "/doctors/physical-availability" : "/doctors/online-availability";
    try {
      setSaving(true);
      const updated = curSched.map((d) => d.day !== entry.day ? d :
        { ...d, slots: normalizeSlots([...d.slots, { start: entry.start, end: entry.end }]) });
      await api.put(ep, { availability: updated.filter((d) => d.slots.length) }, authHeaders);
      setSched(updated);
      setBlocked((p) => p.filter((x) => x.id !== entry.id));
      if (editingBlockId === entry.id) setEditingBlockId(null);
      setMsg(`Removed block ${entry.day} ${entry.start}–${entry.end}.`);
    } catch (err) {
      setMsg(err.response?.data?.message || "Failed to remove block.");
    } finally { setSaving(false); }
  };

  /* ─────────────────────────── render helpers ────────────────────────── */

  const renderDayColumn = (di) => {
    const dayItem = schedule[di];
    const dayBooked  = bookedSlots.filter((b) => b.day === DAYS[di]);
    const dayConflict = conflictSchedule[di];

    return (
      <div className="h-full relative">
        {/* Clickable hour rows (empty cells) */}
        {TIME_LABELS.map((_, hi) => {
          const occupied = isHourCovered(di, hi) || isConflicted(di, hi) || isBooked(di, hi);
          return (
            <div
              key={hi}
              className={`h-20 transition-colors duration-200 ${
                !occupied ? "hover:bg-primary/[0.04] cursor-pointer" : "cursor-default"
              }`}
              onClick={() => !occupied && toggleHourSlot(di, hi)}
            />
          );
        })}

        {/* Available slot blocks */}
        {dayItem.slots.map((slot, si) => (
          <div
            key={si}
            className="absolute left-1 right-1 rounded-xl p-2.5 flex flex-col cursor-pointer overflow-hidden z-10 group transition-all duration-200 hover:shadow-lg hover:scale-[1.02]"
            style={{ ...slotStyle(slot.start, slot.end), backgroundColor: TAB_LIGHT, border: `1.5px solid ${TAB_BORDER}` }}
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu({ di, si, slot, x: e.clientX, y: e.clientY });
            }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: TAB_COLOR }} />
              <span className="text-[10px] font-black uppercase tracking-wider leading-none" style={{ color: TAB_TEXT }}>
                Available
              </span>
            </div>
            <span className="text-[11px] font-bold mt-0.5 leading-none" style={{ color: TAB_TEXT }}>
              {slot.start} – {slot.end}
            </span>
          </div>
        ))}

        {/* Conflict blocks (other type) */}
        {dayConflict.slots.map((slot, si) => (
          <div
            key={`cx-${si}`}
            className="absolute left-1 right-1 rounded-lg p-2 pointer-events-none overflow-hidden z-10"
            style={{
              ...slotStyle(slot.start, slot.end),
              backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 8px,rgba(249,115,22,0.12) 8px,rgba(249,115,22,0.12) 16px)",
              border: "1px solid rgba(251,146,60,0.4)",
            }}
          >
            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-tight">
              {activeTab === "physical" ? "Online" : "Physical"} Conflict
            </span>
            <span className="text-[9px] text-orange-500 leading-none">Dual booking alert</span>
          </div>
        ))}

        {/* Booked blocks */}
        {dayBooked.map((bk, bi) => (
          <div
            key={`bk-${bi}`}
            className="absolute left-1.5 right-1.5 rounded-xl p-2.5 flex flex-col group overflow-hidden z-20 shadow-md transition-all duration-200 hover:shadow-xl hover:scale-[1.02] border-l-4"
            style={{ 
              ...bookedStyle(bk.time), 
              backgroundColor: "white", 
              border: "1px solid rgba(0,0,0,0.05)",
              borderLeftColor: activeTab === "physical" ? "#0f766e" : "#7c3aed"
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest">Booked</span>
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant/40">lock</span>
            </div>
            <span className="text-[11px] font-bold text-on-surface truncate">{bk.patientName}</span>
            <span className="text-[9px] font-medium text-on-surface-variant mt-0.5">{bk.time}</span>
            
            {/* Tooltip */}
            <div className="hidden group-hover:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 bg-surface-container-highest text-on-surface px-3 py-2 rounded-xl text-[10px] whitespace-nowrap flex-col gap-0.5 shadow-2xl border border-outline-variant/20">
              <span className="font-black">{bk.patientName}</span>
              <span className="font-bold opacity-70">{bk.time}</span>
              <span className="text-[9px] text-primary mt-1 font-black uppercase tracking-tighter">View Details</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ─────────────────────────── loading ───────────────────────────────── */
  if (loading) {
    return (
      <DoctorShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DoctorShell>
    );
  }

  /* ═════════════════════════════ JSX ════════════════════════════════════ */
  return (
    <DoctorShell>
      <div className="px-10 py-10 max-w-[1500px] mx-auto space-y-8 bg-surface/30 min-h-screen">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-headline font-black text-on-surface tracking-tight">
              Clinical Schedule
            </h1>
            <p className="text-on-surface-variant/80 mt-2 text-base font-medium">
              Optimize your workflow across physical and virtual consultations.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="bg-surface-container-low/50 backdrop-blur-sm p-1.5 rounded-2xl flex gap-1.5 border border-outline-variant/10 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("physical")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "physical"
                  ? "bg-white text-teal-800 shadow-md scale-[1.02]"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">local_hospital</span>
              Physical
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("online")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                activeTab === "online"
                  ? "bg-white text-violet-700 shadow-md scale-[1.02]"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest/50"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">videocam</span>
              Virtual
            </button>
          </div>
        </div>

        {/* ── Status message ───────────────────────────────────────────── */}
        {msg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            msg.includes("success") || msg.includes("updated")
              ? "bg-tertiary-container/50 text-on-tertiary-container"
              : msg.includes("Conflict") || msg.includes("conflict") || msg.includes("Failed") || msg.includes("invalid")
                ? "bg-error-container/30 text-error"
                : "bg-surface-container text-on-surface-variant"
          }`}>
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              {msg.includes("success") || msg.includes("updated") ? "check_circle" : "info"}
            </span>
            {msg}
          </div>
        )}

        {/* ── Conflict warning ─────────────────────────────────────────── */}
        {conflictDays.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(251,146,60,0.25)", color: "#9a3412" }}>
            <span className="material-symbols-outlined text-sm text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <span>
              Overlap detected on <strong>{conflictDays.join(", ")}</strong> — physical and online schedules conflict.
              Remove orange cells before saving.
            </span>
          </div>
        )}

        {/* ── Quick actions bar ────────────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-2xl px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-[0px_16px_48px_-8px_rgba(42,52,57,0.08)] border border-outline-variant/10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleMarkAllAvailable}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-on-surface text-white text-xs font-black hover:bg-on-surface/90 transition-all duration-300 shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Set All Available
            </button>
            <button
              type="button"
              onClick={handleMarkAllUnavailable}
              className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-black hover:bg-surface-container-high transition-all duration-300 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">do_not_disturb_on</span>
              Clear All
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMonday}
              className="group flex items-center gap-2 px-5 py-3 rounded-xl text-on-surface hover:bg-surface-container-low text-xs font-bold transition-all duration-300"
            >
              <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">content_copy</span>
              Copy Monday
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold transition-all duration-500 disabled:opacity-50 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px] group-hover:animate-spin-slow">sync</span>
              {saving ? "Syncing..." : "Publish Schedule"}
            </button>
          </div>
        </div>

        {/* ── Calendar ─────────────────────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_-4px_rgba(42,52,57,0.06)] overflow-hidden">
          
          {/* Top Integrated Legend & Controls */}
          <div className="flex flex-wrap items-center justify-between px-6 py-3 border-b border-outline-variant/10 bg-white">
            <div className="flex flex-wrap items-center gap-5">
              <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Schedule Key</span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TAB_LIGHT, border: `1px solid ${TAB_BORDER}` }} />
                <span className="text-[10px] font-black text-on-surface-variant/80 uppercase tracking-tighter">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeTab === "physical" ? "#0f766e" : "#7c3aed" }} />
                <span className="text-[10px] font-black text-on-surface-variant/80 uppercase tracking-tighter">Booked</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 2px,rgba(249,115,22,0.4) 2px,rgba(249,115,22,0.4) 4px)", border: "1px solid rgba(251,146,60,0.4)" }} />
                <span className="text-[10px] font-black text-on-surface-variant/80 uppercase tracking-tighter">Conflict</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary/[0.04] border border-dashed border-primary/30" />
                <span className="text-[10px] font-black text-on-surface-variant/80 uppercase tracking-tighter">Selectable</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-[1px] h-4 bg-outline-variant/20 mx-1 hidden md:block" />
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${activeTab === 'physical' ? 'bg-teal-600' : 'bg-violet-600'}`} />
                <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">{activeTab} Mode</span>
              </div>
            </div>
          </div>

          {/* Days header row */}
          <div className="flex border-b border-outline-variant/10 bg-white sticky top-0 z-30 shadow-sm">
            {/* Time column header — week nav */}
            <div className="w-24 flex-shrink-0 border-r border-outline-variant/10 flex flex-col items-center justify-center py-4 gap-2 bg-surface-container-lowest">
              <div className="flex items-center gap-1.5 bg-surface-container-low/50 p-1 rounded-xl border border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-white hover:shadow-sm transition-all duration-200 active:scale-90"
                >
                  <span className="material-symbols-outlined text-lg font-bold">chevron_left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-white hover:shadow-sm transition-all duration-200 active:scale-90"
                >
                  <span className="material-symbols-outlined text-lg font-bold">chevron_right</span>
                </button>
              </div>
              <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">GMT+5.5</span>
            </div>

            {/* Day columns */}
            {weekDays.map((date, idx) => {
              const today = isToday(date);
              return (
                <div
                  key={idx}
                  className={`flex-1 py-4 text-center border-r border-outline-variant/10 last:border-r-0 transition-colors duration-300 ${
                    today ? "bg-primary/[0.04]" : "bg-white"
                  }`}
                >
                  <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${today ? "text-primary" : "text-on-surface-variant/60"}`}>
                    {format(date, "EEE")}
                  </p>
                  <div className="flex flex-col items-center mt-1">
                    <p className={`text-xl font-headline font-black leading-none ${today ? "text-on-surface" : "text-on-surface-variant"}`}>
                      {format(date, "d")}
                    </p>
                    {today && (
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,106,97,0.6)]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrollable grid */}
          <div className="flex h-[600px] overflow-y-auto relative bg-white" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,0,0,0.1) transparent" }}>

            {/* Sticky time labels */}
            <div className="w-24 flex-shrink-0 sticky left-0 z-20 border-r border-outline-variant/10 bg-surface-container-lowest/80 backdrop-blur-md">
              {TIME_LABELS.map((label) => (
                <div key={label} className="h-20 flex flex-col items-center justify-center border-b border-outline-variant/5">
                  <span className="text-[11px] font-black text-on-surface tracking-tighter">
                    {label.split(" ")[0]}
                  </span>
                  <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">
                    {label.split(" ")[1]}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns container */}
            <div className="flex flex-1 relative min-w-[800px]">
              {/* Horizontal grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                {TIME_LABELS.map((_, hi) => (
                  <div key={hi} className="h-20 border-b border-outline-variant/5 w-full" />
                ))}
              </div>
              
              {/* Vertical day columns */}
              {DAYS.map((_, di) => (
                <div key={di} className="flex-1 relative border-r border-outline-variant/10 last:border-r-0">
                  {renderDayColumn(di)}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Status Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-outline-variant/5 bg-surface-container-lowest/30">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[18px]">info</span>
              <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">
                Directly interact with the grid to manage your weekly availability
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] font-black px-4 py-1.5 rounded-full bg-white shadow-sm border border-outline-variant/5 text-on-surface-variant uppercase tracking-widest">
                GMT+5.5 COLOMBO
              </div>
            </div>
          </div>
        </div>

        {/* ── Block time panel ─────────────────────────────────────────── */}
        {showBlockPanel && (
          <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-8 shadow-[0px_32px_80px_-16px_rgba(42,52,57,0.15)] border border-white relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-error/20" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">event_busy</span>
                </div>
                <div>
                  <h3 className="font-headline font-black text-xl text-on-surface tracking-tight">Block Schedule</h3>
                  <p className="text-xs text-on-surface-variant/60 mt-1 font-medium italic">Define periods of unavailability</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowBlockPanel(false); setEditingBlockId(null); }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-all duration-300"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 items-end gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] ml-2">Day of Week</label>
                <select
                  value={blockDay}
                  onChange={(e) => setBlockDay(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-white px-5 py-3 text-sm font-bold text-on-surface shadow-sm ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-error/20 transition-all duration-300 appearance-none"
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] ml-2">Start Time</label>
                <input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-white px-5 py-3 text-sm font-bold text-on-surface shadow-sm ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-error/20 transition-all duration-300" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.2em] ml-2">End Time</label>
                <input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)}
                  className="w-full rounded-2xl border-0 bg-white px-5 py-3 text-sm font-bold text-on-surface shadow-sm ring-1 ring-outline-variant/10 focus:ring-2 focus:ring-error/20 transition-all duration-300" />
              </div>
              <button
                type="button"
                onClick={handleBlockTime}
                disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-on-surface text-white text-sm font-black hover:bg-error transition-all duration-500 shadow-lg shadow-error/10 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                {editingBlockId ? "Update Restriction" : "Apply Restriction"}
              </button>
            </div>
          </div>
        )}

        {/* ── Day-wise slot editor ─────────────────────────────────────── */}
        <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] shadow-[0px_24px_64px_-12px_rgba(42,52,57,0.1)] border border-white/60 overflow-hidden">

          {/* Section header */}
          <div className="px-8 py-6 flex items-center justify-between border-b border-surface-container-low/30 bg-white/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 shadow-inner" style={{ backgroundColor: TAB_LIGHT }}>
                <span className="material-symbols-outlined text-[24px]" style={{ color: TAB_COLOR }}>auto_schedule</span>
              </div>
              <div>
                <h3 className="font-headline font-black text-lg text-on-surface tracking-tight">
                  Day-by-Day Configuration
                </h3>
                <p className="text-xs text-on-surface-variant/70 mt-1 font-medium">
                  Fine-tune your {activeTab} consultation slots with precision.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowBlockPanel((s) => !s)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black text-error hover:bg-error/5 transition-all duration-300"
              >
                <span className="material-symbols-outlined text-[18px]">event_busy</span>
                Block Hours
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-white text-xs font-black hover:opacity-90 transition-all duration-300 shadow-lg disabled:opacity-50 active:scale-95"
                style={{ backgroundColor: TAB_COLOR }}
              >
                <span className="material-symbols-outlined text-[18px]">{saving ? "hourglass_top" : "published_with_changes"}</span>
                {saving ? "Publishing..." : "Update Availability"}
              </button>
            </div>
          </div>

          {/* Day rows */}
          <div className="p-4 space-y-3">
            {schedule.map((dayItem, di) => {
              const hasSlots = dayItem.slots.length > 0;
              const dayHours = dayItem.slots.reduce(
                (acc, s) => acc + (toMinutes(s.end) - toMinutes(s.start)) / 60, 0
              );
              const SHORT_DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][di];
              const GRID_S = 8 * 60, GRID_T = 13 * 60;

              return (
                <div
                  key={dayItem.day}
                  className={`group relative flex flex-col md:flex-row items-center gap-6 p-4 rounded-[2rem] transition-all duration-300 ${
                    hasSlots ? "bg-white shadow-sm border border-outline-variant/5" : "bg-transparent grayscale opacity-60"
                  } hover:shadow-md hover:border-outline-variant/20`}
                >
                  {/* Day badge */}
                  <div
                    className="flex-shrink-0 w-20 h-20 rounded-[1.75rem] flex flex-col items-center justify-center gap-1 transition-all duration-500 group-hover:scale-105 shadow-inner"
                    style={{
                      backgroundColor: hasSlots ? TAB_LIGHT : "rgba(0,0,0,0.03)",
                    }}
                  >
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.2em] leading-none"
                      style={{ color: hasSlots ? TAB_TEXT : "#94a3b8" }}
                    >
                      {SHORT_DAY}
                    </span>
                    <span
                      className="text-xl font-headline font-black leading-none mt-1"
                      style={{ color: hasSlots ? TAB_COLOR : "#cbd5e1" }}
                    >
                      {hasSlots ? `${Math.round(dayHours * 10) / 10}` : "0"}
                    </span>
                    <span className="text-[8px] font-bold uppercase opacity-50">Hours</span>
                  </div>

                  {/* Slots + timeline */}
                  <div className="flex-1 flex flex-col gap-3 min-w-0 w-full">
                    {/* Slot rows */}
                    <div className="flex flex-wrap gap-3">
                      {dayItem.slots.map((slot, si) => {
                        const durMins = toMinutes(slot.end) - toMinutes(slot.start);
                        const durLabel = durMins > 0
                          ? durMins >= 60
                            ? `${Math.floor(durMins / 60)}h ${durMins % 60 ? `${durMins % 60}m` : ""}`
                            : `${durMins}m`
                          : "—";

                        return (
                          <div
                            key={si}
                            className="flex items-center gap-2.5 pl-2 pr-1.5 py-1.5 rounded-2xl bg-surface-container-low/40 border border-outline-variant/10 hover:border-outline-variant/30 hover:bg-white transition-all duration-300 shadow-sm"
                          >
                            <input
                              type="time"
                              value={slot.start}
                              onChange={(e) => updateSlot(di, si, "start", e.target.value)}
                              className="bg-transparent border-0 p-0 text-sm font-black text-on-surface focus:ring-0 w-[70px] text-center"
                            />
                            <div className="w-1.5 h-[1.5px] bg-outline-variant/40 rounded-full" />
                            <input
                              type="time"
                              value={slot.end}
                              onChange={(e) => updateSlot(di, si, "end", e.target.value)}
                              className="bg-transparent border-0 p-0 text-sm font-black text-on-surface focus:ring-0 w-[70px] text-center"
                            />
                            <div className="h-6 w-[1px] bg-outline-variant/20 mx-1" />
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-white text-on-surface-variant shadow-inner whitespace-nowrap">
                              {durLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeSlot(di, si)}
                              className="p-1.5 rounded-xl text-on-surface-variant/40 hover:text-error hover:bg-error/5 transition-all duration-300"
                            >
                              <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                          </div>
                        );
                      })}

                      {/* Add slot button */}
                      <button
                        type="button"
                        onClick={() => addSlot(di)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all duration-300 hover:scale-105 active:scale-95 border border-dashed"
                        style={{
                          color: TAB_COLOR,
                          borderColor: TAB_BORDER,
                          backgroundColor: `${TAB_COLOR}05`,
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Add Slot
                      </button>
                    </div>

                    {/* Timeline bar */}
                    {hasSlots && (
                      <div className="relative h-1.5 rounded-full bg-surface-container-lowest shadow-inner mt-2 overflow-hidden w-full max-w-md">
                        {dayItem.slots.map((slot, si) => {
                          const left = Math.max(0, ((toMinutes(slot.start) - GRID_S) / GRID_T) * 100);
                          const width = Math.min(100 - left, ((toMinutes(slot.end) - toMinutes(slot.start)) / GRID_T) * 100);
                          return (
                            <div
                              key={si}
                              className="absolute h-full rounded-full shadow-sm"
                              style={{ left: `${left}%`, width: `${width}%`, backgroundColor: TAB_COLOR }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="hidden md:flex flex-col items-end gap-1 px-4">
                     <span className={`text-[10px] font-black uppercase tracking-widest ${hasSlots ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                        {hasSlots ? 'Active' : 'Inactive'}
                     </span>
                     <div className={`w-2 h-2 rounded-full ${hasSlots ? 'bg-primary shadow-[0_0_10px_rgba(0,106,97,0.4)]' : 'bg-on-surface-variant/20'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Blocked time entries ─────────────────────────────────────── */}
        {blockedEntries.length > 0 && (
          <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] p-8 shadow-[0px_24px_64px_-12px_rgba(42,52,57,0.1)] border border-white/60">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-error">event_busy</span>
              <h4 className="font-headline font-black text-lg text-on-surface tracking-tight">Active Schedule Restrictions</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blockedEntries.map((entry) => (
                <div key={entry.id}
                  className="group flex flex-col justify-between rounded-3xl p-5 bg-white border border-error/10 hover:border-error/30 hover:shadow-xl hover:shadow-error/5 transition-all duration-500">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-error/5 text-error flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">block</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleEditBlock(entry)}
                        className="p-2 rounded-xl text-on-surface-variant/40 hover:text-primary hover:bg-primary/5 transition-all">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button type="button" onClick={() => handleDeleteBlock(entry)}
                        className="p-2 rounded-xl text-on-surface-variant/40 hover:text-error hover:bg-error/5 transition-all">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-1">{entry.day}</span>
                    <span className="text-base font-black text-on-surface">
                      {entry.start} – {entry.end}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer stats ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Weekly Utilization",
              value: `${utilization}%`,
              sub: `+${Math.max(0, utilization - 64)}% Performance`,
              icon: "trending_up",
              color: "text-teal-600",
              bg: "bg-teal-50",
            },
            {
              label: "In-Person Hours",
              value: Math.round(physHours),
              sub: "Clinic Availability",
              icon: "location_on",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              label: "Virtual Hours",
              value: Math.round(onlineHours),
              sub: "Digital Availability",
              icon: "videocam",
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              label: "Schedule Health",
              value: conflictDays[0] ? "Alert" : "Stable",
              sub: conflictDays[0] ? `${conflictDays.length} overlaps` : "No conflicts",
              icon: conflictDays[0] ? "warning" : "verified_user",
              color: conflictDays[0] ? "text-error" : "text-emerald-600",
              bg: conflictDays[0] ? "bg-error/10" : "bg-emerald-50",
            },
          ].map((stat) => (
            <div key={stat.label} className="group bg-white p-6 rounded-[2rem] shadow-sm border border-outline-variant/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-500">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center transition-transform duration-500 group-hover:scale-110`}>
                  <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant/20 group-hover:text-on-surface-variant/40 transition-colors">north_east</span>
              </div>
              <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.15em] mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-headline font-black text-on-surface tracking-tighter">
                  {stat.value}
                </span>
                <span className={`text-[10px] font-bold ${stat.color} opacity-80`}>{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Context menu ────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50 bg-white/90 backdrop-blur-xl rounded-3xl w-60 p-2 shadow-[0px_32px_80px_-16px_rgba(42,52,57,0.25)] border border-white/60 animate-in fade-in zoom-in duration-200"
          style={{
            left: Math.min(contextMenu.x + 8, window.innerWidth - 256),
            top:  Math.min(contextMenu.y + 4, window.innerHeight - 180),
          }}
        >
          <div className="px-4 py-3 mb-1 border-b border-surface-container-low/30">
            <span className="block text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Quick Actions</span>
            <span className="text-xs font-black text-on-surface">{contextMenu.slot.start} – {contextMenu.slot.end}</span>
          </div>
          <button type="button" onClick={ctxMarkUnavailable}
            className="w-full text-left px-4 py-3 text-sm font-bold text-on-surface hover:bg-error/5 hover:text-error rounded-2xl transition-all flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-error/5 text-error flex items-center justify-center group-hover:bg-error group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-[18px]">block</span>
            </div>
            Mark unavailable
          </button>
          <button type="button" onClick={ctxBlockTime}
            className="w-full text-left px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-low rounded-2xl transition-all flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-on-surface group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-[18px]">timer_off</span>
            </div>
            Block time range
          </button>
          <button type="button" onClick={ctxMoveType}
            className="w-full text-left px-4 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-low rounded-2xl transition-all flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-surface-container-low text-on-surface-variant flex items-center justify-center group-hover:bg-on-surface group-hover:text-white transition-all">
              <span className="material-symbols-outlined text-[18px]">
                {activeTab === "physical" ? "videocam" : "local_hospital"}
              </span>
            </div>
            Set as {activeTab === "physical" ? "Online" : "Physical"}
          </button>
        </div>
      )}
    </DoctorShell>
  );
}
