import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, isBefore, startOfDay, startOfWeek } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

/** Hourly slots only; availability still gates what's selectable */
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
  const [bookingStep, setBookingStep] = useState(1);

  // ── Appointment type is now chosen FIRST ─────────────────────────────────
  const [appointmentType, setAppointmentType] = useState("physical");

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

  // ── Clear date/time whenever the appointment type changes ─────────────────
  useEffect(() => {
    setSelectedDate("");
    setSelectedTime("");
    setOccupiedTimes([]);
    setMyBookedTimes([]);
    setBookingMsg("");
  }, [appointmentType]);

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

  /**
   * Returns the correct availability array for the selected appointment type.
   *  - physical → physicalAvailability (falls back to legacy availability)
   *  - online   → onlineAvailability only (no fallback)
   */
  const getTypeAvailability = (type) => {
    if (!doctor) return [];
    if (type === "online") {
      return doctor.onlineAvailability || [];
    }
    // physical: prefer the dedicated field, fall back to legacy
    return doctor.physicalAvailability?.length
      ? doctor.physicalAvailability
      : (doctor.availability || []);
  };

  const isDateAvailableForDoctor = (isoDate, type = appointmentType) => {
    if (!doctor || !isoDate) return false;
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    const dayName = DAY_NAMES[d.getDay()];
    const avail = getTypeAvailability(type);
    const dayAvailability = avail.find((a) => a.day === dayName);
    return Boolean(dayAvailability && Array.isArray(dayAvailability.slots) && dayAvailability.slots.length > 0);
  };

  const normalizeTime = (t) => String(t || "").trim().toUpperCase().replace(/\s+/g, " ");

  const getAvailableSlotsForDate = (isoDate, blockedTimes = [], type = appointmentType) => {
    if (!doctor || !isoDate) return [];
    const d = new Date(`${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return [];
    const dayName = DAY_NAMES[d.getDay()];
    const avail = getTypeAvailability(type);
    const dayAvailability = avail.find((a) => a.day === dayName);
    if (!dayAvailability?.slots?.length) return [];
    const blocked = new Set(blockedTimes.map(normalizeTime));
    return TIME_SLOTS.filter(
      (slotLabel) =>
        dayAvailability.slots.some((slot) => slotContainsTime(slot, slotLabel)) &&
        !blocked.has(normalizeTime(slotLabel))
    );
  };

  // ── Fetch occupied times when date changes ────────────────────────────────
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
      // Block ALL occupied slots regardless of appointment type (per spec: same slot can't be double-booked)
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

    return () => { cancelled = true; };
  }, [doctor, selectedDate, authHeaders]);

  const blocked = useMemo(
    () => Array.from(new Set([...(occupiedTimes || []), ...(myBookedTimes || [])])),
    [occupiedTimes, myBookedTimes]
  );

  const availableSlots = useMemo(() => {
    if (!doctor) return [];
    return getAvailableSlotsForDate(selectedDate, blocked, appointmentType);
  }, [doctor, selectedDate, blocked, appointmentType]);

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
    if (!isDateAvailableForDoctor(iso, appointmentType)) {
      const dayName = DAY_NAMES[d.getDay()];
      setBookingMsg(
        `Doctor is not available for ${appointmentType === "physical" ? "in-person" : "online"} appointments on ${dayName}.`
      );
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
    if (!isDateAvailableForDoctor(selectedDate, appointmentType)) {
      setBookingMsg("Doctor is not available on the selected date for this appointment type.");
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
      appointmentType,
      consultationFee: doctor.consultationFee || 0,
    };
    try {
      sessionStorage.setItem("mediflow_booking_draft", JSON.stringify(draft));
    } catch {
      /* ignore */
    }
    navigate("/patient/payment", { state: draft });
  };

  const goToStepTwo = () => {
    if (appointmentType === "online" && !hasOnlineAvailability) {
      setBookingMsg("Online appointments are not available for this doctor.");
      return;
    }
    if (appointmentType === "physical" && !hasPhysicalAvailability) {
      setBookingMsg("In-person appointments are not available for this doctor.");
      return;
    }
    setBookingMsg("");
    setBookingStep(2);
  };

  const summaryLine = useMemo(() => {
    if (!selectedDate || !selectedTime) return "—";
    const d = new Date(`${selectedDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return `${selectedDate}, ${selectedTime}`;
    return `${format(d, "MMM d, yyyy")}, ${selectedTime}`;
  }, [selectedDate, selectedTime]);

  const slotsByPeriod = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    for (const t of TIME_SLOTS) groups[slotPeriod(t)].push(t);
    return groups;
  }, []);

  const renderSlotButton = (label) => {
    const enabled = Boolean(selectedDate && availableSlots.includes(label));
    const selected = selectedTime === label;
    const base =
      "py-3 px-4 rounded-full text-sm font-bold flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

    if (selected) {
      return (
        <button key={label} type="button" onClick={() => pickSlot(label)}
          className={`${base} bg-primary text-on-primary shadow-md shadow-primary/20 hover:scale-105 active:opacity-90`}>
          {label}
        </button>
      );
    }
    if (enabled) {
      return (
        <button key={label} type="button" onClick={() => pickSlot(label)}
          className={`${base} bg-surface-container-high text-primary hover:bg-primary-fixed/50 hover:scale-105`}>
          {label}
        </button>
      );
    }
    return (
      <button key={label} type="button" disabled
        className={`${base} cursor-not-allowed bg-secondary-container text-slate-400`}>
        {label}
      </button>
    );
  };

  if (!doctor) return null;

  const locationParts = [
    doctor.clinicAddress,
    doctor.clinicName,
    doctor.hospitalName,
    doctor.address,
    doctor.location,
    doctor.city,
    doctor.district,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);
  const locationText = locationParts.length > 0 ? locationParts.join(", ") : "Clinic location will be confirmed by the doctor";

  // Check if doctor has online availability set at all
  const hasOnlineAvailability = Boolean(doctor.onlineAvailability?.length);
  const hasPhysicalAvailability = Boolean(
    doctor.physicalAvailability?.length || doctor.availability?.length
  );

  const renderDoctorSidebar = () => (
    <aside className="space-y-6 lg:col-span-4">
      <div className="relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-fixed/20 blur-2xl" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <img src={doctor.image} alt="" className="h-24 w-24 rounded-3xl object-cover shadow-md" />
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#1D9BF0] text-white shadow-md">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
            </div>
          </div>
          <h2 className="font-headline text-xl font-bold text-on-surface">{doctor.fullName}</h2>
          <p className="text-sm font-semibold text-primary">{doctor.specialization || "General Practitioner"}</p>
          <div className="mt-3 flex items-center justify-center space-x-2 rounded-full bg-surface-container-low px-4 py-1.5">
            <span className="material-symbols-outlined text-sm text-[#EAB308]" style={{ fontVariationSettings: "'FILL' 1" }}>
              star
            </span>
            <span className="text-xs font-bold text-on-surface">{doctor.rating}</span>
            <span className="text-[10px] font-medium text-slate-500 font-label">({doctor.reviewCount} reviews)</span>
          </div>

          <div className="mt-6 w-full space-y-3.5 border-t border-outline-variant/10 pt-6 text-left">
            <div className="flex items-start">
              <div className="mr-3 rounded-xl bg-surface-container-high p-2">
                <span className="material-symbols-outlined text-xl text-primary">location_on</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Location</p>
                <p className="text-xs font-semibold text-on-surface">{locationText}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start">
                <div className="mr-2 rounded-xl bg-surface-container-high p-2">
                  <span className="material-symbols-outlined text-xl text-primary">payments</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Fee</p>
                  <p className="text-xs font-semibold text-on-surface">
                    LKR {(doctor.consultationFee || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="mr-2 rounded-xl bg-surface-container-high p-2">
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ color: appointmentType === "online" ? "#7c3aed" : "var(--color-primary)" }}
                  >
                    {appointmentType === "online" ? "videocam" : "medical_information"}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">Type</p>
                  <p className="text-xs font-semibold text-on-surface">
                    {appointmentType === "online" ? "Online" : "In-Person"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 w-full rounded-2xl border border-primary-fixed/20 bg-primary-fixed/10 p-4">
            <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary font-label">
              Booking summary
            </p>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600">Selected time</span>
              <span className="font-bold text-on-surface">{summaryLine}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Appointment type</span>
              <span className="font-bold text-on-surface">
                {appointmentType === "online" ? "Online" : "In-Person"}
              </span>
            </div>
          </div>

        </div>
      </div>

    </aside>
  );

  return (
    <PatientShell>
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-2 font-body text-on-surface md:px-8">

        {bookingStep === 1 && (
          <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Step 1</p>
                  <h2 className="font-headline text-xl font-bold text-on-surface">Choose Appointment Type</h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    Select how you'd like to meet with {doctor.fullName}. Available dates will update accordingly.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setAppointmentType("physical")}
                    disabled={!hasPhysicalAvailability}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      appointmentType === "physical"
                        ? "border-primary bg-primary-fixed/20 text-primary"
                        : "border-outline-variant/20 bg-white text-on-surface-variant hover:border-primary/40"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={appointmentType === "physical" ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      local_hospital
                    </span>
                    <span>In-Person</span>
                    {appointmentType === "physical" && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary"></span>
                    )}
                    {!hasPhysicalAvailability && (
                      <span className="text-[9px] font-normal text-slate-400">Not configured</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAppointmentType("online")}
                    disabled={!hasOnlineAvailability}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 py-4 px-3 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      appointmentType === "online"
                        ? "border-violet-600 bg-violet-50 text-violet-700"
                        : "border-outline-variant/20 bg-white text-on-surface-variant hover:border-violet-300"
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={appointmentType === "online" ? { fontVariationSettings: "'FILL' 1", color: "#7c3aed" } : {}}
                    >
                      videocam
                    </span>
                    <span>Online</span>
                    {appointmentType === "online" && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-600"></span>
                    )}
                    {!hasOnlineAvailability && (
                      <span className="text-[9px] font-normal text-slate-400">Not configured</span>
                    )}
                  </button>
                </div>

                {appointmentType === "online" && hasOnlineAvailability && (
                  <p className="mt-3 text-xs text-violet-600 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">videocam</span>
                    Online — you'll receive a video call link after booking confirmation.
                  </p>
                )}
                {appointmentType === "physical" && hasPhysicalAvailability && (
                  <p className="mt-3 text-xs text-teal-700 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    In-person — visit the doctor at their clinic.
                  </p>
                )}

              </div>

              <div className="mt-6 rounded-3xl bg-surface-container-lowest p-6 shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400 font-label">
                  Reason for visit (optional)
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe your symptoms or reason for visit..."
                  className="w-full resize-none rounded-2xl border border-outline-variant/20 bg-white px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={goToStepTwo}
                  className="rounded-full bg-black px-8 py-3 text-sm font-bold text-white shadow-md transition-transform hover:bg-neutral-900 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Next Step
                </button>
              </div>
            </div>
            {renderDoctorSidebar()}
          </div>
        )}

        {/* ── Step 2: Date & Time ──────────────────────────────────────────── */}
        {bookingStep === 2 && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            <div className="rounded-3xl border border-outline-variant/10 bg-white p-5 shadow-[0px_18px_34px_rgba(0,29,50,0.06)] md:p-6">
              <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Step 2</p>
                  <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">
                    {appointmentType === "physical" ? "In-Person" : "Online"} Available Slots
                  </h1>
                  <p className="mt-1 font-body text-on-surface-variant">
                    Select a date and time for your {appointmentType === "physical" ? "in-person visit" : "video consultation"}.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-2 text-emerald-700 hover:bg-emerald-200"
                    aria-label="Previous week"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <div className="flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                    <span className="material-symbols-outlined mr-2 text-[20px] text-emerald-700">calendar_today</span>
                    <span>{weekRangeLabel}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => w + 1)}
                    className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-2 text-emerald-700 hover:bg-emerald-200"
                    aria-label="Next week"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              </header>
            </div>

            {bookingMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {bookingMsg}
              </div>
            )}

            <div className="rounded-3xl bg-surface-container-lowest p-6 shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
              <div className="mb-6 grid grid-cols-7 gap-2 border-b border-outline-variant/10 pb-4">
                {weekDays.map((day) => {
                  const today = startOfDay(new Date());
                  const isPast = isBefore(day.date, today);
                  const isSelected = selectedDate === day.iso;
                  const isAvail = !isPast && isDateAvailableForDoctor(day.iso, appointmentType);

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
                            : isAvail
                              ? "border border-slate-200 bg-white hover:border-slate-300"
                              : "border border-dashed border-slate-200 bg-slate-50 opacity-50"
                      }`}
                      title={
                        isPast
                          ? "Past date"
                          : isAvail
                            ? `Available for ${appointmentType}`
                            : `No ${appointmentType} slots this day`
                      }
                    >
                      <span className={`mb-1 block text-[10px] font-bold uppercase tracking-widest ${
                        isPast ? "text-slate-400" : isSelected ? "text-[#006566]" : isAvail ? "text-slate-500" : "text-slate-300"
                      }`}>
                        {day.dow}
                      </span>
                      <span className={`font-headline text-lg font-bold ${
                        isPast ? "text-slate-400" : isSelected ? "text-[#006566]" : isAvail ? "text-slate-900" : "text-slate-300"
                      }`}>
                        {day.dayNum}
                      </span>
                      {isAvail && !isSelected && (
                        <span className="mt-1 block w-1 h-1 rounded-full bg-primary mx-auto"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    <div className="grid grid-cols-2 gap-3">
                      {slotsByPeriod[section.key].map((label) => renderSlotButton(label))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-between gap-3 border-t border-outline-variant/10 pt-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setBookingStep(1)}
                className="flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-200 px-8 py-3 text-sm font-bold text-emerald-900 shadow-md transition-transform hover:bg-emerald-300 hover:scale-[1.02] active:scale-[0.98] sm:justify-start"
              >
                Previous Step
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-full bg-black px-8 py-3 text-sm font-bold text-white shadow-md transition-transform hover:bg-neutral-900 hover:scale-[1.02] active:scale-[0.98]"
              >
                Continue to payment
              </button>
            </div>
          </div>

          {renderDoctorSidebar()}
        </div>
        )}
      </div>
    </PatientShell>
  );
}
