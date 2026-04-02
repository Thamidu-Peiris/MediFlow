import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "mediflow_booking_draft";

/** Dedupes StrictMode double-mount (and overlapping navigations) so we only create one pending booking. */
let createPendingBookingFlight = null;

function formatDisplayDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatLkr(cents) {
  return (Number(cents) / 100).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StripePayForm({ pendingId, authHeaders, onDone, onError, totalLabel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    onError("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/patient/payment?pending=${pendingId}`,
        },
        redirect: "if_required",
      });
      if (error) {
        // User paid once then clicked Pay again, or StrictMode / remount reused a succeeded PI
        const pi = error.payment_intent;
        if (
          error.code === "payment_intent_unexpected_state" &&
          pi &&
          pi.status === "succeeded"
        ) {
          await api.post(
            "/payments/complete-booking",
            { pendingId, paymentIntentId: pi.id },
            authHeaders
          );
          onDone();
          setBusy(false);
          return;
        }
        onError(error.message || "Payment failed");
        setBusy(false);
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        await api.post(
          "/payments/complete-booking",
          { pendingId, paymentIntentId: paymentIntent.id },
          authHeaders
        );
        onDone();
      } else {
        onError(`Unexpected status: ${paymentIntent?.status}`);
      }
    } catch (err) {
      onError(err.response?.data?.detail || err.response?.data?.message || err.message || "Payment error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl bg-surface p-4">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || busy}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-primary to-primary-container py-5 text-lg font-bold text-white shadow-xl shadow-primary/20 transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
      >
        <span className="material-symbols-outlined">lock</span>
        {busy ? "Processing…" : `Pay ${totalLabel} securely`}
      </button>
    </form>
  );
}

function StripeInnerWithElements({ pendingId, clientSecret, publishableKey, authHeaders, onDone, onError, totalLabel }) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  if (!stripePromise || !clientSecret) {
    return (
      <p className="text-sm text-on-surface-variant">
        Unable to load card form. Configure Stripe keys on the payment service or use Helakuru.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <StripePayForm
        pendingId={pendingId}
        authHeaders={authHeaders}
        onDone={onDone}
        onError={onError}
        totalLabel={totalLabel}
      />
    </Elements>
  );
}

