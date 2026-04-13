import { Link } from "react-router-dom";
import LandingTopBar from "../components/LandingTopBar";

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
  return (
    <div className="scroll-smooth bg-surface font-body text-on-surface">
      <LandingTopBar active="home" onHomePage />

      <section className="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-12 overflow-hidden px-8 pb-20 pt-32 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary-fixed/20 px-4 py-2 text-on-primary-fixed-variant">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span className="text-xs font-bold uppercase tracking-widest">Medical Excellence Redefined</span>
          </div>
          <h1 className="mb-6 font-headline text-5xl font-extrabold leading-tight tracking-tight lg:text-7xl">
            Your <span className="bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent">Health</span>,<br />On Your Schedule
          </h1>
          <p className="mb-10 max-w-2xl text-xl leading-relaxed text-on-surface-variant">
            Experience healthcare that respects your time. Connect with world-class medical specialists through our seamless editorial platform designed for clarity and care.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link to="/doctors" className="rounded-full bg-gradient-to-br from-primary to-primary-container px-10 py-5 text-center text-lg font-bold text-on-primary shadow-xl transition-all hover:opacity-90 active:scale-95">
              Book a Doctor
            </Link>
            <Link to="/register" className="rounded-full border border-outline-variant/20 px-10 py-5 text-center font-bold text-on-surface transition-all hover:bg-surface-container-low">
              Sign Up Free
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-5">
          <div className="overflow-hidden rounded-[1.75rem] border-8 border-white bg-surface-container-low shadow-[0px_20px_40px_rgba(0,29,50,0.10)]">
            <img
              src="https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=900&q=80"
              alt="Medical team"
              className="h-[460px] w-full object-cover"
            />
          </div>

          <div className="absolute -bottom-6 -left-6 flex max-w-[220px] items-start gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 shadow-[0px_20px_40px_rgba(0,29,50,0.08)]">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed/30 text-primary">
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                favorite
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Care Quality</p>
              <p className="text-[11px] leading-tight text-on-surface-variant">Top-rated health advisory services available 24/7.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low px-8 py-16">
        <div className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center justify-center gap-12 px-4 md:justify-between md:px-16 lg:px-24">
          <div className="text-center md:text-left"><p className="text-3xl font-extrabold tracking-tight">500+</p><p className="text-sm font-medium text-on-surface-variant">Verified Specialists</p></div>
          <div className="text-center md:text-left"><p className="text-3xl font-extrabold tracking-tight">10,000+</p><p className="text-sm font-medium text-on-surface-variant">Happy Patients</p></div>
          <div className="text-center md:text-left"><p className="text-3xl font-extrabold tracking-tight">4.9/5</p><p className="text-sm font-medium text-on-surface-variant">Patient Rating</p></div>
          <div className="text-center md:text-left"><p className="text-3xl font-extrabold tracking-tight">24/7</p><p className="text-sm font-medium text-on-surface-variant">Care Support</p></div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-screen-2xl px-8 py-24">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-headline text-4xl font-extrabold tracking-tight">Simple Care Steps</h2>
          <p className="mx-auto max-w-xl text-on-surface-variant">Accessing professional medical advice has never been easier. Three steps to better health.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            ["search", "Search Doctor", "Find specialists by name, symptom, or clinic across our vast network."],
            ["calendar_month", "Book Slot", "Select a time that works for you. Instant confirmation every time."],
            ["video_call", "Video Consult", "Secure, HD video appointments from the comfort of your home."]
          ].map(([icon, title, text]) => (
            <div key={title} className="group rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-sm transition-all duration-500 hover:shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-fixed/20 text-primary transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined text-3xl">{icon}</span>
              </div>
              <h3 className="mb-3 text-xl font-bold">{title}</h3>
              <p className="leading-relaxed text-on-surface-variant">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="specialties" className="bg-surface-container-low px-8 py-24">
        <div className="mx-auto max-w-screen-2xl">
          <div className="mb-16 flex flex-col items-end justify-between md:flex-row">
            <div className="max-w-2xl">
              <h2 className="mb-4 font-headline text-4xl font-extrabold tracking-tight">Browse Specialties</h2>
              <p className="text-on-surface-variant">Expertise across all major medical fields. Connect with the right specialist for your specific needs.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {specialties.map((s) => (
              <div key={s.title} className="group cursor-pointer rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-8 transition-all hover:shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
                <span className="material-symbols-outlined mb-6 block text-4xl text-primary transition-transform group-hover:scale-110">{s.icon}</span>
                <h4 className="mb-1 text-lg font-bold">{s.title}</h4>
                <p className="text-xs text-on-surface-variant">{s.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="doctors" className="mx-auto max-w-screen-2xl overflow-hidden px-8 py-24">
        <div className="mb-16">
          <h2 className="mb-4 font-headline text-4xl font-extrabold tracking-tight">Meet Our Featured Doctors</h2>
          <p className="text-on-surface-variant">Qualified practitioners with decades of combined experience.</p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Dr. Emily Rivera", "Pediatrician", "5.0"],
            ["Dr. Marcus Thorne", "Orthopedic Surgeon", "4.8"],
            ["Dr. Aisha Khan", "Dermatologist", "4.9"],
            ["Dr. Simon Peter", "Neurologist", "4.7"]
          ].map(([name, spec, rating]) => (
            <div key={name} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm transition-all hover:shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
              <div className="mb-6 aspect-square overflow-hidden rounded-xl bg-surface-container">
                <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=500&q=80" alt={name} className="h-full w-full object-cover" />
              </div>
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h4 className="text-xl font-bold">{name}</h4>
                  <p className="text-sm font-semibold text-primary">{spec}</p>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-bold">{rating}</span>
                </div>
              </div>
              <button className="mt-6 w-full rounded-xl bg-primary-fixed/30 py-3 font-bold text-primary transition-all hover:bg-primary hover:text-on-primary" type="button">View Profile</button>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonials" className="bg-surface-container px-8 py-24">
        <div className="mx-auto grid max-w-screen-2xl grid-cols-1 items-center gap-20 lg:grid-cols-2">
          <div>
            <h2 className="mb-8 font-headline text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">Patient Stories of Trust and Recovery</h2>
            <div className="space-y-12">
              <div className="flex items-start gap-6">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-outline-variant/20 bg-surface-container-lowest">
                  <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80" alt="Patient" className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="mb-2 flex text-primary">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                  <p className="mb-4 text-xl italic font-medium leading-relaxed">"The level of care and attention I received was unprecedented. Booking was instant, and the video consultation felt as personal as an in-person visit."</p>
                  <h4 className="font-bold">Jessica Miller</h4>
                  <p className="text-xs text-on-surface-variant">Heart Patient</p>
                </div>
              </div>
            </div>
          </div>
          <div className="group relative">
            <div className="absolute -inset-4 -rotate-2 rounded-xl bg-primary-fixed/20 transition-transform group-hover:rotate-0" />
            <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1000&q=80" alt="Doctor patient interaction" className="relative rounded-xl shadow-2xl" />
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-screen-md px-8 py-24">
        <h2 className="mb-12 text-center font-headline text-4xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            ["How do video consultations work?", "Once you book an appointment, you'll receive a secure link via email and SMS. At the scheduled time, click the link to enter the encrypted consultation room."],
            ["Are my medical records private?", "MediFlow uses strong encryption for data storage and transmission. Your records are only accessible by you and your designated medical team."],
            ["Can I get prescriptions online?", "Yes. Following consultation, doctors can issue digital prescriptions available for download and follow-up."]
          ].map(([q, a]) => (
            <details key={q} className="group overflow-hidden rounded-xl border border-outline-variant/20 bg-surface [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between p-6 transition-colors hover:bg-surface-container-low">
                <h3 className="text-lg font-bold">{q}</h3>
                <span className="material-symbols-outlined transition-transform group-open:rotate-180">expand_more</span>
              </summary>
              <div className="px-6 pb-6 leading-relaxed text-on-surface-variant">{a}</div>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-outline-variant/10 bg-surface-container-lowest">
        <div className="mx-auto grid max-w-screen-2xl grid-cols-1 gap-12 px-12 py-16 md:grid-cols-4">
          <div>
            <h2 className="mb-6 font-headline text-2xl font-extrabold tracking-tight text-primary">MediFlow</h2>
            <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">Redefining modern healthcare with clinical precision and a human touch. Accessible, efficient, and compassionate.</p>
          </div>
          <div><h4 className="mb-6 font-bold">Company</h4><ul className="space-y-4 text-sm text-on-surface-variant"><li><Link to="/about">About Us</Link></li><li><Link to="/doctors">Doctors</Link></li><li><Link to="/login">Login</Link></li><li><Link to="/register">Register</Link></li></ul></div>
          <div><h4 className="mb-6 font-bold">Support</h4><ul className="space-y-4 text-sm text-on-surface-variant"><li><Link to="/contact">Contact Us</Link></li><li><Link to="/privacy">Privacy Policy</Link></li><li><a href="#faq">FAQ</a></li></ul></div>
          <div>
            <h4 className="mb-6 font-bold">Newsletter</h4>
            <p className="mb-4 text-xs text-on-surface-variant">Stay updated with the latest clinical insights.</p>
            <div className="flex gap-2">
              <input type="email" placeholder="Email address" className="w-full rounded-xl border-none bg-surface-container-low px-4 py-2 text-sm focus:ring-2 focus:ring-primary" />
              <button className="rounded-xl bg-primary p-2 text-on-primary hover:opacity-90" type="button"><span className="material-symbols-outlined">send</span></button>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-4 border-t border-outline-variant/10 px-12 py-8 md:flex-row">
          <p className="text-xs text-on-surface-variant">© {new Date().getFullYear()} MediFlow. All rights reserved.</p>
          <div className="flex gap-6 text-xs text-on-surface-variant">
            <a href="#">Clinical Standards</a>
            <a href="#">HIPAA Compliance</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
