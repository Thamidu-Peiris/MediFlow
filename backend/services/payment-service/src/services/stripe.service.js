const Stripe = require("stripe");

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

async function createPaymentIntent({ amountCents, currency, metadata }) {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "STRIPE_SECRET_KEY is not configured" };
  }
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: currency.toLowerCase(),
    automatic_payment_methods: { enabled: true },
    metadata: metadata || {},
  });
  return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
}

async function retrievePaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  if (!stripe) return null;
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe not configured" };
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return { error: "STRIPE_WEBHOOK_SECRET is not configured" };
  try {
    const event = stripe.webhooks.constructEvent(rawBody, signature, whSecret);
    return { event };
  } catch (err) {
    return { error: err.message };
  }
}

async function createRefund(paymentIntentId) {
  const stripe = getStripe();
  if (!stripe) return { error: "Stripe not configured" };
  try {
    const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
    return { refund };
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { getStripe, createPaymentIntent, retrievePaymentIntent, constructWebhookEvent, createRefund };
