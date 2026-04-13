import LandingTopBar from "../components/LandingTopBar";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <LandingTopBar />
      
      <main className="pt-24 pb-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12 text-center">
            <span className="inline-block rounded-full bg-[#f0fdfa] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0d9488] border border-[#ccfbf1]">
              Legal
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-[#1e293b] sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-lg text-[#64748b]">
              Last updated: April 13, 2026
            </p>
          </div>

          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-8 shadow-sm space-y-8">
            <section>
              <h2 className="text-xl font-bold text-[#1e293b] mb-4">1. Information We Collect</h2>
              <p className="text-[#475569] leading-relaxed">
                At MediFlow, we collect information to provide better services to all our users. This includes personal information such as your name, email address, and phone number, as well as sensitive medical data provided during consultations or in medical reports.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1e293b] mb-4">2. How We Use Information</h2>
              <p className="text-[#475569] leading-relaxed">
                We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect MediFlow and our users. For example, we use your medical data only to facilitate consultations with your designated healthcare providers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1e293b] mb-4">3. Data Security</h2>
              <p className="text-[#475569] leading-relaxed">
                We work hard to protect MediFlow and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. We use industry-standard encryption (AES-256) for all sensitive health data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1e293b] mb-4">4. Compliance</h2>
              <p className="text-[#475569] leading-relaxed">
                Our platform is designed to be fully compliant with global medical data standards, including HIPAA and GDPR, ensuring that your rights as a patient are always respected and protected.
              </p>
            </section>

            <div className="pt-8 border-t border-[#f1f5f9]">
              <p className="text-sm text-[#94a3b8]">
                If you have any questions about this Privacy Policy, please contact our legal team at privacy@mediflow.com.
              </p>
            </div>
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
