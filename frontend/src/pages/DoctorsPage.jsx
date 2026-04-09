import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import LandingTopBar from "../components/LandingTopBar";

const SPECIALTIES = ["Cardiologist", "Dermatologist", "Pediatrician", "Neurologist", "General Practitioner"];
const TIME_SLOTS = ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM", "03:00 PM", "04:00 PM"];
const PAGE_SIZE = 4;

export default function DoctorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickedSpecialties, setPickedSpecialties] = useState([]);
  const [ratingFloor, setRatingFloor] = useState(0);
  const [availability, setAvailability] = useState("today");
  const [maxFee, setMaxFee] = useState(500);
  const [sortBy, setSortBy] = useState("best");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/doctors/public")
      .then((res) => {
        const docs = res.data.doctors || [];
        const enriched = docs.map((doc, idx) => ({
          ...doc,
          rating: Number((4 + Math.random()).toFixed(1)),
          reviewCount: Math.floor(Math.random() * 300) + 40,
          consultationFeeUsd: (doc.consultationFee || [120, 150, 185, 95][idx % 4]),
          image: doc.image || `https://images.unsplash.com/photo-${[
            "1559839734-2b71ea197ec2",
            "1612277795421-9bc7706a4a41",
            "1594824476967-48c8b964273f",
            "1622253692010-333f2da6031d"
          ][idx % 4]}?auto=format&fit=crop&w=500&q=80`,
          availableSlots: TIME_SLOTS.slice(0, 3 + (idx % 3)),
          yearsExp: [15, 10, 18, 6][idx % 4],
        }));
        setDoctors(enriched);
      })
      .catch((err) => console.error("Failed to fetch doctors", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let out = doctors.filter((d) => {
      const name = (d.fullName || "").toLowerCase();
      const spec = (d.specialization || "General Practitioner").toLowerCase();
      const fee = Number(d.consultationFeeUsd || 0);
      const matchQ = !q || name.includes(q) || spec.includes(q);
      const matchSpec = pickedSpecialties.length === 0 || pickedSpecialties.some((s) => spec.includes(s.toLowerCase()));
      const matchRating = d.rating >= ratingFloor;
      const matchFee = fee <= maxFee;
      return matchQ && matchSpec && matchRating && matchFee;
    });

    if (sortBy === "availability") out.sort((a, b) => (a.availableSlots?.length || 0) - (b.availableSlots?.length || 0)).reverse();
    if (sortBy === "rating") out.sort((a, b) => b.rating - a.rating);
    if (sortBy === "price") out.sort((a, b) => Number(a.consultationFeeUsd || 0) - Number(b.consultationFeeUsd || 0));
    if (sortBy === "best") out.sort((a, b) => (b.rating * 10 + (b.availableSlots?.length || 0)) - (a.rating * 10 + (a.availableSlots?.length || 0)));
    return out;
  }, [doctors, searchQuery, pickedSpecialties, ratingFloor, maxFee, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pickedSpecialties, ratingFloor, availability, maxFee, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE));
  const pagedDoctors = filteredDoctors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSpecialty = (specialty) => {
    setPickedSpecialties((prev) => (prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty]));
  };

  const handleBook = (doctor) => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role === "doctor") return;
    navigate("/patient/doctors/booking", { state: { doctor } });
  };

  return (
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <LandingTopBar active="doctors" />

      <main className="mx-auto flex max-w-[1440px] gap-8 px-8 pb-20 pt-28">
        <aside className="sticky top-28 hidden h-[calc(100vh-140px)] w-72 shrink-0 flex-col gap-6 overflow-y-auto rounded-3xl bg-surface-container-low p-6 lg:flex">
          <div>
            <h2 className="font-headline text-xl font-bold text-primary">Filters</h2>
            <p className="text-sm font-body text-on-surface-variant">Refine your medical search</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">medical_services</span>Specialty
            </label>
            <div className="space-y-2">
              {SPECIALTIES.slice(0, 3).map((s) => (
                <label key={s} className="group flex cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-container-lowest">
                  <input
                    type="checkbox"
                    checked={pickedSpecialties.includes(s)}
                    onChange={() => toggleSpecialty(s)}
                    className="h-5 w-5 rounded-lg border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium text-on-surface group-hover:text-primary">{s.replace("ologist", "ology")}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">star</span>Rating
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setRatingFloor(4.5)} className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-xs font-medium transition-all hover:bg-primary hover:text-white">4.5+</button>
              <button type="button" onClick={() => setRatingFloor(4.0)} className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-xs font-medium transition-all hover:bg-primary hover:text-white">4.0+</button>
              <button type="button" onClick={() => setRatingFloor(0)} className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-xs font-medium transition-all hover:bg-primary hover:text-white">Any</button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">calendar_today</span>Availability
            </label>
            <div className="grid grid-cols-1 gap-2">
              {["today", "week"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAvailability(opt)}
                  className={`flex items-center justify-between rounded-xl p-3 text-sm ${availability === opt ? "bg-surface-container-lowest font-semibold text-primary shadow-[0px_20px_40px_rgba(0,29,50,0.06)]" : "border border-outline-variant/15 font-medium text-on-surface-variant hover:bg-surface-container-highest"}`}
                >
                  {opt === "today" ? "Today" : "This Week"}
                  {availability === opt && <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">payments</span>Consultation Fee
            </label>
            <input type="range" min="50" max="500" step="10" value={maxFee} onChange={(e) => setMaxFee(Number(e.target.value))} className="h-1.5 w-full appearance-none rounded-full bg-outline-variant/20 accent-primary" />
            <div className="flex justify-between text-xs font-bold text-on-surface-variant">
              <span>$50</span><span>${maxFee}+</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPickedSpecialties([]);
              setRatingFloor(0);
              setAvailability("today");
              setMaxFee(500);
              setSortBy("best");
              setSearchQuery("");
            }}
            className="mt-4 rounded-full bg-primary py-4 text-sm font-headline font-bold tracking-wide text-on-primary transition-all active:scale-95"
          >
            Apply Filters
          </button>
        </aside>

        <div className="flex-1 space-y-12">

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h3 className="text-2xl font-headline font-bold">Available Specialists</h3>
              <p className="font-body text-on-surface-variant">{filteredDoctors.length} qualified doctors match your criteria</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-outline-variant/10 bg-surface-container-low p-1.5">
              {[
                ["best", "Best Match"],
                ["availability", "Availability"],
                ["rating", "Rating"],
                ["price", "Price"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortBy(value)}
                  className={`rounded-full px-5 py-2.5 text-xs ${sortBy === value ? "bg-white font-bold text-primary shadow-[0px_20px_40px_rgba(0,29,50,0.06)]" : "font-semibold text-on-surface-variant transition-colors hover:text-primary"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-on-surface-variant">Loading doctors...</div>
          ) : (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              {pagedDoctors.map((doctor) => (
                <div key={doctor._id} className="group rounded-[2rem] bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(0,29,50,0.06)] transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex flex-col gap-8 md:flex-row">
                    <div className="relative shrink-0">
                      <img src={doctor.image} alt={doctor.fullName} className="h-56 w-full rounded-2xl object-cover md:w-48" />
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-primary shadow-sm backdrop-blur-md">
                        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        VERIFIED EXPERT
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-headline font-bold">{doctor.fullName}</h3>
                          <p className="font-medium text-on-surface-variant">{doctor.specialization || "General Practitioner"} • {doctor.yearsExp} Years Exp.</p>
                        </div>
                        <div className="flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1">
                          <span className="material-symbols-outlined text-lg text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-sm font-bold">{doctor.rating.toFixed(1)}</span>
                          <span className="text-[10px] text-on-surface-variant">({doctor.reviewCount} reviews)</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 border-y border-outline-variant/10 py-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg text-primary">event_available</span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">Next Available</p>
                            <p className="text-sm font-bold text-primary">{availability === "today" ? "Today" : "This Week"}, {doctor.availableSlots?.[0] || "Check app"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg text-primary">payments</span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">Consultation</p>
                            <p className="text-sm font-bold text-on-surface">${Number(doctor.consultationFeeUsd || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 pt-2">
                        <button type="button" onClick={() => handleBook(doctor)} className="flex-1 rounded-full bg-primary py-4 text-sm font-headline font-bold text-on-primary transition-all hover:bg-primary-container active:scale-[0.98]">Book Now</button>
                        <button type="button" onClick={() => navigate(`/doctors/${doctor._id}`)} className="rounded-full bg-secondary-container px-6 py-4 text-sm font-headline font-bold text-on-secondary-fixed-variant transition-all hover:bg-surface-container-high active:scale-[0.98]">View Profile</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-4 pt-8">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/20 transition-all hover:bg-primary hover:text-white">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${p === page ? "bg-primary text-on-primary" : "transition-all hover:bg-surface-container-low"}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="flex h-12 w-12 items-center justify-center rounded-full border border-outline-variant/20 transition-all hover:bg-primary hover:text-white">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="flex w-full flex-col items-center justify-between gap-8 border-t border-[#bdc9c8]/10 bg-[#edf4ff] px-8 py-12 md:flex-row">
        <div className="flex flex-col gap-2">
          <span className="font-headline text-lg font-bold tracking-tight text-[#006566]">MediFlow</span>
          <p className="font-label text-xs uppercase tracking-wider text-slate-500">© 2024 MediFlow Digital Institution. All rights reserved.</p>
        </div>
        <div className="flex gap-8">
          <a href="#" className="font-label text-xs uppercase tracking-wider text-slate-500 opacity-80 transition-opacity hover:text-primary hover:opacity-100">Privacy Policy</a>
          <a href="#" className="font-label text-xs uppercase tracking-wider text-slate-500 opacity-80 transition-opacity hover:text-primary hover:opacity-100">Terms of Service</a>
          <a href="#" className="font-label text-xs uppercase tracking-wider text-slate-500 opacity-80 transition-opacity hover:text-primary hover:opacity-100">Clinical Safety</a>
          <a href="#" className="font-label text-xs uppercase tracking-wider text-slate-500 opacity-80 transition-opacity hover:text-primary hover:opacity-100">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
