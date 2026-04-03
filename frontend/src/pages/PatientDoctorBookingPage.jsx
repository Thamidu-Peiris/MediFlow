import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, isBefore, startOfDay, startOfWeek } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

/** Hourly slots only; availability still gates what’s selectable */
const TIME_SLOTS = [
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
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

const slotContainsTime = (slot, timeLabel) => {
  const mins = toMinutes12h(timeLabel);
  if (mins == null) return false;
  const [sh, sm] = String(slot.start || "").split(":").map(Number);
  const [eh, em] = String(slot.end || "").split(":").map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return false;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return mins >= start && mins < end;
};

function slotPeriod(label) {
  const mins = toMinutes12h(label);
  if (mins == null) return "evening";
  if (mins < 12 * 60) return "morning";
  if (mins < 17 * 60) return "afternoon";
  return "evening";
}

export default function PatientDoctorBookingPage() {
  const { authHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const doctor = location.state?.doctor || null;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [occupiedTimes, setOccupiedTimes] = useState([]);
  const [myBookedTimes, setMyBookedTimes] = useState([]);
  const [reason, setReason] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");

  useEffect(() => {
    if (!doctor) navigate("/patient/doctors", { replace: true });
  }, [doctor, navigate]);

  const weekStart = useMemo(
    () => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
    [weekOffset]
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return {
        iso: format(d, "yyyy-MM-dd"),
        date: d,
        dow: format(d, "EEE"),
        dayNum: format(d, "d"),
      };
    });
  }, [weekStart]);

  const weekRangeLabel = useMemo(() => {
    const end = addDays(weekStart, 6);
    return `${format(weekStart, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
  }, [weekStart]);

  const isDateAvailableForDoctor = (isoDate) => {
    if (!doctor || !isoDate) return false;
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    const dayName = DAY_NAMES[d.getDay()];
    const dayAvailability = (doctor.availability || []).find((a) => a.day === dayName);
    return Boolean(dayAvailability && Array.isArray(dayAvailability.slots) && dayAvailability.slots.length > 0);
  };

  const normalizeTime = (t) => String(t || "").trim().toUpperCase().replace(/\s+/g, " ");

  const getAvailableSlotsForDate = (isoDate, blockedTimes = []) => {
    if (!doctor || !isoDate) return [];
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return [];
    const dayName = DAY_NAMES[d.getDay()];
    const dayAvailability = (doctor.availability || []).find((a) => a.day === dayName);
    if (!dayAvailability?.slots?.length) return [];
    const blocked = new Set(blockedTimes.map(normalizeTime));
    return TIME_SLOTS.filter(
      (slotLabel) =>
        dayAvailability.slots.some((slot) => slotContainsTime(slot, slotLabel)) &&
        !blocked.has(normalizeTime(slotLabel))
    );
  };

  useEffect(() => {
    if (!doctor || !selectedDate || !isDateAvailableForDoctor(selectedDate)) {
      setOccupiedTimes([]);
      setMyBookedTimes([]);
      return;
    }
    let cancelled = false;

    const apptOccupied = api.get(
      `/appointments/public/doctor/${encodeURIComponent(doctor.userId)}/occupied`,
      { params: { date: selectedDate } }
    ).catch(() => ({ data: { occupiedTimes: [] } }));

    const pendingOccupied = api.get("/payments/doctor-occupied", {
      params: { doctorUserId: doctor.userId, date: selectedDate },
    }).catch(() => ({ data: { occupiedTimes: [] } }));

    const myAppointments = authHeaders
      ? api.get("/appointments/my", authHeaders).catch(() => ({ data: { appointments: [] } }))
      : Promise.resolve({ data: { appointments: [] } });

    Promise.all([apptOccupied, pendingOccupied, myAppointments]).then(([apptRes, pendingRes, myRes]) => {
      if (cancelled) return;
      const apptTimes = Array.isArray(apptRes.data?.occupiedTimes) ? apptRes.data.occupiedTimes : [];
      const pendingTimes = Array.isArray(pendingRes.data?.occupiedTimes) ? pendingRes.data.occupiedTimes : [];
      setOccupiedTimes(Array.from(new Set([...apptTimes, ...pendingTimes].map((t) => String(t).trim()))));

      const myAppts = Array.isArray(myRes.data?.appointments) ? myRes.data.appointments : [];
      const myTimes = myAppts
        .filter(
          (a) =>
            a.doctorId === doctor.userId &&
            a.date === selectedDate &&
            !["cancelled", "rejected"].includes(a.status)
        )
        .map((a) => String(a.time || "").trim())
        .filter(Boolean);
      setMyBookedTimes(Array.from(new Set(myTimes)));
    });

    return () => {
      cancelled = true;
    };
  }, [doctor, selectedDate, authHeaders]);

  const blocked = useMemo(
    () => Array.from(new Set([...(occupiedTimes || []), ...(myBookedTimes || [])])),
    [occupiedTimes, myBookedTimes]
  );

  const availableSlots = useMemo(() => {
    if (!doctor) return [];
    return getAvailableSlotsForDate(selectedDate, blocked);
  }, [doctor, selectedDate, blocked]);

  const pickDay = (iso) => {
    const d = new Date(`${iso}T12:00:00`);
    const today = startOfDay(new Date());
    if (isBefore(d, today)) {
      setBookingMsg("Please choose today or a future date.");
      return;
    }
    setSelectedDate(iso);
    setSelectedTime("");
    setBookingMsg("");
    if (!isDateAvailableForDoctor(iso)) {
      setBookingMsg(`Doctor is not available on ${DAY_NAMES[d.getDay()]}.`);
    }
  };

  const pickSlot = (label) => {
    if (!selectedDate || !availableSlots.includes(label)) return;
    setSelectedTime(label);
    setBookingMsg("");
  };

  const handleConfirm = () => {
    if (!doctor) return;
    if (!selectedDate || !selectedTime) {
      setBookingMsg("Please select a date and time slot.");
      return;
    }
    if (!isDateAvailableForDoctor(selectedDate)) {
      setBookingMsg("Doctor is not available on the selected date.");
      return;
    }
    if (!availableSlots.includes(selectedTime)) {
      setBookingMsg("Selected time is not available. Please choose an available slot.");
      return;
    }

    const draft = {
      doctorUserId: doctor.userId,
      doctorName: doctor.fullName,
      specialization: doctor.specialization || "",
      doctorImage: doctor.image || "",
      date: selectedDate,
      time: selectedTime,
      reason,
      consultationFee: doctor.consultationFee || 0,
    };
    try {
      sessionStorage.setItem("mediflow_booking_draft", JSON.stringify(draft));
    } catch {
      /* ignore */
    }
    navigate("/patient/payment", { state: draft });
  };

  const summaryLine = useMemo(() => {
    if (!selectedDate || !selectedTime) return "—";
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return `${selectedDate}, ${selectedTime}`;
    return `${format(d, "MMM d, yyyy")}, ${selectedTime}`;
  }, [selectedDate, selectedTime]);

  const slotsByPeriod = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    for (const t of TIME_SLOTS) {
      groups[slotPeriod(t)].push(t);
    }
    return groups;
  }, []);

  const renderSlotButton = (label) => {
    const enabled = Boolean(selectedDate && availableSlots.includes(label));
    const selected = selectedTime === label;
    const base =
      "py-3 px-4 rounded-full text-sm font-bold flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

    if (selected) {
      return (
        <button
          key={label}
          type="button"
          onClick={() => pickSlot(label)}
          className={`${base} bg-primary text-on-primary shadow-md shadow-primary/20 hover:scale-105 active:opacity-90`}
        >
          {label}
        </button>
      );
    }

    if (enabled) {
      return (
        <button
          key={label}
          type="button"
          onClick={() => pickSlot(label)}
          className={`${base} bg-surface-container-high text-primary hover:bg-primary-fixed/50 hover:scale-105`}
        >
          {label}
        </button>
      );
    }

    return (
      <button key={label} type="button" disabled className={`${base} cursor-not-allowed bg-secondary-container text-slate-400`}>
        {label}
      </button>
    );
  };

  if (!doctor) return null;

  const locationText =
    doctor.clinicAddress || doctor.clinicName || doctor.hospitalName || doctor.address || "—";

  return (
    <PatientShell>
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-2 font-body text-on-surface md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Available slots */}
          <div className="space-y-6 lg:col-span-8">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Available Slots</h1>
                <p className="mt-1 font-body text-on-surface-variant">Select a time that works best for your schedule.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  className="rounded-full border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-primary hover:bg-surface-container-high"
                  aria-label="Previous week"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                </button>
                <div className="flex items-center rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-primary">
                  <span className="material-symbols-outlined mr-2 text-[20px]">calendar_today</span>
                  <span>{weekRangeLabel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="rounded-full border border-outline-variant/20 bg-surface-container-lowest px-3 py-2 text-primary hover:bg-surface-container-high"
                  aria-label="Next week"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </header>

            {bookingMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{bookingMsg}</div>
            )}

            <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
              <div className="mb-6 grid grid-cols-7 gap-2 border-b border-outline-variant/10 pb-4">
                {weekDays.map((day) => {
                  const today = startOfDay(new Date());
                  const isPast = isBefore(day.date, today);
                  const isSelected = selectedDate === day.iso;
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      disabled={isPast}
                      onClick={() => pickDay(day.iso)}
                      className={`text-center transition-all rounded-2xl py-2 ${
                        isPast
                          ? "cursor-not-allowed bg-slate-100"
                          : isSelected
                            ? "bg-[#E2F8F8]"
                            : "border border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${
                          isPast ? "text-slate-400" : isSelected ? "text-[#006566]" : "text-slate-500"
                        }`}
                      >
                        {day.dow}
                      </span>
                      <span
                        className={`font-headline text-lg font-bold ${
                          isPast ? "text-slate-400" : isSelected ? "text-[#006566]" : "text-slate-900"
                        }`}
                      >
                        {day.dayNum}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="custom-scrollbar grid max-h-[min(70vh,720px)] grid-cols-1 gap-6 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { key: "morning", title: "Morning", icon: "light_mode" },
                  { key: "afternoon", title: "Afternoon", icon: "sunny" },
                  { key: "evening", title: "Evening", icon: "dark_mode" },
                ].map((section) => (
                  <div key={section.key} className="space-y-4">
                    <h3 className="flex items-center text-sm font-bold text-on-surface-variant font-label">
                      <span className="material-symbols-outlined mr-2 text-lg">{section.icon}</span>
                      {section.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">{slotsByPeriod[section.key].map((label) => renderSlotButton(label))}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-between gap-4 border-t border-outline-variant/10 pt-8 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => navigate("/patient/doctors")}
                className="flex items-center justify-center rounded-full px-8 py-4 font-bold text-primary hover:bg-primary-fixed/20 sm:justify-start"
              >
                <span className="material-symbols-outlined mr-2">arrow_back</span>
                Previous Step
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-full bg-primary px-10 py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                Continue to payment
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:col-span-4">
            <div className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
              <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-fixed/20 blur-2xl" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img src={doctor.image} alt="" className="h-24 w-24 rounded-3xl object-cover shadow-md" />
                  <div className="absolute -bottom-2 -right-2 rounded-xl bg-primary p-2 text-on-primary shadow-lg">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      verified
                    </span>
                  </div>
                </div>
                <h2 className="font-headline text-xl font-bold text-on-surface">{doctor.fullName}</h2>
                <p className="text-sm font-semibold text-primary">{doctor.specialization || "General Practitioner"}</p>
                <div className="mt-4 flex items-center justify-center space-x-2 rounded-full bg-surface-container-low px-4 py-1.5">
                  <span className="material-symbols-outlined text-sm text-[#EAB308]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                  <span className="text-xs font-bold text-on-surface">{doctor.rating}</span>
                  <span className="text-[10px] font-medium text-slate-500 font-label">({doctor.reviewCount} reviews)</span>
                </div>

                <div className="mt-8 w-full space-y-4 border-t border-outline-variant/10 pt-8 text-left">
                  <div className="flex items-start">
                    <div className="mr-3 rounded-xl bg-surface-container-high p-2">
                      <span className="material-symbols-outlined text-xl text-primary">location_on</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Location</p>
                      <p className="text-xs font-semibold text-on-surface">{locationText}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-3 rounded-xl bg-surface-container-high p-2">
                      <span className="material-symbols-outlined text-xl text-primary">payments</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Fee</p>
                      <p className="text-xs font-semibold text-on-surface">
                        LKR {(doctor.consultationFee || 0).toLocaleString()} per session
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="mr-3 rounded-xl bg-surface-container-high p-2">
                      <span className="material-symbols-outlined text-xl text-primary">medical_information</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Next step</p>
                      <p className="text-xs font-semibold italic text-on-surface">Secure payment</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 w-full rounded-2xl border border-primary-fixed/20 bg-primary-fixed/10 p-4">
                  <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary font-label">
                    Booking summary
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Selected time</span>
                    <span className="font-bold text-on-surface">{summaryLine}</span>
                  </div>
                </div>

                <div className="mt-6 w-full text-left">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">
                    Reason for visit
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Briefly describe your symptoms or reason for visit..."
                    className="w-full resize-none rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] bg-inverse-surface p-6 text-on-primary">
              <div className="relative z-10">
                <h4 className="mb-2 font-headline font-bold">Need assistance?</h4>
                <p className="mb-4 text-xs opacity-80 font-body">Our support team can help if you have trouble booking.</p>
                <button
                  type="button"
                  className="w-full rounded-full bg-primary py-3 text-sm font-bold text-on-primary transition-all hover:bg-primary-container"
                >
                  Contact support
                </button>
              </div>
              <span className="material-symbols-outlined absolute -bottom-6 -right-6 text-9xl opacity-10">support_agent</span>
            </div>
          </aside>
        </div>
      </div>
    </PatientShell>
  );
}
