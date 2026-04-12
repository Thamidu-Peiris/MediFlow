import confetti from "canvas-confetti";

/** MediFlow greens + accent — matches checkout pay button tone. */
const COLORS = ["#49fc6f", "#22c55e", "#006b50", "#86efac", "#34d399", "#fbbf24"];

/**
 * Celebration after Stripe or Helakuru (PayHere) checkout completes.
 */
export function firePaymentSuccessConfetti() {
  const fire = (opts) =>
    confetti({
      disableForReducedMotion: true,
      zIndex: 10050,
      colors: COLORS,
      ...opts,
    });

  const n = window.innerWidth < 768 ? 70 : 100;
  fire({ particleCount: n, spread: 64, origin: { y: 0.26 }, scalar: 1 });
  window.setTimeout(() => {
    fire({ particleCount: Math.round(n * 0.5), spread: 100, startVelocity: 36, origin: { y: 0.32 } });
  }, 130);
  window.setTimeout(() => {
    fire({
      particleCount: Math.round(n * 0.38),
      spread: 120,
      decay: 0.91,
      scalar: 0.88,
      ticks: 115,
      origin: { x: 0.12, y: 0.74 },
    });
    fire({
      particleCount: Math.round(n * 0.38),
      spread: 120,
      decay: 0.91,
      scalar: 0.88,
      ticks: 115,
      origin: { x: 0.88, y: 0.74 },
    });
  }, 240);
}
