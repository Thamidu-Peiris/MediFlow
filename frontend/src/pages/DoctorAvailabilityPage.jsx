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

const HOUR_HEIGHT = 64;          // px per hour row
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

  const TAB_COLOR  = activeTab === "physical" ? "#006a61" : "#7c3aed";
  const TAB_LIGHT  = activeTab === "physical" ? "rgba(137,245,231,0.35)" : "rgba(221,214,254,0.5)";
  const TAB_BORDER = activeTab === "physical" ? "rgba(0,106,97,0.2)"     : "rgba(124,58,237,0.2)";
  const TAB_TEXT   = activeTab === "physical" ? "#005c54"                 : "#5b21b6";

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
      <div key={DAYS[di]} className="flex-1 relative border-r border-surface-container-low last:border-r-0 min-w-0">

        {/* Clickable hour rows (empty cells) */}
        {TIME_LABELS.map((_, hi) => {
          const occupied = isHourCovered(di, hi) || isConflicted(di, hi) || isBooked(di, hi);
          return (
            <div
              key={hi}
              className={`h-16 border-b border-surface-container-low/60 transition-colors ${
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
            className="absolute left-1 right-1 rounded-lg p-2 flex flex-col cursor-pointer overflow-hidden z-10"
            style={{ ...slotStyle(slot.start, slot.end), backgroundColor: TAB_LIGHT, border: `1px solid ${TAB_BORDER}` }}
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu({ di, si, slot, x: e.clientX, y: e.clientY });
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-tight leading-none" style={{ color: TAB_TEXT }}>
              Available
            </span>
            <span className="text-[9px] mt-0.5 opacity-60 leading-none" style={{ color: TAB_TEXT }}>
              {slot.start}–{slot.end}
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
            className="absolute left-1 right-1 rounded-lg p-2 flex flex-col group overflow-hidden z-20 shadow-sm"
            style={{ ...bookedStyle(bk.time), backgroundColor: "rgba(0,106,97,0.85)", border: "1px solid rgba(0,106,97,0.4)" }}
          >
            <span className="text-[9px] font-bold text-white/70 uppercase tracking-tight">Booked</span>
            <span className="text-xs font-bold text-white truncate">{bk.patientName}</span>
            {/* Tooltip */}
            <div className="hidden group-hover:flex absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 bg-on-surface text-white px-3 py-2 rounded-xl text-[10px] whitespace-nowrap flex-col gap-0.5 shadow-xl min-w-max">
              <span className="font-bold">{bk.patientName}</span>
              <span className="opacity-70">{bk.time}</span>
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
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-5 bg-surface min-h-screen">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">
              Availability Management
            </h1>
            <p className="text-on-surface-variant mt-1 text-sm">
              Orchestrate your clinical hours across physical and digital channels.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="bg-surface-container-low p-1 rounded-xl flex gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("physical")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "physical"
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Physical Appointments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("online")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === "online"
                  ? "bg-surface-container-lowest text-violet-700 shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Online Appointments
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
        <div className="bg-surface-container-lowest rounded-xl px-5 py-3.5 flex items-center justify-between shadow-[0px_12px_32px_-4px_rgba(42,52,57,0.06)]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMarkAllAvailable}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-dim transition-all"
            >
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Mark All Available
            </button>
            <button
              type="button"
              onClick={handleMarkAllUnavailable}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-container text-on-secondary-container text-xs font-bold hover:bg-surface-variant transition-all"
            >
              <span className="material-symbols-outlined text-sm">block</span>
              Mark All Unavailable
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyMonday}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-primary hover:bg-primary/[0.06] text-xs font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-sm">content_copy</span>
              Copy Monday to All Days
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-primary hover:bg-primary/[0.06] text-xs font-semibold transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">event_repeat</span>
              {saving ? "Saving…" : "Apply to Future Weeks"}
            </button>
          </div>
        </div>

        {/* ── Calendar ─────────────────────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_-4px_rgba(42,52,57,0.06)] overflow-hidden">

          {/* Days header row */}
          <div className="flex border-b border-surface-container-low bg-surface-container-lowest sticky top-0 z-10">
            {/* Time column header — week nav */}
            <div className="w-20 flex-shrink-0 border-r border-surface-container-low flex flex-col items-center justify-center py-3 gap-1">
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w - 1)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-on-surface-variant hover:text-primary hover:bg-primary/[0.06] transition-colors"
              >
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((w) => w + 1)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-on-surface-variant hover:text-primary hover:bg-primary/[0.06] transition-colors"
              >
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>

            {/* Day columns */}
            {weekDays.map((date, idx) => {
              const today = isToday(date);
              return (
                <div
                  key={idx}
                  className={`flex-1 py-3.5 text-center border-r border-surface-container-low last:border-r-0 ${today ? "bg-primary/[0.03]" : ""}`}
                >
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${today ? "text-primary" : "text-on-surface-variant"}`}>
                    {format(date, "EEE")}
                  </p>
                  <p className={`text-base font-headline font-bold mt-0.5 ${today ? "text-on-surface" : "text-on-surface-variant"}`}>
                    {format(date, "d")}
                  </p>
                  {today && (
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Today</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Scrollable grid */}
          <div className="flex h-[580px] overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>

            {/* Sticky time labels */}
            <div className="w-20 flex-shrink-0 sticky left-0 z-10 border-r border-surface-container-low bg-surface-container-low/40">
              {TIME_LABELS.map((label) => (
                <div key={label} className="h-16 flex items-center justify-center border-b border-surface-container-low/60">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">
                    {label.replace(":00 ", "\u00A0")}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex flex-1">
              {DAYS.map((_, di) => renderDayColumn(di))}
            </div>
          </div>

          {/* Calendar legend footer */}
          <div className="flex items-center gap-6 px-5 py-3 border-t border-surface-container-low/60 bg-surface-container-low/20">
            <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Legend</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TAB_LIGHT, border: `1px solid ${TAB_BORDER}` }} />
              <span className="text-[10px] font-semibold text-on-surface-variant">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(0,106,97,0.85)" }} />
              <span className="text-[10px] font-semibold text-on-surface-variant">Booked</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(249,115,22,0.3) 3px,rgba(249,115,22,0.3) 6px)", border: "1px solid rgba(251,146,60,0.4)" }} />
              <span className="text-[10px] font-semibold text-on-surface-variant">Conflict</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-primary/[0.04] border border-dashed border-primary/30" />
              <span className="text-[10px] font-semibold text-on-surface-variant">Click to toggle</span>
            </div>
            <div className="ml-auto text-[10px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: TAB_LIGHT, color: TAB_TEXT }}>
              {activeTab === "physical" ? "Physical" : "Online"} Mode
            </div>
          </div>
        </div>

        {/* ── Block time panel ─────────────────────────────────────────── */}
        {showBlockPanel && (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_12px_32px_-4px_rgba(42,52,57,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-base">timer_off</span>
                <h3 className="font-headline font-bold text-base text-on-surface">Block Time Range</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowBlockPanel(false); setEditingBlockId(null); }}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Day</label>
                <select
                  value={blockDay}
                  onChange={(e) => setBlockDay(e.target.value)}
                  className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">From</label>
                <input type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)}
                  className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">To</label>
                <input type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)}
                  className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <button
                type="button"
                onClick={handleBlockTime}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-error text-on-error text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {editingBlockId ? "Update Block" : "Apply Block"}
              </button>
            </div>
          </div>
        )}

        {/* ── Day-wise slot editor ─────────────────────────────────────── */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-[0px_12px_32px_-4px_rgba(42,52,57,0.06)] overflow-hidden">

          {/* Section header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: TAB_LIGHT }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: TAB_COLOR }}>calendar_month</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-[15px] text-on-surface leading-tight">
                  {activeTab === "physical" ? "Physical" : "Online"} Day-wise Slots
                </h3>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  Configure available hours for each day of the week
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBlockPanel((s) => !s)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-error hover:bg-error/[0.07] transition-all"
              >
                <span className="material-symbols-outlined text-sm">timer_off</span>
                Block Time
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-white text-xs font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: TAB_COLOR }}
              >
                <span className="material-symbols-outlined text-sm">{saving ? "hourglass_top" : "save"}</span>
                {saving ? "Saving…" : "Save Schedule"}
              </button>
            </div>
          </div>

          {/* Day rows */}
          <div>
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
                  className="flex items-start gap-4 px-6 py-4"
                  style={{ background: di % 2 !== 0 ? "rgba(0,0,0,0.015)" : "transparent" }}
                >
                  {/* Day badge */}
                  <div
                    className="flex-shrink-0 w-[60px] h-[60px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all"
                    style={{
                      backgroundColor: hasSlots ? TAB_LIGHT : "rgba(0,0,0,0.04)",
                    }}
                  >
                    <span
                      className="text-[9px] font-extrabold uppercase tracking-widest leading-none"
                      style={{ color: hasSlots ? TAB_TEXT : "#94a3b8" }}
                    >
                      {SHORT_DAY}
                    </span>
                    <span
                      className="text-sm font-headline font-extrabold leading-none mt-1"
                      style={{ color: hasSlots ? TAB_COLOR : "#cbd5e1" }}
                    >
                      {hasSlots ? `${Math.round(dayHours * 10) / 10}h` : "—"}
                    </span>
                  </div>

                  {/* Slots + timeline */}
                  <div className="flex-1 flex flex-col gap-2 min-w-0 pt-0.5">

                    {/* Empty state */}
                    {!hasSlots && (
                      <div className="flex items-center gap-2 h-9">
                        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container-low text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm text-on-surface-variant/50">do_not_disturb</span>
                          Unavailable — no slots configured
                        </div>
                      </div>
                    )}

                    {/* Slot rows */}
                    {dayItem.slots.map((slot, si) => {
                      const durMins = toMinutes(slot.end) - toMinutes(slot.start);
                      const durLabel = durMins > 0
                        ? durMins >= 60
                          ? `${Math.floor(durMins / 60)}h${durMins % 60 ? ` ${durMins % 60}m` : ""}`
                          : `${durMins}m`
                        : "—";

                      return (
                        <div
                          key={si}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                          style={{ backgroundColor: TAB_LIGHT, border: `1.5px solid ${TAB_BORDER}` }}
                        >
                          <span
                            className="material-symbols-outlined text-[16px] flex-shrink-0"
                            style={{ color: TAB_COLOR, fontVariationSettings: "'FILL' 1" }}
                          >
                            schedule
                          </span>

                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateSlot(di, si, "start", e.target.value)}
                            className="rounded-lg px-2.5 py-1 text-sm font-bold text-on-surface border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ backgroundColor: "rgba(255,255,255,0.75)", width: "108px" }}
                          />

                          <span className="material-symbols-outlined text-sm flex-shrink-0" style={{ color: TAB_COLOR }}>
                            arrow_forward
                          </span>

                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateSlot(di, si, "end", e.target.value)}
                            className="rounded-lg px-2.5 py-1 text-sm font-bold text-on-surface border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            style={{ backgroundColor: "rgba(255,255,255,0.75)", width: "108px" }}
                          />

                          {/* Duration badge */}
                          <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: "rgba(255,255,255,0.65)", color: TAB_TEXT }}
                          >
                            {durLabel}
                          </span>

                          <button
                            type="button"
                            onClick={() => removeSlot(di, si)}
                            className="ml-auto p-1.5 rounded-lg transition-all hover:bg-error/10 flex-shrink-0"
                          >
                            <span className="material-symbols-outlined text-sm text-error">close</span>
                          </button>
                        </div>
                      );
                    })}

                    {/* Mini timeline bar */}
                    {hasSlots && (
                      <div className="relative h-1 rounded-full bg-surface-container-low overflow-hidden">
                        {dayItem.slots.map((slot, si) => {
                          const left = Math.max(0, ((toMinutes(slot.start) - GRID_S) / GRID_T) * 100);
                          const width = Math.min(
                            100 - left,
                            ((toMinutes(slot.end) - toMinutes(slot.start)) / GRID_T) * 100
                          );
                          return (
                            <div
                              key={si}
                              className="absolute h-full rounded-full"
                              style={{ left: `${left}%`, width: `${width}%`, backgroundColor: TAB_COLOR }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Add slot button */}
                    <button
                      type="button"
                      onClick={() => addSlot(di)}
                      className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{
                        color: TAB_COLOR,
                        border: `1.5px dashed ${TAB_BORDER}`,
                        backgroundColor: "transparent",
                      }}
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add time slot
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Blocked time entries ─────────────────────────────────────── */}
        {blockedEntries.length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0px_12px_32px_-4px_rgba(42,52,57,0.06)]">
            <h4 className="font-headline font-bold text-sm text-on-surface mb-3">Blocked Time Entries</h4>
            <div className="space-y-2">
              {blockedEntries.map((entry) => (
                <div key={entry.id}
                  className="flex items-center justify-between rounded-lg px-4 py-2.5 bg-error-container/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-error text-sm">block</span>
                    <span className="text-sm font-medium text-error">
                      {entry.day} · {entry.start} – {entry.end}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleEditBlock(entry)}
                      className="px-3 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDeleteBlock(entry)}
                      className="px-3 py-1 rounded-lg border border-error/20 text-xs font-semibold text-error hover:bg-error/[0.08] transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer stats ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Weekly Utilization",
              value: `${utilization}%`,
              sub: `+${Math.max(0, utilization - 64)}% from last week`,
              subColor: "text-primary",
            },
            {
              label: "In-Person Slots",
              value: Math.round(physHours),
              sub: "Hours available",
              subColor: "text-on-surface-variant",
            },
            {
              label: "Virtual Slots",
              value: Math.round(onlineHours),
              sub: "Hours available",
              subColor: "text-on-surface-variant",
            },
            {
              label: "Next Conflict",
              value: conflictDays[0] ? conflictDays[0].slice(0, 3) : "—",
              sub: conflictDays[0] ? "Physical/Online overlap" : "No conflicts",
              subColor: conflictDays[0] ? "text-error" : "text-tertiary",
              valueColor: conflictDays[0] ? "text-error" : "text-on-surface",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-container-low p-5 rounded-xl">
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest mb-2">{stat.label}</p>
              <div className="flex items-end gap-2">
                <span className={`text-2xl font-headline font-extrabold ${stat.valueColor || "text-on-surface"}`}>
                  {stat.value}
                </span>
                <span className={`text-[10px] font-semibold mb-0.5 leading-tight ${stat.subColor}`}>{stat.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Context menu ────────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          ref={ctxRef}
          className="fixed z-50 bg-surface-container-lowest rounded-xl w-52 p-1.5"
          style={{
            boxShadow: "0px 12px 32px -4px rgba(42,52,57,0.18)",
            left: Math.min(contextMenu.x + 8, window.innerWidth - 224),
            top:  Math.min(contextMenu.y + 4, window.innerHeight - 160),
          }}
        >
          <button type="button" onClick={ctxMarkUnavailable}
            className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-on-surface-variant">block</span>
            Mark unavailable
          </button>
          <button type="button" onClick={ctxBlockTime}
            className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-on-surface-variant">timer_off</span>
            Block time
          </button>
          <button type="button" onClick={ctxMoveType}
            className="w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-low rounded-lg transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-on-surface-variant">
              {activeTab === "physical" ? "videocam" : "local_hospital"}
            </span>
            {activeTab === "physical" ? "Set as online" : "Set as physical"}
          </button>
        </div>
      )}
    </DoctorShell>
  );
}
