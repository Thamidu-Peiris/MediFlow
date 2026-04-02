const crypto = require("crypto");

/**
 * PayHere hosted checkout (Sri Lanka). **Helakuru** users pay with the **HelaPay** wallet on the PayHere page
 * when your PayHere merchant account has HelaPay enabled (Bhasha / Helakuru ecosystem).
 * We pass `custom_1` so your notify handler can identify Helakuru-intent checkouts.
 * Docs: https://developers.payhere.co/
 */
function md5Upper(s) {
  return crypto.createHash("md5").update(s).digest("hex").toUpperCase();
}

function buildCheckoutHash({ merchantId, orderId, amountFormatted, currency }) {
  const secret = process.env.PAYHERE_MERCHANT_SECRET || "";
  if (!secret) return null;
  const hashedSecret = md5Upper(secret);
  return md5Upper(`${merchantId}${orderId}${amountFormatted}${currency}${hashedSecret}`);
}

function buildNotifyMd5sig({ merchantId, orderId, amount, currency, statusCode }) {
  const secret = process.env.PAYHERE_MERCHANT_SECRET || "";
  if (!secret) return null;
  const hashedSecret = md5Upper(secret);
  return md5Upper(`${merchantId}${orderId}${amount}${currency}${statusCode}${hashedSecret}`);
}

function verifyNotifySignature(body) {
  const {
    merchant_id,
    order_id,
    payhere_amount,
    payhere_currency,
    status_code,
    md5sig,
  } = body;
  if (!md5sig || !merchant_id || !order_id) return false;
  const expected = buildNotifyMd5sig({
    merchantId: merchant_id,
    orderId: order_id,
    amount: payhere_amount,
    currency: payhere_currency,
    statusCode: status_code,
  });
  return expected && expected === md5sig.toUpperCase();
}

function isPayHereConfigured() {
  return !!(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);
}

/**
 * amountFormatted: "2500.00" style string for PayHere
 */
function createCheckoutFields({
  orderId,
  amountFormatted,
  currency,
  itemsTitle,
  customerEmail,
  customerPhone,
  customerFirstName,
  customerLastName,
  returnUrl,
  cancelUrl,
  notifyUrl,
}) {
  const merchantId = process.env.PAYHERE_MERCHANT_ID;
  if (!isPayHereConfigured()) {
    return {
      error:
        "Helakuru (PayHere) is not configured. Set PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET, and enable HelaPay in the PayHere merchant portal.",
    };
  }
  const hash = buildCheckoutHash({
    merchantId,
    orderId,
    amountFormatted,
    currency,
  });
  if (!hash) return { error: "Failed to build PayHere hash" };

  return {
    actionUrl:
      process.env.PAYHERE_CHECKOUT_URL ||
      (process.env.PAYHERE_SANDBOX === "true"
        ? "https://sandbox.payhere.lk/pay/checkout"
        : "https://www.payhere.lk/pay/checkout"),
    fields: {
      merchant_id: merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      order_id: orderId,
      items: itemsTitle,
      currency,
      amount: amountFormatted,
      first_name: customerFirstName || "Patient",
      last_name: customerLastName || "MediFlow",
      email: customerEmail || "patient@example.com",
      phone: customerPhone || "0770000000",
      address: "N/A",
      city: "Colombo",
      country: "Sri Lanka",
      /** Echoed on notify_url — identifies Helakuru (HelaPay wallet) checkout intent. */
      custom_1: "HELAKURU_HELAPAY",
      hash,
    },
  };
}

module.exports = {
  createCheckoutFields,
  verifyNotifySignature,
  isPayHereConfigured,
};
