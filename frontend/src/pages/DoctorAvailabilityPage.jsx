import { useEffect, useState } from "react";
import api from "../api/client";
import DoctorShell from "../components/DoctorShell";
import { useAuth } from "../context/AuthContext";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_LABELS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
  "08:00 PM",
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
  const currentDay = now.getDay(); // 0..6 (Sun..Sat)
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
    if (!merged.length) {
      merged.push({ ...slot });
      continue;
    }
    const last = merged[merged.length - 1];
    if (toMinutes(slot.start) <= toMinutes(last.end)) {
      if (toMinutes(slot.end) > toMinutes(last.end)) {
        last.end = slot.end;
      }
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
};

const subtractRangeFromSlot = (slot, blockStartMins, blockEndMins) => {
  const slotStart = toMinutes(slot.start);
  const slotEnd = toMinutes(slot.end);

  if (blockEndMins <= slotStart || blockStartMins >= slotEnd) {
    return [slot];
  }

  if (blockStartMins <= slotStart && blockEndMins >= slotEnd) {
    return [];
  }

  if (blockStartMins <= slotStart && blockEndMins < slotEnd) {
    return [{ start: toTimeString(blockEndMins), end: slot.end }];
  }

  if (blockStartMins > slotStart && blockEndMins >= slotEnd) {
    return [{ start: slot.start, end: toTimeString(blockStartMins) }];
  }

  return [
    { start: slot.start, end: toTimeString(blockStartMins) },
    { start: toTimeString(blockEndMins), end: slot.end },
  ];
};

