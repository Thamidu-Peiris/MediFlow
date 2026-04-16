const PendingBooking  = require("../models/PendingBooking.model");
const stripeService   = require("../services/stripe.service");
const payhereService  = require("../services/payhere.service");
const { fulfillBooking } = require("../services/booking.service");

// ─────────────────────────────────────────────────────────────────────────────
//  Stripe webhook
// ─────────────────────────────────────────────────────────────────────────────
exports.stripeWebhook = async (req, res) => {
  const sig    = req.headers["stripe-signature"];
  const result = stripeService.constructWebhookEvent(req.body, sig);

  if (result.error) {
    console.error("[Stripe webhook] signature error:", result.error);
    return res.status(400).send(`Webhook Error: ${result.error}`);
  }

  const event = result.event;

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi        = event.data.object;
      const pendingId = pi.metadata?.pendingId;

      if (pendingId) {
        // Mark as paid first (upsert-style with $set so it's idempotent)
        const doc = await PendingBooking.findByIdAndUpdate(
          pendingId,
          { $set: { status: "paid", stripePaymentIntentId: pi.id } },
          { new: true }
        );

        if (doc) {
          console.log(`[Stripe webhook] payment_intent.succeeded → pendingId=${pendingId}`);
          // Auto-complete: create appointment immediately so the browser doesn't
          // have to race the webhook.  Don't let a fulfillment error break the
          // webhook acknowledgement (Stripe would retry the whole event).
          fulfillBooking(doc)
            .then((r) => {
              if (r.created)       console.log(`[Stripe webhook] appointment created for order ${doc.orderId}`);
              if (r.alreadyCreated) console.log(`[Stripe webhook] appointment already existed for order ${doc.orderId}`);
            })
            .catch((e) => console.error(`[Stripe webhook] fulfillBooking failed for ${pendingId}:`, e.message));
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const pi        = event.data.object;
      const pendingId = pi.metadata?.pendingId;
      if (pendingId) {
        await PendingBooking.findByIdAndUpdate(pendingId, { $set: { status: "failed" } });
        console.log(`[Stripe webhook] payment_intent.payment_failed → pendingId=${pendingId}`);
      }
    }
  } catch (e) {
    console.error("[Stripe webhook] handler error:", e);
    return res.status(500).json({ received: false });
  }

  // Always respond 200 quickly so Stripe doesn't retry
  res.json({ received: true });
};

// ─────────────────────────────────────────────────────────────────────────────
//  PayHere webhook  (notify_url — form-urlencoded POST from PayHere servers)
// ─────────────────────────────────────────────────────────────────────────────
exports.payhereWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (!payhereService.verifyNotifySignature(body)) {
      console.warn("[PayHere webhook] invalid MD5 signature — check PAYHERE_MERCHANT_SECRET");
      return res.status(400).send("Invalid signature");
    }

    const status  = body.status_code;
    const orderId = body.order_id;

    if (!orderId) return res.status(400).send("Missing order_id");

    const doc = await PendingBooking.findOne({ orderId });
    if (!doc) {
      console.warn(`[PayHere webhook] order not found: ${orderId}`);
      return res.status(404).send("Order not found");
    }

    // PayHere status_code 2 = success, -1 = cancelled, -2 = failed, -3 = chargedback
    if (String(status) === "2") {
      doc.status          = "paid";
      doc.payherePaymentId = body.payment_id || body.payhere_payment_id || "payhere";
      await doc.save();

      console.log(`[PayHere webhook] success → orderId=${orderId}`);

      // Auto-complete: create appointment so the browser doesn't have to wait.
      // Fire-and-forget — PayHere expects a fast 200 response.
      fulfillBooking(doc)
        .then((r) => {
          if (r.created)        console.log(`[PayHere webhook] appointment created for order ${orderId}`);
          if (r.alreadyCreated) console.log(`[PayHere webhook] appointment already existed for order ${orderId}`);
        })
        .catch((e) => console.error(`[PayHere webhook] fulfillBooking failed for ${orderId}:`, e.message));
    } else {
      doc.status = "failed";
      await doc.save();
      console.log(`[PayHere webhook] non-success status_code=${status} for order ${orderId}`);
    }

    // Always 200 — PayHere retries on anything else
    res.status(200).send("OK");
  } catch (e) {
    console.error("[PayHere webhook] error:", e);
    res.status(500).send("Error");
  }
};