export default function PatientPaymentPage() {
  const { user, authHeaders } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [pendingId, setPendingId] = useState(() => searchParams.get("pending") || "");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payTab, setPayTab] = useState("card");
  const [clientSecret, setClientSecret] = useState("");
  const [publishableKey, setPublishableKey] = useState(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");
  const [helakuruMsg, setHelakuruMsg] = useState("");
  const [simBusy, setSimBusy] = useState(false);

  const loadDetail = useCallback(
    async (pid) => {
      const res = await api.get(`/payments/pending-booking/${pid}`, authHeaders);
      setDetail(res.data);
      setPublishableKey(
        res.data.stripePublishableKey || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
      );
    },
    [authHeaders]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const qPending = searchParams.get("pending");
        const pi = searchParams.get("payment_intent");
        const piSecret = searchParams.get("payment_intent_client_secret");

        if (qPending && pi && piSecret) {
          setPendingId(qPending);
          const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
          if (pk) {
            const stripe = await loadStripe(pk);
            if (stripe && !cancelled) {
              const { paymentIntent } = await stripe.retrievePaymentIntent(piSecret);
              if (paymentIntent?.status === "succeeded") {
                await api.post(
                  "/payments/complete-booking",
                  { pendingId: qPending, paymentIntentId: paymentIntent.id },
                  authHeaders
                );
                navigate("/patient/appointments", { replace: true });
                return;
              }
            }
          }
        }

        if (qPending) {
          setPendingId(qPending);
          await loadDetail(qPending);
          if (!cancelled) setLoading(false);
          return;
        }

        const state = location.state || JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
        if (!state?.doctorUserId) {
          navigate("/patient/doctors", { replace: true });
          return;
        }

        const payload = {
          doctorUserId: state.doctorUserId,
          doctorName: state.doctorName,
          specialization: state.specialization,
          doctorImage: state.doctorImage,
          date: state.date,
          time: state.time,
          reason: state.reason,
          consultationFee: state.consultationFee,
        };
        if (!createPendingBookingFlight) {
          createPendingBookingFlight = api
            .post("/payments/pending-booking", payload, authHeaders)
            .finally(() => {
              createPendingBookingFlight = null;
            });
        }
        const create = await createPendingBookingFlight;
        const pid = create.data.pendingId;
        sessionStorage.removeItem(STORAGE_KEY);
        if (!cancelled) {
          setPendingId(pid);
          await loadDetail(pid);
          navigate(`/patient/payment?pending=${pid}`, { replace: true });
        }
      } catch (e) {
        if (!cancelled)
          setError(e.response?.data?.detail || e.response?.data?.message || e.message || "Failed to load checkout");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount; reads initial URL/state for checkout bootstrap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const helakuruFinalizeStarted = useRef(false);

  useEffect(() => {
    const helakuruReturn =
      searchParams.get("helakuru") === "1" || searchParams.get("helapay") === "1";
    if (!helakuruReturn || !pendingId || loading || !detail) return;
    const lockKey = `mediflow_helakuru_finalize_${pendingId}`;
    if (helakuruFinalizeStarted.current || sessionStorage.getItem(lockKey)) return;
    helakuruFinalizeStarted.current = true;
    sessionStorage.setItem(lockKey, "1");

    void (async () => {
      try {
        await api.post("/payments/complete-booking", { pendingId }, authHeaders);
        navigate("/patient/appointments", { replace: true });
      } catch (e) {
        sessionStorage.removeItem(lockKey);
        helakuruFinalizeStarted.current = false;
        setError(e.response?.data?.message || "Could not finalize booking after Helakuru");
      }
    })();
  }, [searchParams, pendingId, loading, detail, navigate, authHeaders]);

  useEffect(() => {
    if (payTab !== "card" || !pendingId || !detail) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.post("/payments/stripe/create-intent", { pendingId }, authHeaders);
        if (cancelled) return;
        if (res.data.publishableKey) setPublishableKey(res.data.publishableKey);
        if (res.data.alreadySucceeded && res.data.paymentIntentId) {
          await api.post(
            "/payments/complete-booking",
            { pendingId, paymentIntentId: res.data.paymentIntentId },
            authHeaders
          );
          navigate("/patient/appointments", { replace: true });
          return;
        }
        setClientSecret(res.data.clientSecret || "");
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.detail || e.response?.data?.message || "Could not start card payment");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payTab, pendingId, detail, authHeaders, navigate]);

  const submitHelakuru = async () => {
    setHelakuruMsg("");
    try {
      const res = await api.post(
        "/payments/helakuru/checkout",
        {
          pendingId,
          email: user?.email || "",
          phone: user?.phone || "",
          firstName: user?.name?.split(" ")[0] || "Patient",
          lastName: user?.name?.split(" ").slice(1).join(" ") || "",
        },
        authHeaders
      );
      if (res.data.actionUrl && res.data.fields) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.data.actionUrl;
        Object.entries(res.data.fields).forEach(([k, v]) => {
          const i = document.createElement("input");
          i.type = "hidden";
          i.name = k;
          i.value = String(v);
          form.appendChild(i);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }
      setHelakuruMsg(
        res.data.message ||
          "Helakuru (HelaPay wallet) is not configured. Add PayHere merchant keys and enable HelaPay in the PayHere dashboard."
      );
    } catch (e) {
      setHelakuruMsg(e.response?.data?.message || e.message);
    }
  };

  const simulateHelakuru = async () => {
    setSimBusy(true);
    setError("");
    try {
      await api.post("/payments/simulate-helakuru", { pendingId }, authHeaders);
      await api.post("/payments/complete-booking", { pendingId }, authHeaders);
      navigate("/patient/appointments", { replace: true });
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSimBusy(false);
    }
  };

  const totalCents = detail ? detail.totalCents : 0;
  const totalLabel = `LKR ${formatLkr(totalCents)}`;

  if (loading && !detail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-on-surface">
        <div className="text-on-surface-variant">Loading checkout…</div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="min-h-screen bg-surface px-4 py-24 text-on-surface">
        <p className="text-error">{error}</p>
        <Link to="/patient/doctors" className="mt-4 inline-block text-primary underline">
          Back to doctors
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <nav className="fixed top-0 z-50 w-full border-b border-teal-500/10 bg-white/80 shadow-[0px_20px_40px_rgba(0,29,50,0.06)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/patient/dashboard" className="font-headline text-xl font-bold tracking-tight text-teal-800">
            MediFlow
          </Link>
          <div className="hidden items-center space-x-8 md:flex">
            <Link
              to="/patient/appointments"
              className="font-headline text-slate-500 transition-colors hover:text-teal-600"
            >
              Appointments
            </Link>
            <span className="border-b-2 border-teal-600 font-headline font-semibold text-teal-700">Payments</span>
            <Link to="/patient/reports" className="font-headline text-slate-500 transition-colors hover:text-teal-600">
              Records
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-on-surface-variant">{user?.name}</span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-32 pt-24 md:px-6">
        {error && (
          <div className="mb-6 rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-5">
            <section>
              <h1 className="mb-8 font-headline text-3xl font-extrabold tracking-tight text-on-surface">
                Consultation Summary
              </h1>
              <div className="relative overflow-hidden rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(0,29,50,0.06)]">
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/5" />
                <div className="relative mb-8 flex items-start gap-6">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl shadow-lg">
                    <img
                      src={
                        detail?.doctorImage ||
                        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80"
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-on-surface">{detail?.doctorName || "Doctor"}</h2>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                      {detail?.specialization || "Specialist"}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      <span>{formatDisplayDate(detail?.date)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      <span>{detail?.time}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4 border-t border-outline-variant/10 pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Consultation Fee</span>
                    <span className="font-medium text-on-surface">LKR {formatLkr(detail?.consultationFeeCents || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Service Fee</span>
                    <span className="font-medium text-on-surface">LKR {formatLkr(detail?.serviceFeeCents || 0)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t-2 border-dashed border-outline-variant/20 pt-4">
                    <span className="text-lg font-bold text-on-surface">Total</span>
                    <span className="text-2xl font-extrabold text-primary">LKR {formatLkr(totalCents)}</span>
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-6 opacity-60 grayscale transition-all duration-500 hover:grayscale-0">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <span className="text-xs font-bold uppercase tracking-widest">HIPAA Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lock
                </span>
                <span className="text-xs font-bold uppercase tracking-widest">SSL Secured</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield
                </span>
                <span className="text-xs font-bold uppercase tracking-widest">PCI DSS</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-surface-container-lowest p-8 shadow-[0px_20px_40px_rgba(0,29,50,0.06)] lg:p-12">
              <h2 className="mb-8 font-headline text-2xl font-bold text-on-surface">Payment Method</h2>

              <div className="mb-10 flex rounded-2xl bg-surface-container-low p-1">
                <button
                  type="button"
                  onClick={() => setPayTab("card")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm transition-all ${
                    payTab === "card"
                      ? "bg-white font-bold text-primary shadow-sm"
                      : "font-medium text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">credit_card</span>
                  Credit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab("helakuru")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm transition-all ${
                    payTab === "helakuru"
                      ? "bg-white font-bold text-primary shadow-sm"
                      : "font-medium text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                  Helakuru
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab("paypal")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm transition-all ${
                    payTab === "paypal"
                      ? "bg-white font-bold text-primary shadow-sm"
                      : "font-medium text-on-surface-variant hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">account_balance_wallet</span>
                  PayPal
                </button>
              </div>

              {payTab === "card" && (
                <div>
                  <StripeInnerWithElements
                    pendingId={pendingId}
                    clientSecret={clientSecret}
                    publishableKey={publishableKey}
                    authHeaders={authHeaders}
                    totalLabel={totalLabel}
                    onDone={() => navigate("/patient/appointments", { replace: true })}
                    onError={setError}
                  />
                  <p className="mt-6 px-8 text-center text-xs text-on-surface-variant">
                    By paying you agree to our{" "}
                    <a href="#" className="text-primary underline">
                      Terms of Service
                    </a>
                    . Stripe test: <code className="text-on-surface">4242 4242 4242 4242</code>
                  </p>
                </div>
              )}

              {payTab === "helakuru" && (
                <div className="space-y-6">
                  <p className="text-sm text-on-surface-variant">
                    Pay with <strong className="text-on-surface">Helakuru</strong> using the{" "}
                    <strong>HelaPay</strong> wallet on PayHere’s secure page (same flow used by many Sri Lankan apps).
                    In your <strong>PayHere merchant portal</strong>, enable <strong>HelaPay</strong> so customers see
                    the Helakuru wallet option alongside cards.
                  </p>
                  {helakuruMsg && <p className="text-sm text-amber-800">{helakuruMsg}</p>}
                  <button
                    type="button"
                    onClick={submitHelakuru}
                    className="w-full rounded-full bg-primary py-4 font-bold text-on-primary shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                  >
                    Continue with Helakuru (PayHere)
                  </button>
                  <div className="rounded-2xl border border-dashed border-outline-variant/30 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Local testing (no PayHere keys)
                    </p>
                    <button
                      type="button"
                      disabled={simBusy}
                      onClick={simulateHelakuru}
                      className="rounded-xl bg-surface-container-high px-4 py-2 text-sm font-semibold text-primary hover:bg-primary hover:text-on-primary"
                    >
                      {simBusy ? "Working…" : "Simulate Helakuru success (dev)"}
                    </button>
                  </div>
                </div>
              )}

              {payTab === "paypal" && <p className="text-on-surface-variant">PayPal checkout is coming soon.</p>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