export default function DoctorAvailabilityPage() {
  const { authHeaders } = useAuth();
  const [schedule, setSchedule] = useState(DAYS.map((day) => ({ day, slots: [] })));
  const [duration, setDuration] = useState("30 min");
  const [bufferTime, setBufferTime] = useState("10 minutes");
  const [recurring, setRecurring] = useState(true);
  const [blockDay, setBlockDay] = useState("Monday");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [blockedEntries, setBlockedEntries] = useState([]);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/doctors/me", authHeaders)
      .then((res) => {
        const doctor = res.data.doctor;
        if (doctor && doctor.availability?.length > 0) {
          const merged = DAYS.map((day) => {
            const existing = doctor.availability.find((a) => a.day === day);
            return existing ? { ...existing, slots: normalizeSlots(existing.slots || []) } : { day, slots: [] };
          });
          setSchedule(merged);
        }
      })
      .catch((e) => console.log("Missing profile or availability", e))
      .finally(() => setLoading(false));
  }, [authHeaders]);

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

          const dayIndex = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1; // Monday-first index
          const day = DAYS[dayIndex];
          const mins = toMinutes12h(apt.time);
          if (!day || mins == null) continue;

          const hourLabel = TIME_LABELS.find((label) => {
            const start = toMinutes12h(label);
            return start != null && mins >= start && mins < start + 60;
          });
          if (!hourLabel) continue;

          const key = `${day}|${hourLabel}`;
          if (!grouped[key]) {
            grouped[key] = { day, time: hourLabel, patientNames: [] };
          }
          grouped[key].patientNames.push(apt.patientName || "Patient");
        }

        const mapped = Object.values(grouped).map((item) => {
          const uniqueNames = Array.from(new Set(item.patientNames));
          return {
            day: item.day,
            time: item.time,
            patientName:
              uniqueNames.length === 1
                ? uniqueNames[0]
                : `${uniqueNames[0]} +${uniqueNames.length - 1}`,
          };
        });

        setBookedSlots(mapped);
      })
      .catch(() => setBookedSlots([]));
  }, [authHeaders]);

  const addSlot = (dayIndex) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[dayIndex].slots.push({ start: "09:00", end: "17:00" });
      next[dayIndex].slots = normalizeSlots(next[dayIndex].slots);
      return next;
    });
  };

  const removeSlot = (dayIndex, slotIndex) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[dayIndex].slots.splice(slotIndex, 1);
      next[dayIndex].slots = normalizeSlots(next[dayIndex].slots);
      return next;
    });
  };

  const updateSlot = (dayIndex, slotIndex, field, value) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[dayIndex].slots[slotIndex][field] = value;
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

    setSchedule((prev) => {
      const next = prev.map((d) => ({ ...d, slots: [...d.slots] }));
      const covered = next[dayIndex].slots.some(
        (slot) => toMinutes(slot.start) <= startMins && toMinutes(slot.end) >= endMins
      );

      if (covered) {
        // Slot is Available → remove this 1-hour block from whatever merged range covers it.
        next[dayIndex].slots = normalizeSlots(
          next[dayIndex].slots.flatMap((slot) =>
            subtractRangeFromSlot(slot, startMins, endMins)
          )
        );
      } else {
        // Slot is Unavailable → mark this hour as available.
        next[dayIndex].slots = normalizeSlots([...next[dayIndex].slots, { start, end }]);
      }
      return next;
    });
  };

  const handleBlockTime = async () => {
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
        ? blockedEntries.find((entry) => entry.id === editingBlockId)
        : null;

      // Start from current schedule and first undo the previous block (when editing).
      let workingSchedule = schedule.map((dayItem) => ({ ...dayItem, slots: [...dayItem.slots] }));
      if (editingEntry) {
        workingSchedule = workingSchedule.map((dayItem) => {
          if (dayItem.day !== editingEntry.day) return dayItem;
          const restored = normalizeSlots([...dayItem.slots, { start: editingEntry.start, end: editingEntry.end }]);
          return { ...dayItem, slots: restored };
        });
      }

      // Apply the new block range.
      const updatedSchedule = workingSchedule.map((dayItem) => {
        if (dayItem.day !== blockDay) return dayItem;
        const nextSlots = normalizeSlots(dayItem.slots)
          .flatMap((slot) => subtractRangeFromSlot(slot, startMins, endMins))
          .filter((slot) => toMinutes(slot.start) < toMinutes(slot.end));
        return { ...dayItem, slots: normalizeSlots(nextSlots) };
      });

      const validSchedule = updatedSchedule.filter((s) => s.slots.length > 0);
      await api.put("/doctors/availability", { availability: validSchedule }, authHeaders);
      setSchedule(updatedSchedule);
      setBlockedEntries((prev) => {
        if (editingBlockId) {
          return prev.map((entry) =>
            entry.id === editingBlockId
              ? { ...entry, day: blockDay, start: blockStart, end: blockEnd }
              : entry
          );
        }
        return [
          ...prev,
          { id: `${Date.now()}-${Math.random()}`, day: blockDay, start: blockStart, end: blockEnd },
        ];
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
    setMsg(`Editing block: ${entry.day} ${entry.start}-${entry.end}`);
  };

  const handleDeleteBlockedEntry = async (entry) => {
    try {
      setSaving(true);
      setMsg("Removing blocked range...");

      const updatedSchedule = schedule.map((dayItem) => {
        if (dayItem.day !== entry.day) return dayItem;
        const nextSlots = normalizeSlots([...dayItem.slots, { start: entry.start, end: entry.end }]);
        return { ...dayItem, slots: nextSlots };
      });

      const validSchedule = updatedSchedule.filter((s) => s.slots.length > 0);
      await api.put("/doctors/availability", { availability: validSchedule }, authHeaders);
      setSchedule(updatedSchedule);
      setBlockedEntries((prev) => prev.filter((item) => item.id !== entry.id));
      if (editingBlockId === entry.id) {
        setEditingBlockId(null);
      }
      setMsg(`Removed block for ${entry.day} ${entry.start}-${entry.end}.`);
    } catch (error) {
      setMsg(error.response?.data?.message || "Failed to remove blocked range.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMsg("Saving...");
      const cleaned = schedule.map((dayItem) => ({ ...dayItem, slots: normalizeSlots(dayItem.slots) }));
      const hasInvalid = cleaned.some((dayItem) =>
        dayItem.slots.some((slot) => toMinutes(slot.start) >= toMinutes(slot.end))
      );
      if (hasInvalid) {
        setMsg("Fix invalid time ranges before saving.");
        return;
      }

      const validSchedule = cleaned.filter((s) => s.slots.length > 0);
      await api.put("/doctors/availability", { availability: validSchedule }, authHeaders);
      setSchedule(cleaned);
      setMsg("Availability schedule updated successfully.");
    } catch (error) {
      setMsg(error.response?.data?.message || "Failed to save schedule.");
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

  return (
    <DoctorShell>
      <div className="p-8 max-w-[1400px] mx-auto space-y-8">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight">Availability Management</h1>
            <p className="text-on-surface-variant max-w-3xl">
              Configure your clinical hours, manage recurring schedules, and keep your slots synchronized.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 rounded-full bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </header>

        {msg && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border ${msg.includes("success") ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-error-container text-error border-error/20"}`}>
            <span className="material-symbols-outlined text-sm">{msg.includes("success") ? "check_circle" : "error"}</span>
            <span className="font-medium text-sm">{msg}</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 xl:col-span-3 space-y-6">
            <div className="px-6 py-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
              <h4 className="text-[11px] font-bold uppercase text-slate-500 mb-4 tracking-[0.18em]">Visual Guide</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full bg-sky-200 border border-sky-300"></span>
                  <span className="text-sky-800 font-semibold">Available</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-200"></span>
                  <span className="text-rose-600 font-semibold">Unavailable</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300"></span>
                  <span className="text-black font-semibold">Booked (Patient Name)</span>
                </li>
              </ul>
            </div>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-error">block</span>
                <h3 className="font-headline font-bold text-lg">Block Time</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-tighter mb-2">Selected Day</label>
                  <select
                    value={blockDay}
                    onChange={(e) => setBlockDay(e.target.value)}
                    className="w-full rounded-lg border-outline-variant/30 bg-surface focus:ring-primary focus:border-primary text-sm"
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-tighter mb-2">Time Range</label>
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

          <div className="col-span-12 xl:col-span-9 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
            <div className="grid grid-cols-8 border-b border-outline-variant/20 bg-surface-container-low/50">
              <div className="p-4 border-r border-outline-variant/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-400">schedule</span>
              </div>
              {SHORT_DAYS.map((day, idx) => (
                <div key={day} className={`p-4 text-center border-r border-outline-variant/20 ${idx === 2 ? "bg-white/40" : ""}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${idx === 2 ? "text-primary" : "text-slate-500"}`}>{day}</p>
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
                    {TIME_LABELS.map((label, i) => (
                      (() => {
                        const bookedInfo = getBookedInfo(dayIndex, i);
                        const covered = isHourCovered(dayIndex, i);
                        return (
                          <button
                            key={`${dayItem.day}-${label}-${i}`}
                            type="button"
                            onClick={() => !bookedInfo && toggleHourSlot(dayIndex, i)}
                            disabled={Boolean(bookedInfo)}
                            className={`h-12 w-full border-b border-outline-variant/15 transition-colors rounded-none flex items-center justify-center px-1 ${
                              bookedInfo
                                ? "bg-amber-100 text-black cursor-not-allowed"
                                : covered
                                  ? "bg-sky-100 text-sky-800 hover:bg-sky-200"
                                  : "bg-rose-50 text-rose-500 hover:bg-rose-100"
                            }`}
                            title={
                              bookedInfo
                                ? `${dayItem.day} ${label} - ${bookedInfo.patientName}`
                                : `${dayItem.day} ${label}`
                            }
                          >
                            <span className="block max-w-full truncate whitespace-nowrap text-[10px] font-bold leading-tight">
                              {bookedInfo
                                ? `${bookedInfo.patientName}`
                                : covered
                                  ? "Available"
                                  : "Unavailable"}
                            </span>
                          </button>
                        );
                      })()
                    ))}
                    {dayItem.slots.length > 0 && (
                      <div className="mx-1 my-2 bg-slate-200 rounded-md text-[10px] p-2 text-slate-800 font-bold min-h-12">
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
                  <span className="material-symbols-outlined text-sm">mouse</span> Click and drag to select availability blocks
                </p>
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">edit</span> Edit slots from day cards below
                </p>
              </div>
              <div className="text-xs font-bold text-primary bg-primary-fixed/30 px-3 py-1 rounded-full">Timezone: Local</div>
            </div>
          </div>
        </div>

        <section className="bg-surface-container-lowest rounded-xl p-6 shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            <h3 className="font-headline font-bold text-lg">Day-wise Availability</h3>
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
                    className="self-start flex items-center gap-2 px-4 py-2 border border-dashed border-slate-400 rounded-lg text-slate-600 hover:text-teal-600 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add time slot
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-outline-variant/20 pt-6">
            <h4 className="font-headline font-bold text-base mb-3">Blocked Time Entries</h4>
            {blockedEntries.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No blocked entries yet.</p>
            ) : (
              <div className="space-y-2">
                {blockedEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border border-outline-variant/20 bg-rose-50 px-3 py-2">
                    <span className="text-sm font-medium text-rose-700">
                      {entry.day} {entry.start} - {entry.end}
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
