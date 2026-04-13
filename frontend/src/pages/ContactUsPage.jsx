import LandingTopBar from "../components/LandingTopBar";

export default function ContactUsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <LandingTopBar />
      
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-[#f0fdfa] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0d9488] border border-[#ccfbf1]">
              Support
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#1e293b] sm:text-5xl">
              Get in Touch
            </h1>
            <p className="mt-4 text-lg text-[#64748b]">
              Have questions? Our medical support team is here to help you 24/7.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0fdfa] text-[#0d9488]">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <h3 className="text-lg font-bold text-[#1e293b]">Email Us</h3>
                <p className="mt-1 text-[#64748b]">support@mediflow.com</p>
                <p className="text-[#64748b]">billing@mediflow.com</p>
              </div>

              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0fdfa] text-[#0d9488]">
                  <span className="material-symbols-outlined">call</span>
                </div>
                <h3 className="text-lg font-bold text-[#1e293b]">Call Support</h3>
                <p className="mt-1 text-[#64748b] font-semibold">+1 (800) MEDI-FLOW</p>
                <p className="text-[#64748b]">Mon-Fri, 9am-6pm EST</p>
              </div>

              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0fdfa] text-[#0d9488]">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <h3 className="text-lg font-bold text-[#1e293b]">Our Office</h3>
                <p className="mt-1 text-[#64748b]">123 Medical Plaza, Suite 500</p>
                <p className="text-[#64748b]">Silicon Valley, CA 94025</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm">
                <form className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#374151] uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-[#1e293b] outline-none focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-[#374151] uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="john@example.com"
                        className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-[#1e293b] outline-none focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#374151] uppercase tracking-wider">Subject</label>
                    <select className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-[#1e293b] outline-none focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 transition-all appearance-none bg-white">
                      <option>General Inquiry</option>
                      <option>Technical Support</option>
                      <option>Billing Question</option>
                      <option>Doctor Partnership</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#374151] uppercase tracking-wider">Message</label>
                    <textarea 
                      rows="5"
                      placeholder="How can we help you?"
                      className="w-full rounded-xl border border-[#e2e8f0] px-4 py-3 text-[#1e293b] outline-none focus:border-[#0d9488] focus:ring-4 focus:ring-[#0d9488]/10 transition-all"
                    ></textarea>
                  </div>

                  <button 
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-br from-[#0d9488] to-[#0f766e] py-4 font-bold text-white shadow-lg shadow-[#0d9488]/20 transition-all hover:opacity-90 active:scale-[0.98]"
                  >
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#e2e8f0] bg-white py-12">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-[#94a3b8]">
          &copy; {new Date().getFullYear()} MediFlow Enterprise. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
