import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

const SPECIALTY_CHIPS = [
  { label: "All Specialties", value: "All" },
  { label: "Cardiology", value: "Cardiology" },
  { label: "Dermatology", value: "Dermatology" },
  { label: "Neurology", value: "Neurology" },
  { label: "Pediatrics", value: "Pediatrics" },
  { label: "Psychiatry", value: "Psychiatry" },
  { label: "Orthopedics", value: "Orthopedics" },
  { label: "General", value: "General" },
];

const specialtyKeywords = {
  Cardiology: ["cardio", "cardiolog"],
  Dermatology: ["derma", "skin"],
  Neurology: ["neuro", "brain", "nerv"],
  Pediatrics: ["pedi", "child", "children"],
  Psychiatry: ["psychi", "mental"],
  Orthopedics: ["ortho", "bone", "joint", "musculo"],
  General: ["general", "family", "gp", "physician", "medicine"],
};

function matchesSpecialty(doctorSpecialty, selectedSpecialty) {
  const selected = String(selectedSpecialty || "").trim();
  if (!selected || selected === "All") return true;

  const normalized = String(doctorSpecialty || "").toLowerCase();
  const keywords = specialtyKeywords[selected] || [selected.toLowerCase()];
  return keywords.some((k) => normalized.includes(k));
}

