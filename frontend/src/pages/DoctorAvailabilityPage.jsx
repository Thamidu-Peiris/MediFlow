import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_LABELS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM",
];

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
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
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
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
    .filter((slot) => slot?.start && slot?.end)
    .filter((slot) => toMinutes(slot.start) < toMinutes(slot.end))
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

const subtractRangeFromSlot = (slot, blockStartMins, blockEndMins) => {
  const slotStart = toMinutes(slot.start);
  const slotEnd = toMinutes(slot.end);
  if (blockEndMins <= slotStart || blockStartMins >= slotEnd) return [slot];
  if (blockStartMins <= slotStart && blockEndMins >= slotEnd) return [];
  if (blockStartMins <= slotStart && blockEndMins < slotEnd)
    return [{ start: toTimeString(blockEndMins), end: slot.end }];
  if (blockStartMins > slotStart && blockEndMins >= slotEnd)
    return [{ start: slot.start, end: toTimeString(blockStartMins) }];
  return [
    { start: slot.start, end: toTimeString(blockStartMins) },
    { start: toTimeString(blockEndMins), end: slot.end },
  ];
};

/** Returns conflicting day names between two schedules */
const findConflictDays = (scheduleA, scheduleB) => {
  const conflicts = new Set();
  for (const dayA of scheduleA) {
    const dayB = scheduleB.find((d) => d.day === dayA.day);
    if (!dayB?.slots?.length) continue;
    for (const slotA of dayA.slots) {
      const sA = toMinutes(slotA.start);
      const eA = toMinutes(slotA.end);
      for (const slotB of dayB.slots) {
        const sB = toMinutes(slotB.start);
        const eB = toMinutes(slotB.end);
        if (sA < eB && eA > sB) { conflicts.add(dayA.day); break; }
      }
      if (conflicts.has(dayA.day)) break;
    }
  }
  return [...conflicts];
};

const emptySchedule = () => DAYS.map((day) => ({ day, slots: [] }));

const mergeWithDays = (avail) =>
  DAYS.map((day) => {
    const existing = (avail || []).find((a) => a.day === day);
    return existing ? { ...existing, slots: normalizeSlots(existing.slots || []) } : { day, slots: [] };
  });

