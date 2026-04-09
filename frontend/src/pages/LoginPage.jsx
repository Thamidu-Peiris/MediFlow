import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LandingTopBar from "../components/LandingTopBar";

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

      <main className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1100px] items-center gap-12 px-6 pb-10 pt-28 lg:grid-cols-2">
        <section className="hidden space-y-12 lg:flex lg:flex-col">
          <div className="space-y-6">
            <Link to="/" className="flex w-fit items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                health_and_safety
              </span>
              <span className="font-headline text-2xl font-bold tracking-tighter text-on-surface">MediFlow</span>
            </Link>
            <h1 className="font-headline text-5xl font-extrabold leading-[1.1] tracking-tight text-on-surface">
              Your clinical <br />
              <span className="text-primary">sanctuary</span> awaits.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-on-surface-variant">
              Access your personalized health dashboard, medical records, and secure clinical consultations with encrypted data
              protection.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant/10 bg-surface-container-low p-6 shadow-[0px_20px_40px_rgba(0,29,50,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-headline text-sm font-bold uppercase tracking-widest text-on-surface-variant">Recent Activity</h3>
              <span className="material-symbols-outlined text-sm text-primary">security</span>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-lg bg-surface-container-lowest p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container">
                  <span className="material-symbols-outlined text-xl text-on-surface-variant">laptop_mac</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Windows Desktop</p>
                  <p className="text-xs text-on-surface-variant">Sri Lanka • 2 hours ago</p>
                </div>
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <div className="flex items-center gap-4 rounded-lg bg-surface-container-lowest/50 p-3 opacity-60">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container">
                  <span className="material-symbols-outlined text-xl text-on-surface-variant">smartphone</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Mobile Device</p>
                  <p className="text-xs text-on-surface-variant">Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[480px]">
          <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(0,29,50,0.06)] md:p-12">
            <div className="mb-10 flex flex-col items-center lg:hidden">
              <Link to="/" className="mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  health_and_safety
                </span>
                <span className="font-headline text-2xl font-bold tracking-tighter text-on-surface">MediFlow</span>
              </Link>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h2 className="mb-2 font-headline text-3xl font-extrabold text-on-surface">Welcome Back</h2>
              <p className="font-medium text-on-surface-variant">Continue to your clinical dashboard</p>
            </div>

            {message && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-error/15 bg-error-container/40 p-3">
                <span className="material-symbols-outlined text-error">error</span>
                <p className="text-sm font-semibold text-on-error-container">{message}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-6">
              <div className="group relative">
                <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-on-surface-variant transition-colors group-focus-within:text-primary">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <input
                  className="w-full rounded-xl border-none bg-surface-container-low py-4 pl-12 pr-4 font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20"
                  placeholder="Email Address"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="group relative">
                <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-on-surface-variant transition-colors group-focus-within:text-primary">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <input
                  className="w-full rounded-xl border-none bg-surface-container-low py-4 pl-12 pr-12 font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20"
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                />
                <button
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                >
                  <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="group flex cursor-pointer items-center gap-2">
                  <input
                    className="h-5 w-5 rounded border-outline-variant bg-surface-container-low text-primary focus:ring-primary/20"
                    type="checkbox"
                    checked={form.rememberMe}
                    onChange={(e) => setForm((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                  />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface">Remember Me</span>
                </label>
                <Link to="/forgot-password" className="text-sm font-bold text-primary underline-offset-4 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button
                className="flex w-full items-center justify-center gap-3 rounded-full bg-primary py-4 text-lg font-bold text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                    </svg>
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-outline-variant/30" />
                <span className="mx-4 flex-shrink text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">or</span>
                <div className="flex-grow border-t border-outline-variant/30" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm font-bold transition-colors hover:bg-surface-container-high"
                  type="button"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path d="M12 5.04c1.94 0 3.51.68 4.79 1.84l3.52-3.52C18.1 1.45 15.34 0 12 0 7.31 0 3.26 2.69 1.27 6.6l3.98 3.1c.94-2.82 3.57-4.66 6.75-4.66z" fill="#EA4335" />
                    <path d="M23.49 12.27c0-.86-.07-1.68-.21-2.48H12v4.69h6.44c-.28 1.47-1.12 2.72-2.38 3.56l3.82 2.96c2.23-2.06 3.52-5.09 3.52-8.73z" fill="#4285F4" />
                    <path d="M5.25 14.7c-.24-.71-.38-1.47-.38-2.27s.14-1.56.38-2.27L1.27 7.06C.46 8.68 0 10.28 0 12s.46 3.32 1.27 4.94l3.98-3.24z" fill="#FBBC05" />
                    <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.82-2.96c-1.09.73-2.49 1.16-4.11 1.16-3.18 0-5.81-2.15-6.77-5.05l-4.04 3.12C3.26 21.31 7.31 24 12 24z" fill="#34A853" />
                  </svg>
                  Google
                </button>
                <button
                  className="group flex items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container px-4 py-3 text-sm font-bold transition-colors hover:bg-surface-container-high"
                  type="button"
                >
                  <span className="material-symbols-outlined text-primary transition-transform group-hover:scale-110">fingerprint</span>
                  Biometric
                </button>
              </div>

              <div className="pt-2 text-center">
                <p className="font-medium text-on-surface-variant">
                  Don&apos;t have an account?
                  <Link to="/register" className="ml-1 font-bold text-primary underline-offset-4 hover:underline">
                    Register
                  </Link>
                </p>
              </div>
            </form>
          </div>

        </section>
      </main>
    </div>
  );
}
