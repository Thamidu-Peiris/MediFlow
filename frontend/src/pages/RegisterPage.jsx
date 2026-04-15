import { Link, useNavigate } from "react-router-dom";

const REGISTER_ASIDE_IMAGE =
  "https://plus.unsplash.com/premium_photo-1672760403439-bf51a26c1ae6?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default function RegisterPage() {
  const navigate = useNavigate();

  return (
    <div className="m-0 flex min-h-screen w-full flex-col overflow-x-hidden bg-surface p-0 font-body text-on-surface">
      <main className="flex min-h-screen w-full flex-1 overflow-hidden">
        <aside className="relative hidden w-[55%] flex-col justify-between overflow-hidden p-8 lg:flex">
          <div className="absolute inset-0 z-0">
            <img className="h-full w-full object-cover" src={REGISTER_ASIDE_IMAGE} alt="" decoding="async" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary-container/40 to-transparent" />
          </div>

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed shadow-lg">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  medical_services
                </span>
              </div>
              <span className="font-headline text-xl font-extrabold tracking-tighter text-on-primary">MediFlow</span>
            </Link>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="max-w-lg">
              <h1 className="mb-3 font-headline text-[1.8rem] font-bold leading-tight tracking-tight text-on-primary">
                Start your care journey.
              </h1>
              <p className="text-sm font-medium leading-relaxed text-on-primary-container/90">
                Create your account to access personalized health tools, book appointments, and connect securely with trusted
                care professionals.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                <span className="material-symbols-outlined text-xs">verified_user</span>
                HIPAA Compliant
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                <span className="material-symbols-outlined text-xs">lock</span>
                256-bit Encryption
              </div>
            </div>
          </div>
        </aside>

        <section className="flex w-full items-center justify-center bg-[#eef9ec] p-3 md:pb-16 md:pt-6 lg:w-[45%] lg:p-10">
          <div className="w-full max-w-[420px]">
            <div className="-ml-2 -mt-2 mb-6">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/20 bg-white/70 px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-white hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back
              </button>
            </div>

            <div className="mb-8 flex items-center gap-2 lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-primary">medical_services</span>
                <span className="font-headline text-2xl font-bold tracking-tighter text-primary">MediFlow</span>
              </Link>
            </div>

            <div className="mb-7">
              <h2 className="mb-1.5 font-headline text-[2rem] font-bold tracking-tight text-on-surface">Create Account</h2>
              <p className="text-sm font-medium text-on-surface-variant">Choose how you want to join MediFlow</p>
            </div>

            <div className="space-y-4">
              <Link
                to="/register/patient"
                className="group flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0px_20px_40px_rgba(0,29,50,0.06)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/30 text-primary">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-on-surface">Patient</h3>
                  <p className="text-sm text-on-surface-variant">
                    Book appointments, manage prescriptions, and track health records.
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>

              <Link
                to="/register/doctor"
                className="group flex items-center gap-4 rounded-xl border border-outline-variant/20 bg-white/80 p-4 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0px_20px_40px_rgba(0,29,50,0.06)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-fixed-variant">
                  <span className="material-symbols-outlined text-2xl">stethoscope</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-on-surface">Doctor</h3>
                  <p className="text-sm text-on-surface-variant">
                    Manage consultations, availability, and patient care workflows.
                  </p>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </Link>
            </div>

            <p className="mt-6 text-center font-medium text-on-surface-variant">
              Already have an account?
              <Link to="/login" className="ml-1 font-bold text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
