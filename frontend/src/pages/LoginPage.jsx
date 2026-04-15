import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LOGIN_ASIDE_IMAGE =
  "https://plus.unsplash.com/premium_photo-1672760403439-bf51a26c1ae6?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", rememberMe: false });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const loggedInUser = await login(form.email, form.password, "patient");
      if (loggedInUser.role === "admin") return navigate("/admin/dashboard");
      if (loggedInUser.role === "doctor") return navigate("/doctor/dashboard", { replace: true });
      return navigate("/patient/dashboard");
    } catch (err) {
      setMessage(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="m-0 flex min-h-screen w-full flex-col overflow-x-hidden bg-surface p-0 font-body text-on-surface">
      <main className="flex min-h-screen w-full flex-1 overflow-hidden">
        {/* Left: clinical hero (desktop) */}
        <aside className="relative hidden w-[55%] flex-col justify-between overflow-hidden p-8 lg:flex">
          <div className="absolute inset-0 z-0">
            <img
              className="h-full w-full object-cover"
              src={LOGIN_ASIDE_IMAGE}
              alt=""
              decoding="async"
            />
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
                Your clinical sanctuary awaits.
              </h1>
              <p className="text-sm font-medium leading-relaxed text-on-primary-container/90">
                Access your personalized health dashboard, medical records, and secure clinical consultations with encrypted data
                protection.
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

        {/* Right: form */}
        <section className="flex w-full items-center justify-center bg-[#eef9ec] p-3 md:pb-16 md:pt-6 lg:w-[45%] lg:p-10">
          <div className="w-full max-w-[360px]">
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

            <div className="mb-6">
              <h2 className="mb-1.5 font-headline text-[2rem] font-bold tracking-tight text-on-surface">Welcome Back</h2>
            </div>

            {message ? (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-error/15 bg-error-container/40 p-3">
                <span className="material-symbols-outlined text-error">error</span>
                <p className="text-sm font-semibold text-on-error-container">{message}</p>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="ml-0.5 block text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant" htmlFor="login-email">
                  Email Address
                </label>
                <div className="group relative">
                  <input
                    id="login-email"
                    name="email"
                    className="w-full rounded-none border-0 border-b border-b-outline-variant/40 bg-white/70 py-3 pl-3 pr-3 text-base text-on-surface transition-all placeholder:text-outline-variant focus:border-b-primary focus:outline-none focus:ring-0"
                    placeholder="dr.smith@mediflow.com"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="ml-0.5 block text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant" htmlFor="login-password">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-[#0f766e] transition-colors hover:text-[#0b5e58]"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="group relative">
                  <input
                    id="login-password"
                    name="password"
                    className="w-full rounded-none border-0 border-b border-b-outline-variant/40 bg-white/70 py-3 pl-3 pr-11 text-base text-on-surface transition-all placeholder:text-outline-variant focus:border-b-primary focus:outline-none focus:ring-0"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-lg bg-transparent text-outline shadow-none transition-colors hover:bg-transparent hover:text-on-surface focus:bg-transparent focus:outline-none focus:ring-0 active:bg-transparent"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[22px] leading-none" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-start gap-3 py-1">
                <label className="group flex cursor-pointer items-center gap-2.5">
                  <div className="relative flex items-center">
                    <input
                      className="peer h-4 w-4 appearance-none rounded-sm border border-outline-variant/70 bg-white transition-all checked:border-primary checked:bg-primary focus:ring-0 focus:ring-offset-0"
                      type="checkbox"
                      checked={form.rememberMe}
                      onChange={(e) => setForm((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                    />
                    <span className="material-symbols-outlined pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-white opacity-0 transition-opacity peer-checked:opacity-100">
                      check
                    </span>
                  </div>
                  <span className="text-sm font-medium text-on-surface-variant transition-colors group-hover:text-on-surface">
                    Remember Me
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-none bg-[#8df443] py-3.5 font-headline text-[1.05rem] font-bold uppercase tracking-[0.2em] text-black shadow-lg shadow-[#8df443]/30 transition-all hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                    </svg>
                    Signing In...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Sign In
                    <span aria-hidden>→</span>
                  </span>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/30" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-[#eef9ec] px-4 text-[11px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">OR CONTINUE WITH</span>
              </div>
            </div>

            <button
              type="button"
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-none border border-[#006566]/30 bg-white/75 py-3 text-sm font-semibold text-[#006566] transition-all hover:border-[#006566]/50 hover:bg-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span className="text-sm text-[#006566]">Google</span>
            </button>

            <p className="text-center font-medium text-on-surface-variant">
              Don&apos;t have an account?
              <Link to="/register" className="ml-1 font-bold text-primary hover:underline">
                Register
              </Link>
            </p>
          </div>
        </section>
      </main>

    </div>
  );
}
