import React, { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import LandingTopBar from "../components/LandingTopBar";
import api from "../api/client";

const CountUp = ({ end, duration = 2000, suffix = "", decimals = 0 }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const currentCount = progress * end;
      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={countRef}>
      {count.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};

const specialties = [
  { icon: "cardiology", title: "Cardiology", subtitle: "Heart & Vascular Care" },
  { icon: "dermatology", title: "Dermatology", subtitle: "Skin & Hair Health" },
  { icon: "child_care", title: "Pediatrics", subtitle: "Children's Wellness" },
  { icon: "neurology", title: "Neurology", subtitle: "Brain & Nerve Experts" },
  { icon: "dentistry", title: "Dentistry", subtitle: "Oral Hygiene & Surgery" },
  { icon: "psychology", title: "Psychology", subtitle: "Mental Wellbeing" },
  { icon: "orthopedics", title: "Orthopedics", subtitle: "Bone & Joint Care" },
  { icon: "oncology", title: "Oncology", subtitle: "Cancer Treatment" }
];

export default function HomePage() {
  const [featuredDoctors, setFeaturedDoctors] = useState([]);
  const [loadingFeaturedDoctors, setLoadingFeaturedDoctors] = useState(true);

  useEffect(() => {
    let isMounted = true;

    api.get("/doctors/public")
      .then((res) => {
        if (!isMounted) return;
        const doctors = Array.isArray(res?.data?.doctors) ? res.data.doctors : [];
        const topDoctors = doctors.slice(0, 4).map((doctor, idx) => {
          const seed = String(doctor?._id || doctor?.userId || idx);
          const imagePick = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 4;
          return {
            _id: doctor?._id || doctor?.userId || `doctor-${idx}`,
            name: doctor?.fullName || "Doctor",
            specialization: doctor?.specialization || "General Practitioner",
            rating: Number(doctor?.rating || 0),
            image: doctor?.image || `https://images.unsplash.com/photo-${[
              "1559839734-2b71ea197ec2",
              "1612277795421-9bc7706a4a41",
              "1594824476967-48c8b964273f",
              "1622253692010-333f2da6031d"
            ][imagePick]}?auto=format&fit=crop&w=500&q=80`
          };
        });
        setFeaturedDoctors(topDoctors);
      })
      .catch((err) => {
        console.error("Failed to fetch featured doctors", err);
        if (isMounted) setFeaturedDoctors([]);
      })
      .finally(() => {
        if (isMounted) setLoadingFeaturedDoctors(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="scroll-smooth font-sans text-[#1e293b]">
      <LandingTopBar active="home" onHomePage />

      {/* Hero Section with requested gradient background */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#CBF79D] to-[#DAFFB3] pb-20 pt-36">
        <div className="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-12 px-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[#356600] border border-[#356600]/10 shadow-sm">
              <span className="material-symbols-outlined text-sm">verified</span>
              <span className="text-xs font-bold uppercase tracking-widest">Medical Excellence Redefined</span>
            </div>
            <h1 className="mb-6 font-headline text-5xl font-extrabold leading-tight tracking-tight lg:text-7xl text-[#043927]">
              Your <span className="bg-gradient-to-br from-[#356600] to-[#437A00] bg-clip-text text-transparent">Health</span>,<br />On Your Schedule
            </h1>
            <p className="mb-10 max-w-2xl text-xl font-medium leading-relaxed text-[#043927]/80">
              Experience healthcare that respects your time. Connect with world-class medical specialists through our seamless editorial platform designed for clarity and care.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link to="/doctors" className="rounded-full bg-[#043927] px-10 py-5 text-center text-lg font-bold text-white shadow-xl shadow-[#043927]/20 transition-all hover:bg-[#065036] active:scale-95">
                Book a Doctor
              </Link>
              <Link to="/register" className="rounded-full border-2 border-[#043927]/10 bg-white px-10 py-5 text-center font-bold text-[#043927] transition-all hover:bg-white/80 shadow-sm">
                Sign Up Free
              </Link>
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="overflow-hidden rounded-[2.5rem] border-8 border-white/60 bg-white/20 shadow-[0px_32px_64px_rgba(53,102,0,0.12)] backdrop-blur-md">
              <img
                src="/assets/hero-img.png"
                alt="Medical Professional"
                className="h-[500px] w-full object-cover"
              />
            </div>

            <div className="absolute -bottom-6 -left-6 flex max-w-[240px] items-start gap-3 rounded-2xl border border-white/60 bg-white/80 px-5 py-4 shadow-[0px_20px_40px_rgba(53,102,0,0.08)] backdrop-blur-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#CBF79D] text-[#356600]">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  favorite
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-[#043927]">Care Quality</p>
                <p className="text-[12px] leading-tight text-[#043927]/60">Top-rated health advisory services available 24/7.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-y border-[#e2e8f0] py-20">
        <div className="mx-auto max-w-screen-2xl px-8">
          <div className="flex flex-wrap items-center justify-between divide-y divide-[#e2e8f0] md:flex-nowrap md:divide-x md:divide-y-0">
            <div className="flex w-full flex-col items-center justify-center py-8 md:w-1/4 md:py-0">
              <p className="font-headline text-5xl font-light tracking-tight text-[#396E00] lg:text-6xl">
                <CountUp end={500} suffix="+" />
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#396E00]/60">Verified Specialists</p>
            </div>
            <div className="flex w-full flex-col items-center justify-center py-8 md:w-1/4 md:py-0">
              <p className="font-headline text-5xl font-light tracking-tight text-[#396E00] lg:text-6xl">
                <CountUp end={10000} suffix="+" />
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#396E00]/60">Happy Patients</p>
            </div>
            <div className="flex w-full flex-col items-center justify-center py-8 md:w-1/4 md:py-0">
              <p className="font-headline text-5xl font-light tracking-tight text-[#396E00] lg:text-6xl">
                <CountUp end={4.9} decimals={1} suffix="/5" />
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#396E00]/60">Patient Rating</p>
            </div>
            <div className="flex w-full flex-col items-center justify-center py-8 md:w-1/4 md:py-0">
              <p className="font-headline text-5xl font-light tracking-tight text-[#396E00] lg:text-6xl">
                <CountUp end={24} suffix="/7" />
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#396E00]/60">Care Support</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-[#F0F0F0] py-28">
        <div className="mx-auto max-w-screen-2xl px-8">
          <div className="mb-20 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#356600]">The Process</span>
            <h2 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-[#043927] sm:text-5xl">Simple Care Steps</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#043927]/60">Accessing professional medical advice has never been easier. Three steps to better health.</p>
          </div>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              ["1", "search", "Search Doctor", "Find specialists by name, symptom, or clinic across our vast network."],
              ["2", "calendar_month", "Book Slot", "Select a time that works for you. Instant confirmation every time."],
              ["3", "video_call", "Video Consult", "Secure, HD video appointments from the comfort of your home."]
            ].map(([step, icon, title, text]) => (
              <div key={title} className="group relative rounded-[2.5rem] border border-[#356600]/10 bg-white p-10 shadow-sm transition-all duration-500 hover:shadow-[0px_32px_64px_rgba(4,57,39,0.08)] hover:-translate-y-2">
                <div className="absolute right-8 top-8 text-6xl font-black text-[#9CED45] transition-colors group-hover:text-[#9CED45]/70">
                  {step}
                </div>
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D7FAB1] text-[#043927] transition-all duration-500 group-hover:scale-110 group-hover:bg-[#043927] group-hover:text-white">
                  <span className="material-symbols-outlined text-3xl">{icon}</span>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-[#043927]">{title}</h3>
                <p className="text-lg leading-relaxed text-[#043927]/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="specialties" className="bg-[#DCFFB8] border-y border-[#356600]/10 px-8 py-28">
        <div className="mx-auto max-w-screen-2xl">
          <div className="mb-20 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-[#356600]">Departments</span>
            <h2 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-[#043927] sm:text-5xl">Browse Specialties</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[#043927]/60">Expertise across all major medical fields. Connect with the right specialist for your specific needs.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-8">
            {specialties.map((s) => (
              <div key={s.title} className="group cursor-pointer rounded-3xl border border-[#356600]/5 bg-white p-8 transition-all duration-500 hover:border-[#356600]/20 hover:shadow-[0px_24px_48px_rgba(53,102,0,0.06)] hover:-translate-y-1">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BDFC79] text-[#356600] transition-all duration-500 group-hover:bg-[#356600] group-hover:text-white">
                  <span className="material-symbols-outlined text-3xl">{s.icon}</span>
                </div>
                <h4 className="mb-2 text-xl font-bold text-[#043927]">{s.title}</h4>
                <p className="text-sm font-medium text-[#043927]/50">{s.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="doctors" className="mx-auto max-w-screen-2xl overflow-hidden px-8 py-28">
        <div className="mb-20">
          <span className="text-xs font-bold uppercase tracking-widest text-[#356600]">Our Experts</span>
          <h2 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-[#043927] sm:text-5xl">Meet Our Featured Doctors</h2>
          <p className="mt-4 text-lg text-[#043927]/60">Qualified practitioners with decades of combined experience.</p>
        </div>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4">
          {(loadingFeaturedDoctors ? [] : featuredDoctors).map((doctor) => (
            <div key={doctor._id} className="group rounded-[2.5rem] border border-[#356600]/10 bg-white p-6 shadow-sm transition-all duration-500 hover:shadow-[0px_32px_64px_rgba(4,57,39,0.08)] hover:-translate-y-2">
              <div className="mb-6 aspect-square overflow-hidden rounded-3xl bg-[#fcfdfa]">
                <img src={doctor.image} alt={doctor.name} className="h-full w-full object-cover grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" />
              </div>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold text-[#043927]">{doctor.name}</h4>
                  <p className="font-bold text-[#356600]">{doctor.specialization}</p>
                </div>
                <div className="flex items-center gap-1 text-[#f59e0b]">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-bold text-[#043927]">{doctor.rating > 0 ? doctor.rating.toFixed(1) : "N/A"}</span>
                </div>
              </div>
              <button className="mt-4 w-full rounded-2xl bg-[#CBF79D] py-4 font-bold text-[#043927] transition-all duration-300 hover:bg-[#043927] hover:text-white" type="button">View Profile</button>
            </div>
          ))}
          {!loadingFeaturedDoctors && featuredDoctors.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-[#356600]/10 bg-white p-8 text-center text-[#043927]/70">
              No featured doctors available right now.
            </div>
          ) : null}
        </div>
      </section>

      <section id="testimonials" className="bg-[#043927] px-8 py-32 text-white">
        <div className="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-24 lg:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#BDFC79]">Patient Stories</span>
            <h2 className="mt-4 font-headline text-4xl font-extrabold leading-tight tracking-tight lg:text-6xl text-[#CBF79D]">Stories of Trust and Recovery</h2>
            <div className="mt-16 space-y-16">
              <div className="flex flex-col gap-8 md:flex-row md:items-start">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-[#BDFC79]/30">
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80" alt="Patient" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="mb-4 flex text-[#BDFC79]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                  <p className="mb-6 text-2xl italic font-medium leading-relaxed text-[#DAFFB3]/80">"The level of care and attention I received was unprecedented. Booking was instant, and the video consultation felt as personal as an in-person visit."</p>
                  <h4 className="text-xl font-bold text-white">Jessica Miller</h4>
                  <p className="font-bold text-[#BDFC79]">Heart Patient</p>
                </div>
              </div>
            </div>
          </div>
          <div className="group relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-[#BDFC79]/10 transition-transform group-hover:scale-105" />
            <div className="relative overflow-hidden rounded-[2rem] border-8 border-white/10 shadow-2xl">
              <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80" alt="Doctor patient interaction" className="w-full grayscale-[0.2] transition-all group-hover:grayscale-0 group-hover:scale-105" />
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-screen-md px-8 py-32">
        <div className="text-center mb-20">
          <span className="text-xs font-bold uppercase tracking-widest text-[#356600]">Common Questions</span>
          <h2 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-[#043927] sm:text-5xl">Support FAQ</h2>
        </div>
        <div className="space-y-6">
          {[
            ["How do video consultations work?", "Once you book an appointment, you'll receive a secure link via email and SMS. At the scheduled time, click the link to enter the encrypted consultation room."],
            ["Are my medical records private?", "MediFlow uses strong encryption for data storage and transmission. Your records are only accessible by you and your designated medical team."],
            ["Can I get prescriptions online?", "Yes. Following consultation, doctors can issue digital prescriptions available for download and follow-up."]
          ].map(([q, a]) => (
            <details key={q} className="group overflow-hidden rounded-2xl border border-[#356600]/10 bg-white [&_summary::-webkit-details-marker]:hidden transition-all hover:border-[#356600]/30">
              <summary className="flex cursor-pointer items-center justify-between p-8 transition-colors hover:bg-[#fcfdfa]">
                <h3 className="text-xl font-bold text-[#043927]">{q}</h3>
                <span className="material-symbols-outlined text-[#356600] transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <div className="px-8 pb-8 text-lg leading-relaxed text-[#043927]/60">{a}</div>
            </details>
          ))}
        </div>
      </section>

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
