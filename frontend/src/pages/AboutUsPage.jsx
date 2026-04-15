import LandingTopBar from "../components/LandingTopBar";
import { Link } from "react-router-dom";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <LandingTopBar active="about" />
      
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-[#f0fdfa] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0d9488] border border-[#ccfbf1]">
              Our Story
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#1e293b] sm:text-5xl">
              About MediFlow
            </h1>
            <p className="mt-4 text-lg text-[#64748b]">
              Redefining healthcare through clinical precision and human touch.
            </p>
          </div>

          <div className="space-y-12">
            <section className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#1e293b] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#0d9488]">verified</span>
                Our Mission
              </h2>
              <p className="mt-4 leading-relaxed text-[#475569]">
                MediFlow was born out of a simple yet powerful goal: to make world-class healthcare accessible to everyone, anywhere. We believe that technology should be a bridge, not a barrier, between patients and the medical care they deserve. Our platform is designed to respect your time while providing the highest quality of clinical excellence.
              </p>
            </section>

            <section className="grid gap-8 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm transition-transform hover:-translate-y-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0fdfa] text-[#0d9488]">
                  <span className="material-symbols-outlined">groups</span>
                </div>
                <h3 className="text-xl font-bold text-[#1e293b]">Expert Network</h3>
                <p className="mt-2 text-[#64748b]">
                  We partner with board-certified specialists across all major medical fields to ensure you get the best advice.
                </p>
              </div>
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm transition-transform hover:-translate-y-1">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f0fdfa] text-[#0d9488]">
                  <span className="material-symbols-outlined">security</span>
                </div>
                <h3 className="text-xl font-bold text-[#1e293b]">Patient Privacy</h3>
                <p className="mt-2 text-[#64748b]">
                  Your health data is protected by industry-leading encryption and strict compliance with medical standards.
                </p>
              </div>
            </section>

            <section className="rounded-2xl bg-gradient-to-br from-[#0d9488] to-[#0f766e] p-8 text-white shadow-lg text-center">
              <h2 className="text-3xl font-extrabold">Ready to start your journey?</h2>
              <p className="mt-4 text-[#ccfbf1]">
                Join thousands of patients who trust MediFlow for their healthcare needs.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link to="/register" className="rounded-full bg-white px-8 py-3 font-bold text-[#0d9488] transition-all hover:bg-[#f0fdfa]">
                  Get Started
                </Link>
                <Link to="/doctors" className="rounded-full border-2 border-white/30 px-8 py-3 font-bold text-white transition-all hover:bg-white/10">
                  Browse Doctors
                </Link>
              </div>
            </section>
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
