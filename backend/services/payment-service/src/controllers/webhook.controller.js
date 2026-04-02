const PendingBooking = require("../models/PendingBooking.model");
const stripeService = require("../services/stripe.service");
const payhereService = require("../services/payhere.service");

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const result = stripeService.constructWebhookEvent(req.body, sig);
  if (result.error) {
    return res.status(400).send(`Webhook Error: ${result.error}`);
  }

  const event = result.event;
  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      const pendingId = pi.metadata?.pendingId;
      if (pendingId) {
        await PendingBooking.findByIdAndUpdate(pendingId, {
          status: "paid",
          stripePaymentIntentId: pi.id,
        });
      }
    }
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      const pendingId = pi.metadata?.pendingId;
      if (pendingId) {
        await PendingBooking.findByIdAndUpdate(pendingId, { status: "failed" });
      }
    }
  } catch (e) {
    console.error("Stripe webhook handler error", e);
    return res.status(500).json({ received: false });
  }

  res.json({ received: true });
};

exports.payhereWebhook = async (req, res) => {
  try {
    const body = req.body;
    if (!payhereService.verifyNotifySignature(body)) {
      return res.status(400).send("Invalid signature");
    }

    const status = body.status_code;
    const orderId = body.order_id;
    if (!orderId) return res.status(400).send("Missing order_id");

    const doc = await PendingBooking.findOne({ orderId });
    if (!doc) {
      return res.status(404).send("Order not found");
    }

    // PayHere: 2 = success
    if (String(status) === "2") {
      doc.status = "paid";
      doc.payherePaymentId = body.payment_id || body.payhere_payment_id || "payhere";
      await doc.save();
    } else {
      doc.status = "failed";
      await doc.save();
    }

    res.status(200).send("OK");
  } catch (e) {
    console.error("PayHere webhook error", e);
    res.status(500).send("Error");
  }
};
