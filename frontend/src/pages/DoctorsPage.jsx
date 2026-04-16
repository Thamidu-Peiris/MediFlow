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
          const imagePick = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4;
          return {
          ...doc,
          rating: Number(doc.rating || 0),
          reviewCount: Number(doc.reviewCount || 0),
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
    <div className="bg-surface text-on-surface selection:bg-primary-container selection:text-on-primary-container">
      <LandingTopBar active="doctors" />

      <main className="mx-auto flex max-w-[1440px] gap-6 px-8 pb-20 pt-28">
        <aside className="sticky top-28 hidden h-[calc(100vh-140px)] w-64 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl bg-surface-container-low p-4 lg:flex">
          <div>
            <h2 className="font-headline text-lg font-bold text-primary">Filters</h2>
            <p className="text-xs font-body text-on-surface-variant">Refine your medical search</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">medical_services</span>Specialty
            </label>
            <div className="space-y-1.5">
              {SPECIALTIES.slice(0, 3).map((s) => (
                <label key={s} className="group flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-surface-container-lowest">
                  <input
                    type="checkbox"
                    checked={pickedSpecialties.includes(s)}
                    onChange={() => toggleSpecialty(s)}
                    className="h-4 w-4 rounded-md border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="text-xs font-medium text-on-surface group-hover:text-primary">{s.replace("ologist", "ology")}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">star</span>Rating
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setRatingFloor(4.5)} className="rounded-full border border-outline-variant/30 px-2.5 py-1 text-[11px] font-medium transition-all hover:bg-primary hover:text-white">4.5+</button>
              <button type="button" onClick={() => setRatingFloor(4.0)} className="rounded-full border border-outline-variant/30 px-2.5 py-1 text-[11px] font-medium transition-all hover:bg-primary hover:text-white">4.0+</button>
              <button type="button" onClick={() => setRatingFloor(0)} className="rounded-full border border-outline-variant/30 px-2.5 py-1 text-[11px] font-medium transition-all hover:bg-primary hover:text-white">Any</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">calendar_today</span>Availability
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {["all", "today", "week"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAvailability(opt)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-xs ${availability === opt ? "bg-surface-container-lowest font-semibold text-primary shadow-[0px_20px_40px_rgba(0,29,50,0.06)]" : "border border-outline-variant/15 font-medium text-on-surface-variant hover:bg-surface-container-highest"}`}
                >
                  {opt === "all" ? "All" : opt === "today" ? "Today" : "This Week"}
                  {availability === opt && <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
              <span className="material-symbols-outlined text-sm">payments</span>Consultation Fee
            </label>
            <input type="range" min="0" max="10000" step="100" value={maxFee} onChange={(e) => setMaxFee(Number(e.target.value))} className="h-1.5 w-full appearance-none rounded-full bg-outline-variant/20 accent-primary" />
            <div className="flex justify-between text-[11px] font-bold text-on-surface-variant">
              <span>LKR 0</span><span>LKR {maxFee}</span>
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
            className="mt-2 rounded-full bg-primary py-3 text-xs font-headline font-bold tracking-wide text-on-primary transition-all active:scale-95"
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
                          <p className="font-medium text-on-surface-variant">
                            {doctor.specialization || "General Practitioner"}
                            {doctor.yearsExp ? ` • ${doctor.yearsExp} Years Exp.` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 rounded-lg bg-surface-container px-2 py-1">
                          <span className="material-symbols-outlined text-lg text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <span className="text-sm font-bold">{doctor.rating ? doctor.rating.toFixed(1) : "N/A"}</span>
                          <span className="text-[10px] text-on-surface-variant">
                            ({doctor.reviewCount || 0} reviews)
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 border-y border-outline-variant/10 py-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg text-primary">event_available</span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">Next Available</p>
                            <p className="text-sm font-bold text-primary">{nextAvailabilityLabel(doctor)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-lg text-primary">payments</span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">Consultation</p>
                            <p className="text-sm font-bold text-on-surface">LKR {Number(doctor.consultationFeeUsd || 0).toLocaleString()}</p>
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
