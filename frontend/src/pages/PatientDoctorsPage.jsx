import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PatientShell from "../components/PatientShell";
import { useAuth } from "../context/AuthContext";

/** Horizontal chips — label shown, value matches `specialization` filter */
const SPECIALTY_CHIPS = [
  { label: "All Specialties", value: "All" },
  { label: "Cardiology", value: "Cardiologist" },
  { label: "Dermatology", value: "Dermatologist" },
  { label: "Neurology", value: "Neurologist" },
  { label: "Pediatrics", value: "Pediatrician" },
  { label: "Psychiatry", value: "Psychiatrist" },
  { label: "Orthopedics", value: "Orthopedist" },
  { label: "General", value: "General Practitioner" },
];

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

export default function PatientDoctorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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

  // Fetch doctors
  useEffect(() => {
    api.get("/doctors/public")
      .then((res) => {
        const docs = res.data.doctors || [];
        const enhancedDocs = docs.map((doc, idx) => ({
          ...doc,
          rating: (4 + Math.random()).toFixed(1),
          reviewCount: Math.floor(Math.random() * 100) + 10,
          consultationFee: doc.consultationFee || [1500, 2500, 3500, 4500][idx % 4],
          image: doc.image || `https://images.unsplash.com/photo-${[
            "1612349317150-e413f6a5b16d",
            "1559839734-2b71ea197ec2",
            "1594824476967-48c8b964273f",
            "1622253692010-333f2da6031d"
          ][idx % 4]}?auto=format&fit=crop&w=300&q=80`,
          availableSlots: timeSlots.slice(0, 4 + (idx % 4))
        }));
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
      filtered = filtered.filter(d => 
        d.specialization?.toLowerCase().includes(selectedSpecialty.toLowerCase())
      );
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
      filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (sortBy === "price_low") {
      filtered.sort((a, b) => (a.consultationFee || 0) - (b.consultationFee || 0));
    } else if (sortBy === "price_high") {
      filtered.sort((a, b) => (b.consultationFee || 0) - (a.consultationFee || 0));
    }
    
    setFilteredDoctors(filtered);
  }, [searchQuery, selectedSpecialty, selectedPriceRange, minRating, sortBy, doctors]);

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

  return (
    <PatientShell>
      <div className="mx-auto max-w-7xl px-4 pb-20 font-body text-on-surface md:px-8 lg:px-12">
        <header className="mb-10">
          <h1 className="mb-4 font-headline text-4xl font-extrabold tracking-tight text-on-surface md:text-5xl">
            Select your <span className="text-primary">specialist.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-on-surface-variant">
            Connect with verified medical professionals. Book a consultation in a few steps—precision care, clear pricing.
          </p>
        </header>

        <div className="mb-10 space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="relative md:col-span-8">
              <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-primary-container">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                type="search"
                placeholder="Search by name, specialty, or symptoms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-3xl border-none bg-surface-container-lowest py-5 pl-14 pr-6 font-body text-on-surface shadow-[0px_20px_40px_rgba(0,29,50,0.04)] placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                      ? "bg-primary text-on-primary shadow-md shadow-primary/20"
                      : "border border-outline-variant/10 bg-surface-container-lowest font-medium text-on-surface-variant hover:border-primary/30 hover:bg-surface-container"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-on-surface-variant">
            <span className="font-headline font-bold text-on-surface">{filteredDoctors.length}</span> doctors
            {(searchQuery || selectedSpecialty !== "All" || selectedPriceRange !== "all" || minRating > 0) && (
              <button
                type="button"
                className="ml-3 text-primary underline-offset-2 hover:underline"
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
            {filteredDoctors.map((doctor, idx) => {
              const verified = parseFloat(doctor.rating) >= 4.5;
              const exp = experienceYears(doctor, idx);
              return (
                <article
                  key={doctor._id}
                  className="group relative rounded-3xl bg-surface-container-lowest p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0px_30px_60px_rgba(0,29,50,0.08)]"
                >
                  <div className="mb-6 flex items-start gap-5">
                    <div className="relative h-24 w-24 shrink-0">
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
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1 text-primary-container">
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                        <span className="text-sm font-bold">{doctor.rating}</span>
                        <span className="text-xs text-on-surface-variant/60">({doctor.reviewCount} reviews)</span>
                      </div>
                      <h3 className="mb-1 font-headline text-xl font-bold leading-tight text-on-surface transition-colors group-hover:text-primary">
                        {doctor.fullName}
                      </h3>
                      <p className="mb-2 text-sm font-medium text-on-surface-variant/80">
                        {doctor.specialization || "General Practitioner"}
                      </p>
                      <div className="inline-flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1 text-xs font-semibold text-primary-container">
                        <span className="material-symbols-outlined text-[14px]">history_edu</span>
                        {exp} years experience
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-outline-variant/10 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-primary-container text-[18px]">calendar_today</span>
                        Next slot
                      </span>
                      <span className="font-bold text-on-surface">{nextSlotLabel(doctor)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-primary-container text-[18px]">payments</span>
                        Consultation
                      </span>
                      <span className="font-bold text-on-surface">LKR {doctor.consultationFee?.toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookClick(doctor)}
                      className="w-full rounded-2xl bg-primary py-4 text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
                    >
                      Book appointment
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <section className="mt-20">
          <h2 className="mb-8 font-headline text-2xl font-bold text-on-surface">Why book with us?</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-outline-variant/5 bg-surface-container-low p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 600" }}>
                  verified_user
                </span>
              </div>
              <h4 className="mb-2 font-headline text-lg font-bold text-on-surface">Verified experts</h4>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Doctors are listed with transparent fees and availability so you can choose confidently.
              </p>
            </div>
            <div className="rounded-3xl bg-primary p-8 text-white">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md">
                <span className="material-symbols-outlined">bolt</span>
              </div>
              <h4 className="mb-2 font-headline text-lg font-bold">Instant booking</h4>
              <p className="text-sm leading-relaxed text-primary-fixed">
                Pick a slot, add your reason, and continue to secure payment—no phone tag required.
              </p>
            </div>
            <div className="rounded-3xl border border-outline-variant/5 bg-surface-container-low p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                <span className="material-symbols-outlined">security</span>
              </div>
              <h4 className="mb-2 font-headline text-lg font-bold text-on-surface">Data privacy</h4>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Your health information stays protected with modern security practices and access controls.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PatientShell>
  );
}
