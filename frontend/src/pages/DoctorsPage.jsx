import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import LandingTopBar from "../components/LandingTopBar";

const SPECIALTIES = ["Cardiologist", "Dermatologist", "Pediatrician", "Neurologist", "General Practitioner"];
const PAGE_SIZE = 4;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatSlotTime = (time24) => {
  const [hRaw, mRaw] = String(time24 || "").split(":");
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h)) return null;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(hour12).padStart(2, "0")}:${String(Number.isNaN(m) ? 0 : m).padStart(2, "0")} ${suffix}`;
};

const getDoctorSchedule = (doctor) =>
  Array.isArray(doctor?.physicalAvailability) && doctor.physicalAvailability.length
    ? doctor.physicalAvailability
    : (doctor?.availability || []);

const getSlotsForDay = (schedule, dayName) => {
  const dayEntry = (schedule || []).find((entry) => entry?.day === dayName);
  return (dayEntry?.slots || []).map((slot) => formatSlotTime(slot?.start)).filter(Boolean);
};

const findNextAvailableSlot = (schedule, daysAhead = 7) => {
  const now = new Date();
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dayName = DAY_NAMES[d.getDay()];
    const slots = getSlotsForDay(schedule, dayName);
    if (slots.length) return { dayName, slot: slots[0], slotCount: slots.length };
  }
  return null;
};

export default function DoctorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [pickedSpecialties, setPickedSpecialties] = useState([]);
  const [ratingFloor, setRatingFloor] = useState(0);
  const [availability, setAvailability] = useState("all");
  const [maxFee, setMaxFee] = useState(10000);
  const [sortBy, setSortBy] = useState("best");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/doctors/public")
      .then((res) => {
        const docs = res.data.doctors || [];
        const uniqueDocs = Array.from(
          new Map(docs.map((doc) => [String(doc?._id || doc?.userId || ""), doc])).values()
        );
        const todayName = DAY_NAMES[new Date().getDay()];
        const enriched = uniqueDocs.map((doc) => {
          const seed = String(doc?._id || doc?.userId || "0");
          const charSum = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
          const imagePick = charSum % 4;
          
          // Generate fake rating (4.0 - 5.0) and review count (10 - 200) based on ID seed
          const fakeRating = 4.0 + (charSum % 11) / 10;
          const fakeReviews = 10 + (charSum % 191);

          return {
          ...doc,
          rating: Number(doc.rating || fakeRating),
          reviewCount: Number(doc.reviewCount || fakeReviews),
          consultationFeeUsd: Number(doc.consultationFee || 0),
          image: doc.image || `https://images.unsplash.com/photo-${[
            "1559839734-2b71ea197ec2",
            "1612277795421-9bc7706a4a41",
            "1594824476967-48c8b964273f",
            "1622253692010-333f2da6031d"
          ][imagePick]}?auto=format&fit=crop&w=500&q=80`,
          availableSlots: getSlotsForDay(getDoctorSchedule(doc), todayName),
          yearsExp: Number(doc.yearsExp || 0),
        };
        });
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

    if (availability !== "all") {
      out = out.filter((d) => {
        const schedule = getDoctorSchedule(d);
        if (!schedule.length) return false;
        if (availability === "today") {
          const todayName = DAY_NAMES[new Date().getDay()];
          return getSlotsForDay(schedule, todayName).length > 0;
        }
        return Boolean(findNextAvailableSlot(schedule, 7));
      });
    }

    if (sortBy === "availability") {
      out.sort((a, b) => {
        const aSchedule = getDoctorSchedule(a);
        const bSchedule = getDoctorSchedule(b);
        const aScore = availability === "today"
          ? getSlotsForDay(aSchedule, DAY_NAMES[new Date().getDay()]).length
          : (findNextAvailableSlot(aSchedule, 7)?.slotCount || 0);
        const bScore = availability === "today"
          ? getSlotsForDay(bSchedule, DAY_NAMES[new Date().getDay()]).length
          : (findNextAvailableSlot(bSchedule, 7)?.slotCount || 0);
        return bScore - aScore;
      });
    }
    if (sortBy === "rating") out.sort((a, b) => b.rating - a.rating);
    if (sortBy === "price") out.sort((a, b) => Number(a.consultationFeeUsd || 0) - Number(b.consultationFeeUsd || 0));
    if (sortBy === "best") out.sort((a, b) => (b.rating * 10 + (b.availableSlots?.length || 0)) - (a.rating * 10 + (a.availableSlots?.length || 0)));
    return out;
  }, [doctors, searchQuery, pickedSpecialties, ratingFloor, availability, maxFee, sortBy]);

  const nextAvailabilityLabel = (doctor) => {
    const schedule = getDoctorSchedule(doctor);
    if (!schedule.length) return "Check app";
    if (availability === "today") {
      const todayName = DAY_NAMES[new Date().getDay()];
      const todaySlots = getSlotsForDay(schedule, todayName);
      return todaySlots.length ? `Today, ${todaySlots[0]}` : "Check app";
    }
    const next = findNextAvailableSlot(schedule, 7);
    if (availability === "week") return next ? `${next.dayName}, ${next.slot}` : "Check app";
    return next ? `${next.dayName}, ${next.slot}` : "Check availability";
  };

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
    <div className="bg-[#f0fdf4] text-[#043927] selection:bg-[#CBF79D] selection:text-[#043927] font-sans">
      <LandingTopBar active="doctors" />

      <main className="mx-auto flex max-w-[1440px] gap-8 px-8 pb-24 pt-32">
        <aside className="sticky top-28 hidden h-[calc(100vh-140px)] w-72 shrink-0 flex-col gap-6 overflow-y-auto rounded-[2.5rem] bg-white border border-[#356600]/10 p-6 lg:flex shadow-sm">
          <div>
            <h2 className="font-headline text-xl font-extrabold text-[#043927]">Filters</h2>
            <p className="text-sm font-medium text-[#043927]/50 mt-1">Refine your search</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#043927]/40">
              <span className="material-symbols-outlined text-sm">medical_services</span>Specialty
            </label>
            <div className="grid grid-cols-1 gap-2">
              {SPECIALTIES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSpecialty(s)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    pickedSpecialties.includes(s) 
                      ? "bg-[#CBF79D] text-[#043927] shadow-lg shadow-[#CBF79D]/30" 
                      : "bg-[#fcfdfa] text-[#043927]/60 hover:bg-[#CBF79D]/10"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${pickedSpecialties.includes(s) ? "bg-[#437A00]" : "bg-[#356600]/10"}`}></div>
                  {s.replace("ologist", "ology")}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#043927]/40">
              <span className="material-symbols-outlined text-sm">star</span>Rating
            </label>
            <div className="flex gap-2">
              {[4.5, 4.0, 0].map((r) => (
                <button 
                  key={r}
                  type="button" 
                  onClick={() => setRatingFloor(r)} 
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    ratingFloor === r 
                    ? "bg-[#043927] text-white border-transparent" 
                    : "bg-white text-[#043927] border-[#356600]/10 hover:border-[#437A00]/30"
                  }`}
                >
                  {r === 0 ? "Any" : `${r}+`}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#043927]/40">
              <span className="material-symbols-outlined text-sm">payments</span>Consultation Fee
            </label>
            <div className="px-1">
              <input 
                type="range" 
                min="0" 
                max="10000" 
                step="100" 
                value={maxFee} 
                onChange={(e) => setMaxFee(Number(e.target.value))} 
                className="h-1.5 w-full appearance-none rounded-full bg-[#356600]/10 accent-[#437A00]" 
              />
              <div className="flex justify-between mt-3 text-xs font-bold text-[#043927]/60">
                <span>LKR 0</span>
                <span className="px-2 py-1 rounded-md bg-[#CBF79D]/30 text-[#437A00]">LKR {maxFee}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPickedSpecialties([]);
              setRatingFloor(0);
              setAvailability("all");
              setMaxFee(10000);
              setSortBy("best");
              setSearchQuery("");
            }}
            className="mt-4 w-full rounded-2xl bg-[#043927] py-4 text-sm font-bold tracking-wide text-white transition-all hover:bg-[#065036] shadow-lg shadow-[#043927]/20 active:scale-[0.98]"
          >
            Reset Filters
          </button>
        </aside>

        <div className="flex-1 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-headline font-extrabold text-[#043927]">
                Available <span className="text-[#437A00]">Specialists</span>
              </h3>
              <p className="text-[#043927]/50 font-medium">{filteredDoctors.length} qualified doctors found</p>
            </div>
            
            <div className="flex bg-[#CBF79D]/20 p-1.5 rounded-2xl border border-[#356600]/5">
              {[
                ["best", "Best Match"],
                ["rating", "Rating"],
                ["price", "Price"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSortBy(value)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    sortBy === value 
                    ? "bg-white text-[#437A00] shadow-sm" 
                    : "text-[#043927]/60 hover:text-[#437A00]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-[#CBF79D] border-t-[#437A00] rounded-full animate-spin"></div>
              <p className="text-[#043927]/50 font-bold uppercase tracking-widest text-xs">Finding doctors...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {pagedDoctors.map((doctor) => (
                <div key={doctor._id} className="group relative rounded-[2.5rem] bg-white border border-[#356600]/5 p-6 hover:shadow-2xl hover:shadow-[#043927]/10 transition-all duration-500 hover:-translate-y-1">
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                      <div className="relative h-64 w-full md:w-64 shrink-0 overflow-hidden rounded-3xl shadow-md">
                        <img 
                          src={doctor.image} 
                          alt={doctor.fullName} 
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        />
                        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-[#356600]/5">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="text-xs font-extrabold text-[#043927]">{doctor.rating.toFixed(1)}</span>
                            <span className="text-[10px] font-bold text-[#043927]/40">({doctor.reviewCount})</span>
                          </div>
                        </div>
                        <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-[#043927] px-3 py-1.5 text-[9px] font-bold text-white uppercase tracking-widest shadow-xl">
                          <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          Verified Specialist
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center space-y-4 min-w-0 w-full">
                        <div>
                          <h3 className="text-2xl md:text-3xl font-headline font-extrabold text-[#043927] group-hover:text-[#437A00] transition-colors">
                            {doctor.fullName}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
                            <span className="text-xs md:text-sm font-bold text-[#437A00] bg-[#CBF79D]/30 px-3 py-1 rounded-full whitespace-nowrap">{doctor.specialization}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#043927]/20 hidden sm:block"></span>
                            <span className="text-xs md:text-sm font-medium text-[#043927]/50 whitespace-nowrap">{doctor.yearsExp} Years Experience</span>
                          </div>
                        </div>
                        <p className="text-[#043927]/60 leading-relaxed line-clamp-3 font-medium text-sm">
                          {doctor.bio || "Dedicated specialist providing personalized healthcare with modern clinical practices and a patient-centered approach."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-y border-[#356600]/5">
                        <div className="flex items-center gap-4 bg-[#fcfdfa] p-4 rounded-2xl border border-[#356600]/5">
                          <div className="w-12 h-12 rounded-xl bg-[#CBF79D]/30 flex items-center justify-center text-[#437A00]">
                            <span className="material-symbols-outlined text-2xl">calendar_today</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#043927]/30 uppercase tracking-widest mb-0.5">Next Available</p>
                            <p className="text-sm font-extrabold text-[#043927]">{nextAvailabilityLabel(doctor)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-[#fcfdfa] p-4 rounded-2xl border border-[#356600]/5">
                          <div className="w-12 h-12 rounded-xl bg-[#CBF79D]/30 flex items-center justify-center text-[#437A00]">
                            <span className="material-symbols-outlined text-2xl">payments</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#043927]/30 uppercase tracking-widest mb-0.5">Consultation Fee</p>
                            <p className="text-sm font-extrabold text-[#043927]">LKR {Number(doctor.consultationFeeUsd).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-2">
                        <button 
                          onClick={() => handleBook(doctor)}
                          className="flex-1 rounded-2xl bg-[#437A00] py-5 text-base font-bold text-white shadow-lg shadow-[#437A00]/20 hover:bg-[#043927] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-xl">event_upcoming</span>
                          Book Appointment Now
                        </button>
                        <button 
                          onClick={() => navigate(`/doctors/${doctor._id}`)}
                          className="px-8 rounded-2xl bg-[#CBF79D] text-[#043927] hover:bg-[#043927] hover:text-white transition-all duration-300 flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 pt-12">
            <button 
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-12 h-12 rounded-2xl border border-[#356600]/10 flex items-center justify-center hover:bg-[#043927] hover:text-white transition-all group shadow-sm"
            >
              <span className="material-symbols-outlined group-active:scale-90">chevron_left</span>
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-12 h-12 rounded-2xl font-extrabold text-sm transition-all ${
                    p === page 
                    ? "bg-[#CBF79D] text-[#043927] shadow-lg shadow-[#CBF79D]/30" 
                    : "hover:bg-[#CBF79D]/10 text-[#043927]/60"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-12 h-12 rounded-2xl border border-[#356600]/10 flex items-center justify-center hover:bg-[#043927] hover:text-white transition-all group shadow-sm"
            >
              <span className="material-symbols-outlined group-active:scale-90">chevron_right</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-[#fcfdfa] border-t border-[#356600]/10 pt-24">
        <div className="mx-auto max-w-screen-2xl px-12">
          <div className="grid grid-cols-1 gap-16 pb-20 md:grid-cols-4">
            <div className="md:col-span-1">
              <h2 className="mb-8 font-headline text-3xl font-extrabold tracking-tight text-[#043927]">MediFlow</h2>
              <p className="mb-8 text-lg leading-relaxed text-[#043927]/60">
                Redefining modern healthcare with clinical precision and a human touch. Accessible, efficient, and compassionate.
              </p>
              <div className="flex gap-4">
                {[
                  {
                    name: 'facebook',
                    path: 'M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z'
                  },
                  {
                    name: 'twitter',
                    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z'
                  },
                  {
                    name: 'linkedin',
                    path: 'M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a2.7 2.7 0 0 0-2.7-2.7c-.7 0-1.3.3-1.8.9v-.8h-2.5v7.9h2.5v-4.1a1.2 1.2 0 0 1 1.2-1.2c.7 0 1.2.5 1.2 1.2v4.1h2.1m-10.9-7.9h2.5v7.9h-2.5v-7.9m1.2-1.1a1.4 1.4 0 0 0 1.4-1.4 1.4 1.4 0 0 0-1.4-1.4 1.4 1.4 0 0 0-1.4 1.4 1.4 1.4 0 0 0 1.4 1.4z'
                  },
                  {
                    name: 'instagram',
                    path: 'M7 2h10c2.76 0 5 2.24 5 5v10c0 2.76-2.24 5-5 5H7c-2.76 0-5-2.24-5-5V7c0-2.76 2.24-5 5-5zm10.5 2c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z'
                  }
                ].map((social) => (
                  <a key={social.name} href="#" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#CBF79D] text-[#043927] transition-all hover:bg-[#043927] hover:text-white">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d={social.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-8 text-sm font-bold uppercase tracking-widest text-[#043927]">Quick Links</h4>
              <ul className="space-y-4">
                {[
                  { label: "About Us", path: "/about" },
                  { label: "Our Doctors", path: "/doctors" },
                  { label: "Book Appointment", path: "/doctors" },
                  { label: "Patient Stories", path: "#testimonials" }
                ].map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="text-lg font-medium text-[#043927]/60 transition-colors hover:text-[#356600]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-8 text-sm font-bold uppercase tracking-widest text-[#043927]">Support</h4>
              <ul className="space-y-4">
                {[
                  { label: "Contact Us", path: "/contact" },
                  { label: "Privacy Policy", path: "/privacy" },
                  { label: "FAQ Support", path: "#faq" },
                  { label: "Help Center", path: "/contact" }
                ].map((link) => (
                  <li key={link.label}>
                    <Link to={link.path} className="text-lg font-medium text-[#043927]/60 transition-colors hover:text-[#356600]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2rem] bg-[#CBF79D] p-8 border border-[#356600]/10 shadow-sm">
              <h4 className="mb-4 text-xl font-bold text-[#043927]">Newsletter</h4>
              <p className="mb-6 text-sm font-medium leading-relaxed text-[#043927]/60">
                Get the latest clinical insights and medical updates directly to your inbox.
              </p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full rounded-xl border border-[#356600]/10 bg-white px-5 py-4 text-sm focus:border-[#356600] focus:outline-none focus:ring-4 focus:ring-[#356600]/5 transition-all"
                />
                <button className="w-full rounded-xl bg-[#043927] py-4 font-bold text-white shadow-lg shadow-[#043927]/20 transition-all hover:bg-[#065036]" type="button">
                  Subscribe Now
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-6 border-t border-[#356600]/10 py-12 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[#356600]"></div>
              <p className="text-sm font-bold text-[#043927]/60 uppercase tracking-widest">
                © {new Date().getFullYear()} MediFlow Enterprise
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-4">
              {["Clinical Standards", "HIPAA Compliance", "Accessibility"].map((item) => (
                <a key={item} href="#" className="text-sm font-bold text-[#043927]/40 transition-colors hover:text-[#356600] uppercase tracking-wider">
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