const availabilityOptions = [
  { value: "all", label: "Any Time" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This Week" }
];

const priceRanges = [
  { value: "all", label: "Any Price" },
  { value: "low", label: "LKR 0 - 2,000" },
  { value: "medium", label: "LKR 2,000 - 5,000" },
  { value: "high", label: "LKR 5,000+" }
];

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM",
  "03:00 PM", "04:00 PM", "05:00 PM"
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PatientDoctorsPage() {
  const DOCTORS_PER_PAGE = 12;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Data states
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const q = searchParams.get("search") || searchParams.get("q");
    if (q) setSearchQuery(decodeURIComponent(q.trim()));
  }, [searchParams]);

  // Fetch doctors
  useEffect(() => {
    api.get("/doctors/public")
      .then((res) => {
        const docs = res.data.doctors || [];
        const enhancedDocs = docs.map((doc) => {
          const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
          const todayAvail = (doc.availability || []).find((a) => a.day === today);
          const availableSlots = (todayAvail?.slots || []).map((s) => {
            const [h, m] = String(s.start || "").split(":").map(Number);
            if (isNaN(h)) return null;
            const ampm = h >= 12 ? "PM" : "AM";
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${String(h12).padStart(2, "0")}:${String(m || 0).padStart(2, "0")} ${ampm}`;
          }).filter(Boolean);
          return {
            ...doc,
            image: doc.image || "/doctor-placeholder.svg",
            availableSlots
          };
        });
        setDoctors(enhancedDocs);
        setFilteredDoctors(enhancedDocs);
      })
      .catch((err) => console.error("Failed to fetch doctors", err))
      .finally(() => setLoading(false));
  }, []);

  // Filter logic
  useEffect(() => {
    let filtered = [...doctors];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.fullName?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q)
      );
    }
    
    if (selectedSpecialty !== "All") {
      filtered = filtered.filter((d) =>
        matchesSpecialty(d.specialization || d.specialty || "", selectedSpecialty)
      );
    }

    if (selectedAvailability !== "all") {
      const now = new Date();
      const targetDate = new Date(now);
      if (selectedAvailability === "tomorrow") {
        targetDate.setDate(now.getDate() + 1);
      }

      const inNext7Days = (availability = []) => {
        for (let i = 0; i < 7; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() + i);
          const dayName = DAY_NAMES[d.getDay()];
          const dayEntry = availability.find((a) => a?.day === dayName);
          if (Array.isArray(dayEntry?.slots) && dayEntry.slots.length > 0) return true;
        }
        return false;
      };

      filtered = filtered.filter((d) => {
        const availability = d.physicalAvailability?.length
          ? d.physicalAvailability
          : (d.availability || []);

        if (!Array.isArray(availability) || availability.length === 0) return false;

        if (selectedAvailability === "week") {
          return inNext7Days(availability);
        }

        const dayName = DAY_NAMES[targetDate.getDay()];
        const dayEntry = availability.find((a) => a?.day === dayName);
        return Array.isArray(dayEntry?.slots) && dayEntry.slots.length > 0;
      });
    }
    
    if (selectedPriceRange !== "all") {
      filtered = filtered.filter(d => {
        const fee = d.consultationFee || 0;
        if (selectedPriceRange === "low") return fee <= 2000;
        if (selectedPriceRange === "medium") return fee > 2000 && fee <= 5000;
        if (selectedPriceRange === "high") return fee > 5000;
        return true;
      });
    }
    
    if (minRating > 0) {
      filtered = filtered.filter(d => parseFloat(d.rating || 0) >= minRating);
    }
    
    if (sortBy === "rating") {
      filtered.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else if (sortBy === "price_low") {
      filtered.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
    } else if (sortBy === "price_high") {
      filtered.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));
    }
    
    setFilteredDoctors(filtered);
  }, [searchQuery, selectedSpecialty, selectedAvailability, selectedPriceRange, minRating, sortBy, doctors]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSpecialty, selectedAvailability, selectedPriceRange, minRating, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / DOCTORS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedDoctors = useMemo(() => {
    const start = (currentPage - 1) * DOCTORS_PER_PAGE;
    return filteredDoctors.slice(start, start + DOCTORS_PER_PAGE);
  }, [filteredDoctors, currentPage]);

  const handleBookClick = (doctor) => {
    if (user.role === "doctor") {
      alert("Doctors cannot book appointments as patients.");
      return;
    }
    navigate("/patient/doctors/booking", { state: { doctor } });
  };

  const experienceYears = (doctor, idx) => {
    let h = 0;
    const id = String(doctor?._id || doctor?.userId || idx);
    for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 23;
    return 5 + h;
  };

  const nextSlotLabel = (doctor) => {
    const slot = doctor.availableSlots?.[0];
    if (!slot) return "Check availability";
    return `Today, ${slot}`;
  };

  const getDoctorGenderLabel = (doctor) => {
    const raw = doctor?.gender || doctor?.user?.gender || doctor?.profile?.gender || "";
    const normalized = String(raw).trim().toLowerCase();
    if (normalized === "male" || normalized === "m") return "Male";
    if (normalized === "female" || normalized === "f") return "Female";
    return "";
  };

  return (
    <PatientShell>
      <div className="mx-auto max-w-7xl overflow-x-hidden px-4 pb-20 font-body text-on-surface md:px-8 lg:px-12">
        <section className="mb-10 rounded-[28px] border border-outline-variant/10 bg-white p-5 shadow-[0_18px_40px_rgba(2,32,71,0.06)] md:p-7">
        <header className="mb-8">
          <h1 className="mb-2.5 font-headline text-2xl font-extrabold tracking-tight text-on-surface md:text-3xl">
            Select your <span className="text-primary">specialist.</span>
          </h1>
          <p className="text-sm leading-relaxed text-on-surface-variant md:max-w-none md:text-base">
            Connect with verified medical professionals. Book a consultation in a few steps—precision care, clear pricing.
          </p>
        </header>

        <div className="space-y-7">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="relative md:col-span-8">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-emerald-700">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                type="search"
                placeholder="Search by name, specialty, or symptoms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-3xl border border-emerald-200 bg-white py-5 pl-14 pr-6 font-body text-on-surface shadow-[0px_12px_28px_rgba(0,29,50,0.06)] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="md:col-span-4">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((v) => !v)}
                className="flex w-full items-center justify-between rounded-3xl bg-surface-container-highest/50 px-6 py-5 font-semibold text-on-surface-variant backdrop-blur-sm transition-colors hover:bg-surface-variant"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined">tune</span>
                  Advanced filters
                </span>
                <span className="material-symbols-outlined text-primary">
                  {showAdvancedFilters ? "expand_less" : "arrow_forward_ios"}
                </span>
              </button>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 gap-4 rounded-3xl border border-outline-variant/15 bg-surface-container-lowest/80 p-5 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Availability</label>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-white px-3 py-2.5 text-sm"
                >
                  {availabilityOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Price range</label>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => setSelectedPriceRange(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-white px-3 py-2.5 text-sm"
                >
                  {priceRanges.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-on-surface-variant">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="rating">Highest rated</option>
                  <option value="price_low">Price: low to high</option>
                  <option value="price_high">Price: high to low</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-on-surface-variant">
                  Min rating: {minRating > 0 ? `${minRating}+` : "Any"}
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="1"
                  value={minRating}
                  onChange={(e) => setMinRating(parseInt(e.target.value, 10))}
                  className="w-full accent-primary"
                />
              </div>
            </div>
          )}

          <div className="-mx-1 flex items-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SPECIALTY_CHIPS.map((chip) => {
              const active = selectedSpecialty === chip.value;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setSelectedSpecialty(chip.value)}
                  className={`whitespace-nowrap rounded-full px-6 py-3 text-sm font-bold transition-all ${
                    active
                      ? "bg-emerald-200 text-emerald-900 shadow-md shadow-emerald-200/70"
                      : "border border-outline-variant/10 bg-surface-container-lowest font-medium text-on-surface-variant hover:border-primary/30 hover:bg-surface-container"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
        </section>

        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-on-surface-variant">
            <span className="font-headline font-bold text-on-surface">{filteredDoctors.length}</span> doctors
            {(searchQuery || selectedSpecialty !== "All" || selectedPriceRange !== "all" || minRating > 0) && (
              <button
                type="button"
                className="ml-3 rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSpecialty("All");
                  setSelectedAvailability("all");
                  setSelectedPriceRange("all");
                  setMinRating(0);
                  setSortBy("rating");
                }}
              >
                Clear filters
              </button>
            )}
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-on-surface-variant">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-surface-container border-t-primary" />
            <p className="mt-4 text-sm font-medium">Loading doctors…</p>
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-3xl border border-outline-variant/15 bg-surface-container-lowest py-16 text-center">
            <span className="material-symbols-outlined mb-4 text-5xl text-on-surface-variant/40">person_search</span>
            <h3 className="font-headline text-lg font-bold text-on-surface">No doctors found</h3>
            <p className="mt-2 text-sm text-on-surface-variant">Try adjusting search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {paginatedDoctors.map((doctor, idx) => {
              const verified = doctor.isVerified === true;
              const exp = experienceYears(doctor, idx);
              const genderLabel = getDoctorGenderLabel(doctor);
              const numericRating = Number(doctor.rating) || 0;
              const safeRating = Math.min(5, Math.max(0, numericRating));
              const roundedRating = safeRating > 0 ? Math.round(safeRating * 10) / 10 : 0;
              const reviewCount = Number(doctor.reviewCount) || (Array.isArray(doctor.reviews) ? doctor.reviews.length : 0);
              return (
                <article
                  key={doctor._id}
                  className="relative flex h-full flex-col rounded-3xl border border-emerald-200/70 bg-white/95 p-5"
                >
                  <div className="mb-5 flex min-h-[140px] items-start gap-4">
                    <div className="relative h-20 w-20 shrink-0">
                      <img
                        src={doctor.image}
                        alt=""
                        className="h-full w-full rounded-2xl object-cover shadow-sm"
                      />
                      {verified && (
                        <div className="absolute -bottom-2 -right-2 rounded-full bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-on-primary">
                          Verified
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex min-h-[120px] flex-1 flex-col">
                      <h3 className="mb-0.5 truncate font-headline text-xl font-bold leading-tight text-on-surface md:text-2xl">
                        {doctor.fullName}
                      </h3>
                      <p className="mb-2 text-sm font-semibold text-emerald-700">
                        {doctor.specialization || "General Practitioner"}
                      </p>
                      {genderLabel && (
                        <div className="mb-2 inline-flex items-center rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                          {genderLabel}
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1.5 text-sm font-medium text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">history_edu</span>
                        {exp} years experience
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined text-sm"
                              style={{
                                fontVariationSettings: `'FILL' ${i < Math.round(safeRating) ? 1 : 0}, 'wght' 600`,
                              }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <span className="text-sm font-bold text-on-surface">{roundedRating.toFixed(1)}</span>
                        <span className="text-xs text-on-surface-variant/70">({reviewCount} reviews)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto space-y-4 border-t border-outline-variant/10 pt-4">
                    <div className="flex min-h-[66px] items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">Next Slot</p>
                        <p className="font-bold text-emerald-700">{nextSlotLabel(doctor)}</p>
                      </div>
                      <span className="material-symbols-outlined text-emerald-700 text-[20px]">calendar_month</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-on-surface-variant">Consultation Fee</span>
                      <span className="font-bold text-on-surface">LKR {doctor.consultationFee?.toLocaleString()}</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleBookClick(doctor)}
                        className="w-full rounded-full bg-emerald-300 py-3 text-sm font-bold text-black shadow-md transition-transform hover:bg-emerald-400 active:scale-[0.98]"
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filteredDoctors.length > DOCTORS_PER_PAGE && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-full border border-outline-variant/20 bg-white px-4 py-2 text-sm font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`h-10 min-w-10 rounded-full px-3 text-sm font-bold transition-colors ${
                  currentPage === page
                    ? "bg-primary text-on-primary"
                    : "border border-outline-variant/20 bg-white text-on-surface hover:bg-surface-container"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-full border border-outline-variant/20 bg-white px-4 py-2 text-sm font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </PatientShell>
  );
}
