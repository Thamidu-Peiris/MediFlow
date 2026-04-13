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

      <footer className="border-t border-[#e2e8f0] bg-white py-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm text-[#94a3b8]">
            &copy; {new Date().getFullYear()} MediFlow Enterprise. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
