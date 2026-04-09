import { Link } from "react-router-dom";
import LandingTopBar from "../components/LandingTopBar";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface text-on-surface">
      <LandingTopBar />

      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundColor: "#f7f9ff",
          backgroundImage:
            "radial-gradient(at 0% 0%, hsla(180, 100%, 93%, 1) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(181, 67%, 95%, 1) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(181, 74%, 90%, 1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(180, 100%, 93%, 1) 0px, transparent 50%)"
        }}
      />

      <div className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden opacity-[0.03]">
        <span className="material-symbols-outlined select-none text-[360px] md:text-[600px]">add_notes</span>
      </div>

      <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1100px] items-center gap-8 px-6 pb-6 pt-24 lg:grid-cols-2">
        <section className="hidden space-y-6 lg:flex lg:flex-col">
          <Link to="/" className="flex w-fit items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              health_and_safety
            </span>
            <span className="font-headline text-2xl font-bold tracking-tighter text-on-surface">MediFlow</span>
          </Link>
          <h1 className="font-headline text-5xl font-extrabold leading-[1.1] tracking-tight text-on-surface">
            Join your digital <br />
            <span className="text-primary">care journey</span> today.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-on-surface-variant">
            Create your account to book appointments, access records, and connect with trusted specialists through one secure
            platform.
          </p>
        </section>

        <section className="mx-auto w-full max-w-[520px]">
          <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-5 shadow-[0px_20px_40px_rgba(0,29,50,0.06)] md:p-7">
            <div className="mb-8 flex flex-col items-center lg:hidden">
              <Link to="/" className="mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  health_and_safety
                </span>
                <span className="font-headline text-2xl font-bold tracking-tighter text-on-surface">MediFlow</span>
              </Link>
            </div>

            <div className="mb-5 text-center lg:text-left">
              <h2 className="mb-2 font-headline text-3xl font-extrabold text-on-surface">Create Account</h2>
              <p className="font-medium text-on-surface-variant">Choose how you want to join MediFlow</p>
            </div>

            <div className="space-y-4">
              <Link
                to="/register/patient"
                className="group flex items-center gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 transition-all hover:-translate-y-0.5 hover:bg-surface-container-highest hover:shadow-[0px_20px_40px_rgba(0,29,50,0.06)]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-fixed/30 text-primary">
                  <span className="material-symbols-outlined text-3xl">person</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold">Patient</h3>
                  <p className="text-sm text-on-surface-variant">
                    Book appointments, manage prescriptions, and track your health records.
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>

              <Link
                to="/register/doctor"
                className="group flex items-center gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 transition-all hover:-translate-y-0.5 hover:bg-surface-container-highest hover:shadow-[0px_20px_40px_rgba(0,29,50,0.06)]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-fixed-variant">
                  <span className="material-symbols-outlined text-3xl">stethoscope</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold">Doctor</h3>
                  <p className="text-sm text-on-surface-variant">
                    Manage consultations, set availability, and handle patient care workflows.
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>

            <div className="pt-4 text-center">
              <p className="font-medium text-on-surface-variant">
                Already have an account?
                <Link to="/login" className="ml-1 font-bold text-primary underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