export default function DoctorAvailabilityPage() {
  const { authHeaders } = useAuth();

  // ── Tab ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("physical");

  // ── Schedules ────────────────────────────────────────────────────────────────
  const [physicalSchedule, setPhysicalSchedule] = useState(emptySchedule);
  const [onlineSchedule, setOnlineSchedule] = useState(emptySchedule);

  // ── Block-time entries (separate per tab) ─────────────────────────────────
  const [physicalBlockedEntries, setPhysicalBlockedEntries] = useState([]);
  const [onlineBlockedEntries, setOnlineBlockedEntries] = useState([]);

  // ── Booked appointments (all, filtered per tab in derived values) ──────────
  const [allBookedSlots, setAllBookedSlots] = useState([]);

  // ── Misc UI state ─────────────────────────────────────────────────────────
  const [duration, setDuration] = useState("30 min");
  const [bufferTime, setBufferTime] = useState("10 minutes");
  const [recurring, setRecurring] = useState(true);
  const [blockDay, setBlockDay] = useState("Monday");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Derived active-tab values ─────────────────────────────────────────────
  const schedule = activeTab === "physical" ? physicalSchedule : onlineSchedule;
  const blockedEntries = activeTab === "physical" ? physicalBlockedEntries : onlineBlockedEntries;
  const conflictSchedule = activeTab === "physical" ? onlineSchedule : physicalSchedule;
  const bookedSlots = allBookedSlots.filter(
    (b) => (b.appointmentType || "physical") === activeTab
  );

  const tabColor = activeTab === "physical"
    ? { primary: "#0d9488", light: "#f0fdfa", mid: "#99f6e4", badge: "#0f766e" }
    : { primary: "#7c3aed", light: "#f5f3ff", mid: "#ddd6fe", badge: "#6d28d9" };

  // ── Load doctor profile ───────────────────────────────────────────────────
  useEffect(() => {
    api.get("/doctors/me", authHeaders)
      .then((res) => {
        const doctor = res.data.doctor;
        // Physical: use physicalAvailability; fall back to legacy `availability`
        const physAvail = doctor?.physicalAvailability?.length
          ? doctor.physicalAvailability
          : doctor?.availability;
        if (physAvail?.length) setPhysicalSchedule(mergeWithDays(physAvail));

        // Online: use onlineAvailability only
        if (doctor?.onlineAvailability?.length)
          setOnlineSchedule(mergeWithDays(doctor.onlineAvailability));
      })
      .catch((e) => console.log("Missing profile or availability", e))
      .finally(() => setLoading(false));
  }, [authHeaders]);

  // ── Load booked appointments ─────────────────────────────────────────────
  useEffect(() => {
    api.get("/appointments/doctor", authHeaders)
      .then((res) => {
        const appointments = res.data?.appointments || [];
        const { weekStart, weekEnd } = getCurrentWeekBounds();
        const grouped = {};

        for (const apt of appointments) {
          if (["cancelled", "rejected"].includes(apt.status)) continue;
          const dateObj = new Date(`${apt.date}T12:00:00`);
          if (Number.isNaN(dateObj.getTime())) continue;
          if (dateObj < weekStart || dateObj > weekEnd) continue;

          const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1;
          const day = DAYS[dayIndex];
          const mins = toMinutes12h(apt.time);
          if (!day || mins == null) continue;

          const hourLabel = TIME_LABELS.find((label) => {
            const start = toMinutes12h(label);
            return start != null && mins >= start && mins < start + 60;
          });
          if (!hourLabel) continue;

          const aptType = apt.appointmentType || "physical";
          const key = `${day}|${hourLabel}|${aptType}`;
          if (!grouped[key]) grouped[key] = { day, time: hourLabel, appointmentType: aptType, patientNames: [] };
          grouped[key].patientNames.push(apt.patientName || "Patient");
        }

        setAllBookedSlots(
          Object.values(grouped).map((item) => {
            const names = Array.from(new Set(item.patientNames));
            return {
              day: item.day,
              time: item.time,
              appointmentType: item.appointmentType,
              patientName: names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`,
            };
          })
        );
      })
      .catch(() => setAllBookedSlots([]));
  }, [authHeaders]);

  // ── Reset message when switching tabs ────────────────────────────────────
  useEffect(() => {
    setMsg("");
    setEditingBlockId(null);
    setBlockDay("Monday");
    setBlockStart("09:00");
    setBlockEnd("12:00");
  }, [activeTab]);

  // ── Slot helpers ─────────────────────────────────────────────────────────
  const addSlot = (dayIndex) => {
    const setter = activeTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    setter((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[dayIndex].slots.push({ start: "09:00", end: "17:00" });
      next[dayIndex].slots = normalizeSlots(next[dayIndex].slots);
      return next;
    });
  };

  const removeSlot = (dayIndex, slotIndex) => {
    const setter = activeTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    setter((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[dayIndex].slots.splice(slotIndex, 1);
      next[dayIndex].slots = normalizeSlots(next[dayIndex].slots);
      return next;
    });
  };

  const updateSlot = (dayIndex, slotIndex, field, value) => {
    const setter = activeTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    setter((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      next[dayIndex].slots[slotIndex] = { ...next[dayIndex].slots[slotIndex], [field]: value };
      next[dayIndex].slots = normalizeSlots(next[dayIndex].slots);
      return next;
    });
  };

  const isHourCovered = (dayIndex, hourIndex) => {
    const slotStart = (8 + hourIndex) * 60;
    return schedule[dayIndex].slots.some((slot) => {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);
      return slotStart >= start && slotStart < end;
    });
  };

  /** True if this hour is already occupied in the OTHER type's schedule → conflict */
  const isConflicted = (dayIndex, hourIndex) => {
    const slotStart = (8 + hourIndex) * 60;
    const slotEnd = slotStart + 60;
    return conflictSchedule[dayIndex].slots.some((slot) => {
      const s = toMinutes(slot.start);
      const e = toMinutes(slot.end);
      return slotStart < e && slotEnd > s;
    });
  };

  const getBookedInfo = (dayIndex, hourIndex) => {
    const day = DAYS[dayIndex];
    const time = TIME_LABELS[hourIndex];
    return bookedSlots.find((slot) => slot.day === day && slot.time === time) || null;
  };

  const toggleHourSlot = (dayIndex, hourIndex) => {
    const startMins = (8 + hourIndex) * 60;
    const endMins = (9 + hourIndex) * 60;
    const start = toTimeString(startMins);
    const end = toTimeString(endMins);

    // Prevent toggling a cell that's already claimed by the other type
    if (isConflicted(dayIndex, hourIndex)) {
      const other = activeTab === "physical" ? "online" : "physical";
      setMsg(`This hour is already set in your ${other} schedule. Resolve the conflict before enabling it here.`);
      return;
    }

    const setter = activeTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    setter((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      const covered = next[dayIndex].slots.some(
        (slot) => toMinutes(slot.start) <= startMins && toMinutes(slot.end) >= endMins
      );
      if (covered) {
        next[dayIndex].slots = normalizeSlots(
          next[dayIndex].slots.flatMap((slot) => subtractRangeFromSlot(slot, startMins, endMins))
        );
      } else {
        next[dayIndex].slots = normalizeSlots([...next[dayIndex].slots, { start, end }]);
      }
      return next;
    });
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const currentTab = activeTab;
    const currentSchedule = currentTab === "physical" ? physicalSchedule : onlineSchedule;
    const otherSchedule = currentTab === "physical" ? onlineSchedule : physicalSchedule;
    const endpoint = currentTab === "physical"
      ? "/doctors/physical-availability"
      : "/doctors/online-availability";

    try {
      setSaving(true);
      setMsg("Saving...");

      const cleaned = currentSchedule.map((dayItem) => ({
        ...dayItem,
        slots: normalizeSlots(dayItem.slots),
      }));

      const hasInvalid = cleaned.some((dayItem) =>
        dayItem.slots.some((slot) => toMinutes(slot.start) >= toMinutes(slot.end))
      );
      if (hasInvalid) {
        setMsg("Fix invalid time ranges before saving.");
        return;
      }

      // Frontend conflict guard
      const conflictDays = findConflictDays(cleaned, otherSchedule);
      if (conflictDays.length) {
        setMsg(
          `Conflict with your ${currentTab === "physical" ? "online" : "physical"} schedule on: ${conflictDays.join(", ")}. ` +
          "Remove overlapping slots before saving."
        );
        return;
      }

      const validSchedule = cleaned.filter((s) => s.slots.length > 0);
      await api.put(endpoint, { availability: validSchedule }, authHeaders);

      if (currentTab === "physical") setPhysicalSchedule(cleaned);
      else setOnlineSchedule(cleaned);

      setMsg(
        `${currentTab === "physical" ? "Physical" : "Online"} availability schedule updated successfully.`
      );
    } catch (error) {
      setMsg(error.response?.data?.message || "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  // ── Block time ────────────────────────────────────────────────────────────
  const handleBlockTime = async () => {
    const currentTab = activeTab;
    const currentSchedule = currentTab === "physical" ? physicalSchedule : onlineSchedule;
    const setter = currentTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    const setterBlocked = currentTab === "physical" ? setPhysicalBlockedEntries : setOnlineBlockedEntries;
    const currentBlockedEntries = currentTab === "physical" ? physicalBlockedEntries : onlineBlockedEntries;
    const endpoint = currentTab === "physical"
      ? "/doctors/physical-availability"
      : "/doctors/online-availability";

    const startMins = toMinutes(blockStart);
    const endMins = toMinutes(blockEnd);
    if (startMins >= endMins) {
      setMsg("Block time is invalid. End time must be after start time.");
      return;
    }

    try {
      setSaving(true);
      setMsg("Saving blocked time...");

      const editingEntry = editingBlockId
        ? currentBlockedEntries.find((e) => e.id === editingBlockId)
        : null;

      let workingSchedule = currentSchedule.map((d) => ({ ...d, slots: [...d.slots] }));
      if (editingEntry) {
        workingSchedule = workingSchedule.map((dayItem) => {
          if (dayItem.day !== editingEntry.day) return dayItem;
          return {
            ...dayItem,
            slots: normalizeSlots([
              ...dayItem.slots,
              { start: editingEntry.start, end: editingEntry.end },
            ]),
          };
        });
      }

      const updatedSchedule = workingSchedule.map((dayItem) => {
        if (dayItem.day !== blockDay) return dayItem;
        const nextSlots = normalizeSlots(dayItem.slots)
          .flatMap((slot) => subtractRangeFromSlot(slot, startMins, endMins))
          .filter((slot) => toMinutes(slot.start) < toMinutes(slot.end));
        return { ...dayItem, slots: normalizeSlots(nextSlots) };
      });

      const validSchedule = updatedSchedule.filter((s) => s.slots.length > 0);
      await api.put(endpoint, { availability: validSchedule }, authHeaders);
      setter(updatedSchedule);

      setterBlocked((prev) => {
        if (editingBlockId) {
          return prev.map((e) =>
            e.id === editingBlockId
              ? { ...e, day: blockDay, start: blockStart, end: blockEnd }
              : e
          );
        }
        return [...prev, { id: `${Date.now()}-${Math.random()}`, day: blockDay, start: blockStart, end: blockEnd }];
      });

      setEditingBlockId(null);
      setMsg(`${blockDay} blocked from ${blockStart} to ${blockEnd} and saved.`);
    } catch (error) {
      setMsg(error.response?.data?.message || "Failed to save blocked time.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditBlockedEntry = (entry) => {
    setBlockDay(entry.day);
    setBlockStart(entry.start);
    setBlockEnd(entry.end);
    setEditingBlockId(entry.id);
    setMsg(`Editing block: ${entry.day} ${entry.start}–${entry.end}`);
  };

  const handleDeleteBlockedEntry = async (entry) => {
    const currentTab = activeTab;
    const currentSchedule = currentTab === "physical" ? physicalSchedule : onlineSchedule;
    const setter = currentTab === "physical" ? setPhysicalSchedule : setOnlineSchedule;
    const setterBlocked = currentTab === "physical" ? setPhysicalBlockedEntries : setOnlineBlockedEntries;
    const endpoint = currentTab === "physical"
      ? "/doctors/physical-availability"
      : "/doctors/online-availability";

    try {
      setSaving(true);
      setMsg("Removing blocked range...");

      const updatedSchedule = currentSchedule.map((dayItem) => {
        if (dayItem.day !== entry.day) return dayItem;
        return {
          ...dayItem,
          slots: normalizeSlots([...dayItem.slots, { start: entry.start, end: entry.end }]),
        };
      });

      const validSchedule = updatedSchedule.filter((s) => s.slots.length > 0);
      await api.put(endpoint, { availability: validSchedule }, authHeaders);
      setter(updatedSchedule);
      setterBlocked((prev) => prev.filter((item) => item.id !== entry.id));
      if (editingBlockId === entry.id) setEditingBlockId(null);
      setMsg(`Removed block for ${entry.day} ${entry.start}–${entry.end}.`);
    } catch (error) {
      setMsg(error.response?.data?.message || "Failed to remove blocked range.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DoctorShell>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DoctorShell>
    );
  }

  const conflictDaysPreview = findConflictDays(
    activeTab === "physical" ? physicalSchedule : onlineSchedule,
    activeTab === "physical" ? onlineSchedule : physicalSchedule
  );

  return (
    <DoctorShell>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">
              Availability Management
            </h1>
            <p className="text-on-surface-variant max-w-3xl">
              Configure separate schedules for physical and online appointments. Slots cannot overlap between types.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ backgroundColor: tabColor.primary }}
            className="px-8 py-3 rounded-full text-white font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : `Save ${activeTab === "physical" ? "Physical" : "Online"} Schedule`}
          </button>
        </header>

        {/* ── Tab Switcher ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 rounded-2xl bg-slate-100 p-1.5 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab("physical")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "physical"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-lg" style={activeTab === "physical" ? { fontVariationSettings: "'FILL' 1", color: "#0d9488" } : {}}>
              local_hospital
            </span>
            Physical Appointments
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("online")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "online"
                ? "bg-white text-violet-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-lg" style={activeTab === "online" ? { fontVariationSettings: "'FILL' 1", color: "#7c3aed" } : {}}>
              videocam
            </span>
            Online Appointments
          </button>
        </div>

        {/* ── Tab context banner ─────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-2xl border text-sm font-medium"
          style={{ backgroundColor: tabColor.light, borderColor: tabColor.mid, color: tabColor.badge }}
        >
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
            {activeTab === "physical" ? "local_hospital" : "videocam"}
          </span>
          {activeTab === "physical"
            ? "You are editing your Physical appointment schedule. These hours are for in-person visits."
            : "You are editing your Online appointment schedule. These hours are for video consultations."}
        </div>

        {/* ── Conflict warning ───────────────────────────────────────────── */}
        {conflictDaysPreview.length > 0 && (
          <div className="flex items-start gap-3 px-5 py-3 rounded-2xl border border-orange-200 bg-orange-50 text-orange-800 text-sm font-medium">
            <span className="material-symbols-outlined text-orange-500 mt-0.5">warning</span>
            <span>
              Conflict detected on <strong>{conflictDaysPreview.join(", ")}</strong> — these days have overlapping
              slots between your physical and online schedules. Remove the orange cells before saving.
            </span>
          </div>
        )}

        {/* ── Status message ────────────────────────────────────────────── */}
        {msg && (
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${
              msg.includes("success")
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : "bg-error-container text-error border-error/20"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {msg.includes("success") ? "check_circle" : "error"}
            </span>
            <span className="font-medium text-sm">{msg}</span>
          </div>
        )}

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-8">

          {/* Sidebar */}
          <div className="col-span-12 xl:col-span-3 space-y-6">

            {/* Legend */}
            <div className="px-6 py-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-4 tracking-[0.18em]">Visual Guide</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: tabColor.mid, borderColor: tabColor.primary }}></span>
                  <span className="font-semibold" style={{ color: tabColor.badge }}>Available</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-200"></span>
                  <span className="text-rose-600 font-semibold">Unavailable</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></span>
                  <span className="text-black font-semibold">Booked (Patient Name)</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full bg-orange-200 border border-orange-400"></span>
                  <span className="text-orange-700 font-semibold">
                    Conflict ({activeTab === "physical" ? "Online" : "Physical"})
                  </span>
                </li>
              </ul>
            </div>

            {/* Block Time */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-error">block</span>
                <h3 className="font-headline font-bold text-lg">Block Time</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-tighter mb-2">
                    Selected Day
                  </label>
                  <select
                    value={blockDay}
                    onChange={(e) => setBlockDay(e.target.value)}
                    className="w-full rounded-lg border-outline-variant/30 bg-surface focus:ring-primary focus:border-primary text-sm"
                  >
                    {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-tighter mb-2">
                    Time Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="rounded-lg border-outline-variant/30 bg-surface focus:ring-primary focus:border-primary text-sm"
                    />
                    <input
                      type="time"
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="rounded-lg border-outline-variant/30 bg-surface focus:ring-primary focus:border-primary text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBlockTime}
                  className="w-full py-2.5 text-sm font-bold text-white bg-red-600 border border-red-600 rounded-full hover:bg-red-700 transition-colors"
                >
                  {editingBlockId ? "Update Blocked Range" : "Block Selected Dates"}
                </button>
              </div>
            </section>

            {/* Recurring */}
            <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">event_repeat</span>
                  <h3 className="font-headline font-bold text-lg">Recurring</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRecurring((prev) => !prev)}
                  className={`w-10 h-5 rounded-full relative flex items-center transition-colors ${recurring ? "bg-primary" : "bg-slate-300"}`}
                  aria-label="Toggle recurring schedule"
                >
                  <span className={`absolute w-3 h-3 bg-white rounded-full shadow-sm transition-all ${recurring ? "right-1" : "left-1"}`}></span>
                </button>
              </div>
              <p className="text-sm text-on-surface-variant">
                Apply this current week's schedule to all future weeks indefinitely.
              </p>
            </section>
          </div>

          {/* Weekly Grid */}
          <div className="col-span-12 xl:col-span-9 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="grid grid-cols-8 border-b border-outline-variant/20 bg-surface-container-low/50">
              <div className="p-4 border-r border-outline-variant/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400">schedule</span>
              </div>
              {SHORT_DAYS.map((day) => (
                <div key={day} className="p-4 text-center border-r border-outline-variant/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{day}</p>
                </div>
              ))}
            </div>

            <div className="max-h-[420px] overflow-auto">
              <div className="grid grid-cols-8">
                <div className="border-r border-outline-variant/20 sticky left-0 bg-white z-10">
                  {TIME_LABELS.map((label) => (
                    <div key={label} className="h-12 flex items-start justify-center p-2 text-[10px] font-bold text-slate-400 border-b border-outline-variant/15">
                      {label}
                    </div>
                  ))}
                </div>

                {schedule.map((dayItem, dayIndex) => (
                  <div key={dayItem.day} className="border-r border-outline-variant/15">
                    {TIME_LABELS.map((label, i) => {
                      const bookedInfo = getBookedInfo(dayIndex, i);
                      const covered = isHourCovered(dayIndex, i);
                      const conflicted = !bookedInfo && isConflicted(dayIndex, i);
                      const otherType = activeTab === "physical" ? "Online" : "Physical";

                      let cellClass = "";
                      let cellLabel = "";

                      if (bookedInfo) {
                        cellClass = "bg-amber-100 text-black cursor-not-allowed";
                        cellLabel = bookedInfo.patientName;
                      } else if (conflicted) {
                        cellClass = "bg-orange-100 text-orange-700 cursor-not-allowed";
                        cellLabel = `${otherType}`;
                      } else if (covered) {
                        cellClass = "text-white hover:opacity-90 cursor-pointer";
                        cellLabel = "Available";
                      } else {
                        cellClass = "bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer";
                        cellLabel = "Unavailable";
                      }

                      return (
                        <button
                          key={`${dayItem.day}-${label}-${i}`}
                          type="button"
                          onClick={() => !bookedInfo && !conflicted && toggleHourSlot(dayIndex, i)}
                          disabled={Boolean(bookedInfo || conflicted)}
                          style={covered && !bookedInfo && !conflicted ? { backgroundColor: tabColor.primary } : {}}
                          className={`h-12 w-full border-b border-outline-variant/15 transition-colors rounded-none flex items-center justify-center px-1 ${cellClass}`}
                          title={
                            bookedInfo
                              ? `${dayItem.day} ${label} — ${bookedInfo.patientName}`
                              : conflicted
                                ? `${dayItem.day} ${label} — conflicts with ${otherType} schedule`
                                : `${dayItem.day} ${label}`
                          }
                        >
                          <span className="block max-w-full truncate whitespace-nowrap text-[10px] font-bold leading-tight">
                            {cellLabel}
                          </span>
                        </button>
                      );
                    })}
                    {dayItem.slots.length > 0 && (
                      <div className="mx-1 my-2 rounded-md text-[10px] p-2 font-bold min-h-12"
                        style={{ backgroundColor: tabColor.mid, color: tabColor.badge }}>
                        {dayItem.slots.length} slot{dayItem.slots.length > 1 ? "s" : ""} configured
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-surface-container-low/30 border-t border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">mouse</span>
                  Click to toggle availability
                </p>
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit precise slots below
                </p>
              </div>
              <div
                className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: tabColor.light, color: tabColor.badge }}
              >
                {activeTab === "physical" ? "Physical" : "Online"} · Timezone: Local
              </div>
            </div>
          </div>
        </div>

        {/* ── Day-wise Availability ────────────────────────────────────────── */}
        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined" style={{ color: tabColor.primary }}>calendar_month</span>
            <h3 className="font-headline font-bold text-lg">
              {activeTab === "physical" ? "Physical" : "Online"} Day-wise Availability
            </h3>
          </div>

          <div className="space-y-4">
            {schedule.map((dayItem, dIndex) => (
              <div key={dayItem.day} className="flex flex-wrap gap-4 items-start p-4 bg-surface-container-high rounded-xl">
                <div className="w-28 font-headline font-bold text-on-surface pt-2">{dayItem.day}</div>
                <div className="flex-1 flex flex-col gap-3">
                  {dayItem.slots.map((slot, sIndex) => (
                    <div key={sIndex} className="flex gap-3 items-center flex-wrap">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => updateSlot(dIndex, sIndex, "start", e.target.value)}
                        className="bg-white border border-teal-500/10 rounded-lg px-3 py-2 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                      />
                      <span className="text-on-surface-variant font-medium">to</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => updateSlot(dIndex, sIndex, "end", e.target.value)}
                        className="bg-white border border-teal-500/10 rounded-lg px-3 py-2 text-on-surface focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(dIndex, sIndex)}
                        className="p-2 bg-error-container text-error rounded-lg hover:bg-error/20 transition-all active:scale-95"
                        aria-label="Remove slot"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addSlot(dIndex)}
                    className="self-start flex items-center gap-2 px-4 py-2 border border-dashed border-slate-400 rounded-lg text-slate-600 hover:border-opacity-75 hover:bg-opacity-50 transition-all text-sm font-medium"
                    style={{ "--hover-color": tabColor.primary }}
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add time slot
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Blocked entries */}
          <div className="mt-8 border-t border-outline-variant/20 pt-6">
            <h4 className="font-headline font-bold text-base mb-3">Blocked Time Entries</h4>
            {blockedEntries.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No blocked entries yet.</p>
            ) : (
              <div className="space-y-2">
                {blockedEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border border-outline-variant/20 bg-rose-50 px-3 py-2">
                    <span className="text-sm font-medium text-rose-700">
                      {entry.day} {entry.start} – {entry.end}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditBlockedEntry(entry)}
                        className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBlockedEntry(entry)}
                        className="rounded-md border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DoctorShell>
  );
}
