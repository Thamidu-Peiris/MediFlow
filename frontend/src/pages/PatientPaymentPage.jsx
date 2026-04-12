import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

const STORAGE_KEY = "mediflow_booking_draft";

/** Pass to navigate() so appointments page can run payment-success confetti once. */
const NAV_TO_APPOINTMENTS_PAID = { replace: true, state: { paymentJustSucceeded: true } };

/** complete-booking can wait on PayHere webhook polling + appointment create — avoid 30s axios default. */
const BOOKING_REQUEST_MS = 120000;

function bookingRequestConfig(authHeaders) {
  return { ...authHeaders, timeout: BOOKING_REQUEST_MS };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Brand marks in `frontend/public/` (avoids hotlink / thumb URL breakage for Helakuru). */
const STRIPE_LOGO_SRC = `${import.meta.env.BASE_URL}stripe-logo.svg`;
const HELAKURU_LOGO_SRC = `${import.meta.env.BASE_URL}helakuru-logo.png`;
const MEDIFLOW_MARK_SRC = `${import.meta.env.BASE_URL}favicon.svg`;

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
            bookingRequestConfig(authHeaders)
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
          bookingRequestConfig(authHeaders)
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-outline-variant/15 bg-surface-container-high/50 p-2.5 md:p-3">
        <PaymentElement />
      </div>
      <button
        type="submit"
        disabled={!stripe || busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[#49fc6d] py-3 text-sm font-bold text-black shadow-md transition-all duration-200 hover:brightness-[0.93] active:scale-[0.98] disabled:opacity-50 md:text-base"
      >
        <span
          className="material-symbols-outlined text-black"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          lock
        </span>
        {busy ? "Processing…" : `Pay ${totalLabel} securely`}
      </button>
    </form>
  );
}

const STRIPE_ELEMENTS_APPEARANCE = {
  theme: "stripe",
  labels: "floating",
  inputs: "condensed",
  variables: {
    colorPrimary: "#006b50",
    colorBackground: "#ffffff",
    colorText: "#171d1b",
    colorTextSecondary: "#3e4944",
    colorDanger: "#ba1a1a",
    borderRadius: "12px",
    fontFamily: "Inter, system-ui, sans-serif"
  }
};

function StripeInnerWithElements({ pendingId, clientSecret, publishableKey, authHeaders, onDone, onError, totalLabel }) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const elementsOptions = useMemo(
    () => ({
      clientSecret,
      appearance: STRIPE_ELEMENTS_APPEARANCE
    }),
    [clientSecret]
  );

  if (!stripePromise || !clientSecret) {
    return (
      <p className="text-sm text-on-surface-variant">
        Unable to load card form. Configure Stripe keys on the payment service or use Helakuru.
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
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

function PaymentCheckoutFooter() {
  return (
    <footer className="mt-auto w-full shrink-0 border-t border-outline-variant/10 bg-surface py-5 text-center">
      <p className="text-xs font-medium text-on-surface-variant md:text-sm">
        Secure checkout · MediFlow © {new Date().getFullYear()}
      </p>
    </footer>
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

  /** Same as “Simulate Helakuru success (dev)” — marks PayHere paid locally and completes the booking. */
  const runHelakuruDevSuccess = useCallback(async () => {
    setSimBusy(true);
    setError("");
    setHelakuruMsg("");
    try {
      await api.post("/payments/simulate-helakuru", { pendingId }, authHeaders);
      await api.post("/payments/complete-booking", { pendingId }, bookingRequestConfig(authHeaders));
      navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSimBusy(false);
    }
  }, [pendingId, authHeaders, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const qPending = searchParams.get("pending");
        const pi = searchParams.get("payment_intent");
        const piSecret = searchParams.get("payment_intent_client_secret");

        if (qPending && pi) {
          setPendingId(qPending);
          try {
            await api.post(
              "/payments/complete-booking",
              { pendingId: qPending, paymentIntentId: pi },
              bookingRequestConfig(authHeaders)
            );
            if (!cancelled) navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
            return;
          } catch {
            /* PI still processing or mismatch — try client retrieve below if we have a secret */
          }
        }

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
                  bookingRequestConfig(authHeaders)
                );
                navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
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

        let state = location.state;
        if (!state?.doctorUserId) {
          try {
            state = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
          } catch {
            state = null;
          }
        }
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
          appointmentType: state.appointmentType || "physical",
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
        if (!cancelled) {
          const status = e.response?.status;
          const body = e.response?.data;
          const msg =
            body?.message ||
            body?.detail ||
            (typeof body === "string" ? body : null) ||
            e.message ||
            "Failed to load checkout";
          setError(status ? `${msg} (${status})` : msg);
        }
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
    const helakuruSuccess =
      searchParams.get("helakuru") === "1" || searchParams.get("helapay") === "1";
    const payHereCancelled = searchParams.get("cancelled") === "1";

    /** Dev: any return from PayHere (success URL, cancel URL, or failed payment back to merchant) → simulate + book. */
    const payHereDevReturn =
      import.meta.env.DEV && (helakuruSuccess || payHereCancelled);
    const payHereProdSuccess = !import.meta.env.DEV && helakuruSuccess;

    if (!pendingId || loading || !detail) return;
    if (!payHereDevReturn && !payHereProdSuccess) return;

    const lockKey = `mediflow_payhere_return_${pendingId}`;
    if (helakuruFinalizeStarted.current || sessionStorage.getItem(lockKey)) return;
    helakuruFinalizeStarted.current = true;
    sessionStorage.setItem(lockKey, "1");

    void (async () => {
      const completeHelakuruBooking = () =>
        api.post("/payments/complete-booking", { pendingId }, bookingRequestConfig(authHeaders));

      const isPaymentPendingWebhook = (e) => {
        const code = e.response?.data?.code;
        const msg = String(e.response?.data?.message || "");
        return (
          code === "PAYMENT_PENDING_WEBHOOK" ||
          (e.response?.status === 400 && msg.includes("Payment not verified"))
        );
      };

      /** Vite dev: same as “Simulate Helakuru success” — PayHere notify is not relied on. */
      const runDevSimulateHelakuruAndBook = async () => {
        setHelakuruMsg(
          payHereCancelled
            ? 'DEV: returned from PayHere (cancel or failed checkout) — still running “Simulate Helakuru success” to book locally.'
            : 'DEV: returned from PayHere (success URL) — running “Simulate Helakuru success” to book locally.'
        );
        await api.post("/payments/simulate-helakuru", { pendingId }, authHeaders);
        await completeHelakuruBooking();
        navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
      };

      const fail = (e, fallbackMsg) => {
        sessionStorage.removeItem(lockKey);
        helakuruFinalizeStarted.current = false;
        setHelakuruMsg("");
        setError(e?.response?.data?.message || e?.message || fallbackMsg);
      };

      try {
        if (import.meta.env.DEV) {
          try {
            const st = await api.get(`/payments/pending-booking/${pendingId}`, authHeaders);
            if (st.data.appointmentCreated) {
              navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
              return;
            }
            if (st.data.status === "paid") {
              await completeHelakuruBooking();
              navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
              return;
            }
          } catch {
            /* fall through to simulate */
          }
          try {
            await runDevSimulateHelakuruAndBook();
          } catch (e) {
            fail(e, "Could not complete Helakuru booking in dev.");
          }
          return;
        }

        await completeHelakuruBooking();
        navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
      } catch (e) {
        if (isPaymentPendingWebhook(e)) {
          setHelakuruMsg(
            "Confirming payment with PayHere… Your browser often returns before the server is notified. Waiting a bit longer for PayHere to notify the server."
          );
          const outerDeadline = Date.now() + 60000;
          while (Date.now() < outerDeadline) {
            await sleep(1600);
            try {
              const st = await api.get(`/payments/pending-booking/${pendingId}`, authHeaders);
              if (st.data.appointmentCreated) {
                navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
                return;
              }
              if (st.data.status === "paid") {
                await completeHelakuruBooking();
                navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
                return;
              }
            } catch {
              /* keep polling */
            }
          }
          fail(
            { response: { data: { message: "" } } },
            "PayHere has not confirmed this booking yet. Set API_PUBLIC_URL to a public HTTPS URL so PayHere can POST to /api/payments/webhooks/payhere, or test Helakuru from Vite on localhost (auto-complete after return)."
          );
          return;
        }

        fail(e, "Could not finalize booking after Helakuru");
      }
    })();
  }, [searchParams, pendingId, loading, detail, navigate, authHeaders]);

  /** Production: PayHere cancel_url — tell user; do not simulate. */
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (searchParams.get("cancelled") !== "1" || !pendingId || loading || !detail) return;
    setHelakuruMsg("PayHere checkout was cancelled or not completed. You can try Helakuru again or pay by card.");
    navigate({ pathname: location.pathname, search: `?pending=${encodeURIComponent(pendingId)}` }, { replace: true });
    setPayTab("helakuru");
  }, [searchParams, pendingId, loading, detail, navigate, location.pathname]);

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
            bookingRequestConfig(authHeaders)
          );
          navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID);
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
      const st = e.response?.status;
      const d = e.response?.data;
      if (import.meta.env.DEV && st === 503 && d?.simulated) {
        setHelakuruMsg("PayHere not configured — completing with Simulate Helakuru success…");
        await runHelakuruDevSuccess();
        return;
      }
      setHelakuruMsg(d?.message || e.message);
    }
  };

  const simulateHelakuru = () => {
    void runHelakuruDevSuccess();
  };

  const totalCents = detail ? detail.totalCents : 0;
  const totalLabel = `LKR ${formatLkr(totalCents)}`;

  if (loading && !detail) {
    return (
      <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface">
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="text-on-surface-variant">Loading checkout…</div>
        </main>
        <PaymentCheckoutFooter />
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="flex min-h-screen flex-col bg-surface px-4 py-8 font-body text-on-surface">
        <main className="flex flex-1 flex-col">
          <p className="text-error">{error}</p>
          <Link to="/patient/doctors" className="mt-4 inline-block text-primary underline">
            Back to doctors
          </Link>
        </main>
        <PaymentCheckoutFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface font-body text-on-surface">
      <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-6 md:px-5 md:py-8">
        <Link
          to="/patient/dashboard"
          className="mb-4 inline-flex items-center gap-2 rounded-lg py-0.5 pr-1 text-primary transition-opacity hover:opacity-80"
        >
          <img
            src={MEDIFLOW_MARK_SRC}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
            decoding="async"
          />
          <span className="font-headline text-lg font-black tracking-tight md:text-xl">MediFlow</span>
        </Link>

        {error && (
          <div className="mb-4 rounded-xl bg-error-container px-3 py-2.5 text-sm text-on-error-container">{error}</div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          <section className="space-y-3 lg:col-span-5">
            <div className="space-y-4 rounded-lg bg-surface-container-low p-3.5 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <h1 className="font-headline text-lg font-bold tracking-tight text-primary md:text-xl">
                  Consultation Summary
                </h1>
                <span className="shrink-0 rounded-full bg-primary-fixed px-2.5 py-0.5 font-label text-[10px] font-bold uppercase tracking-wide text-on-primary-fixed-variant md:text-xs">
                  Confirmed
                </span>
              </div>

              {detail?.appointmentType === "online" ? (
                <div className="flex items-center gap-2.5 rounded-lg bg-surface-container-lowest p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      videocam
                    </span>
                  </div>
                  <div>
                    <p className="font-headline text-sm font-bold text-on-surface">Online Consultation</p>
                    <p className="text-xs text-on-surface-variant">High-definition video session after confirmation</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg bg-surface-container-lowest p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-primary">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      local_hospital
                    </span>
                  </div>
                  <div>
                    <p className="font-headline text-sm font-bold text-on-surface">In-Person Visit</p>
                    <p className="text-xs text-on-surface-variant">Please arrive 10 minutes before your scheduled time</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <img
                  src={
                    detail?.doctorImage ||
                    "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80"
                  }
                  alt={detail?.doctorName || "Doctor"}
                  className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-lg object-cover shadow-md grayscale-[15%]"
                />
                <div className="min-w-0 space-y-0.5">
                  <h2 className="font-headline text-base font-extrabold leading-tight text-on-surface md:text-lg">
                    {detail?.doctorName || "Doctor"}
                  </h2>
                  <p className="text-xs font-medium text-primary md:text-sm">{detail?.specialization || "Specialist"}</p>
                  <div className="space-y-0.5 pt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant md:text-sm">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      <span>{formatDisplayDate(detail?.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant md:text-sm">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{detail?.time}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-outline-variant/20 pt-3">
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs md:text-sm">Consultation Fee</span>
                  <span className="font-body text-sm font-medium text-on-surface">
                    LKR {formatLkr(detail?.consultationFeeCents || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-on-surface-variant">
                  <span className="text-xs md:text-sm">Platform Fee</span>
                  <span className="font-body text-sm font-medium text-on-surface">
                    LKR {formatLkr(detail?.serviceFeeCents || 0)}
                  </span>
                </div>
                <div className="flex items-end justify-between border-t border-outline-variant/20 pt-3">
                  <span className="font-headline text-base font-bold text-on-surface">Total Payable</span>
                  <span className="font-headline text-xl font-black tracking-tighter text-primary md:text-2xl">
                    LKR {formatLkr(totalCents)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 py-0.5">
              {[
                {
                  icon: "verified_user",
                  label: "HIPAA compliant",
                  className:
                    "border-teal-300/80 bg-teal-50 text-teal-900 [&_.material-symbols-outlined]:text-teal-700"
                },
                {
                  icon: "lock",
                  label: "SSL secured",
                  className:
                    "border-sky-300/80 bg-sky-50 text-sky-950 [&_.material-symbols-outlined]:text-sky-700"
                },
                {
                  icon: "payments",
                  label: "PCI DSS",
                  className:
                    "border-violet-300/80 bg-violet-50 text-violet-950 [&_.material-symbols-outlined]:text-violet-700"
                }
              ].map(({ icon, label, className }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-label text-[9px] font-bold uppercase tracking-wide md:text-[10px] ${className}`}
                >
                  <span className="material-symbols-outlined text-sm">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-7">
            <div className="space-y-5 rounded-lg bg-surface-container-lowest p-3.5 shadow-[0_32px_48px_-18px_rgba(23,29,27,0.05)] md:p-4 md:space-y-6">
              <div className="space-y-0.5">
                <h2 className="font-headline text-base font-bold tracking-tight text-on-surface md:text-lg">Payment Method</h2>
                <p className="text-xs text-on-surface-variant md:text-sm">
                  Choose your preferred secure payment gateway
                </p>
              </div>

              <div className="inline-flex w-fit items-center gap-0.5 rounded-full border border-outline-variant/30 bg-surface-container p-0.5">
                <button
                  type="button"
                  onClick={() => setPayTab("card")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all md:gap-2 md:px-4 md:text-sm ${
                    payTab === "card"
                      ? "bg-white font-bold text-on-surface shadow-sm ring-1 ring-outline-variant/20"
                      : "bg-transparent font-medium text-on-surface-variant hover:bg-white/35 hover:text-on-surface"
                  }`}
                >
                  <img
                    src={STRIPE_LOGO_SRC}
                    alt=""
                    width={56}
                    height={14}
                    loading="lazy"
                    decoding="async"
                    className="h-3.5 w-auto shrink-0 opacity-95 md:h-4"
                  />
                  <span>Credit Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayTab("helakuru")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all md:gap-2 md:px-4 md:text-sm ${
                    payTab === "helakuru"
                      ? "bg-white font-bold text-on-surface shadow-sm ring-1 ring-outline-variant/20"
                      : "bg-transparent font-medium text-on-surface-variant hover:bg-white/35 hover:text-on-surface"
                  }`}
                >
                  <img
                    src={HELAKURU_LOGO_SRC}
                    alt=""
                    width={22}
                    height={22}
                    loading="lazy"
                    decoding="async"
                    className="h-5 w-5 shrink-0 rounded-md object-contain md:h-5 md:w-5"
                  />
                  <span>Helakuru</span>
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
                    onDone={() => navigate("/patient/appointments", NAV_TO_APPOINTMENTS_PAID)}
                    onError={setError}
                  />
                  <p className="mx-auto mt-4 max-w-md text-center text-[11px] leading-relaxed text-on-surface-variant md:text-xs">
                    By completing this transaction, you agree to the MediFlow{" "}
                    <a href="#" className="underline transition-colors hover:text-primary">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="underline transition-colors hover:text-primary">
                      Privacy Policy
                    </a>
                    .
                  </p>
                </div>
              )}

              {payTab === "helakuru" && (
                <div className="space-y-4">
                  <p className="text-xs text-on-surface-variant md:text-sm">
                    Pay with <strong className="text-on-surface">Helakuru</strong> using the{" "}
                    <strong>HelaPay</strong> wallet on PayHere’s secure page (same flow used by many Sri Lankan apps).
                    In your <strong>PayHere merchant portal</strong>, enable <strong>HelaPay</strong> so customers see
                    the Helakuru wallet option alongside cards.
                  </p>
                  {import.meta.env.DEV && (
                    <p className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-950 dark:text-amber-100">
                      Development: after PayHere redirects back (success <strong>or</strong> cancel), MediFlow runs{" "}
                      <strong>Simulate Helakuru success</strong> so the booking completes without notify_url.
                    </p>
                  )}
                  {helakuruMsg && <p className="text-sm text-amber-800">{helakuruMsg}</p>}
                  <button
                    type="button"
                    disabled={simBusy}
                    onClick={submitHelakuru}
                    className="w-full rounded-full bg-gradient-to-br from-primary to-primary-container py-3 font-headline text-sm font-bold text-on-primary shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 md:py-3.5 md:text-base"
                  >
                    {simBusy ? "Working…" : "Continue with Helakuru (PayHere)"}
                  </button>
                  <div className="rounded-xl border border-dashed border-outline-variant/30 p-3">
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
                  <p className="mx-auto max-w-md text-center text-xs leading-relaxed text-on-surface-variant">
                    By continuing you agree to the MediFlow{" "}
                    <a href="#" className="underline hover:text-primary">
                      Terms of Service
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <PaymentCheckoutFooter />
    </div>
  );
}
