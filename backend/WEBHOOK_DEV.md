# MediFlow — Dev Webhook Setup Guide

Webhooks let payment providers (Stripe, PayHere) call your server to confirm payment.  
In production they reach your live server automatically.  
**In local dev** you need two tools to bridge the gap:

| Provider | Tool needed | Why |
|----------|------------|-----|
| **Stripe** | Stripe CLI (`stripe listen`) | Stripe can't reach `localhost` — the CLI acts as a secure tunnel |
| **PayHere/HelaPay** | **ngrok** | PayHere POSTs to `notify_url`; it must be a public HTTPS URL |

---

## Architecture (how webhooks flow in dev)

```
STRIPE FLOW
───────────
Stripe Cloud
    │  event: payment_intent.succeeded
    ▼
Stripe CLI (localhost)
    │  forwards to ↓
    ▼
localhost:8081  (API Gateway)
    │  strips /api/payments, proxies to ↓
    ▼
localhost:8006  (payment-service  POST /webhooks/stripe)
    │  verifies signature with STRIPE_WEBHOOK_SECRET
    │  updates PendingBooking.status = "paid"
    ▼
  ✓ Payment confirmed


PAYHERE / HELAPAY FLOW
──────────────────────
Browser submits PayHere checkout form
    │  (notify_url = https://xxxx.ngrok-free.app/api/payments/webhooks/payhere)
    ▼
PayHere Cloud processes payment
    │  POST notify_url  (form-encoded, signed with MD5)
    ▼
ngrok (public HTTPS endpoint)
    │  tunnels to ↓
    ▼
localhost:8081  (API Gateway)
    │  strips /api/payments, proxies to ↓
    ▼
localhost:8006  (payment-service  POST /webhooks/payhere)
    │  verifies MD5 signature with PAYHERE_MERCHANT_SECRET
    │  updates PendingBooking.status = "paid"
    ▼
  ✓ Payment confirmed
```

---

## One-command setup

```powershell
# from the backend/ directory
.\start-webhooks.ps1
```

The script:
1. Detects your running API Gateway port (8081 / 8080)
2. Starts **ngrok** → gets the public HTTPS URL
3. Writes `API_PUBLIC_URL=https://xxxx.ngrok-free.app` into `payment-service\.env`
4. Opens a new terminal running `stripe listen --forward-to localhost:8081/...`
5. Prints a full summary of what's running

---

## Manual step-by-step

### Prerequisites

| Tool | Install |
|------|---------|
| Node.js 18+ | Already installed |
| ngrok | https://ngrok.com/download (add to PATH, run `ngrok config add-authtoken <token>`) |
| Stripe CLI | https://stripe.com/docs/stripe-cli or `scoop install stripe` |

---

### Step 1 — Fill in your keys

Edit `backend/services/payment-service/.env`:

```env
# Stripe — from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayHere Sandbox — from https://www.payhere.lk/merchant/#/settings
PAYHERE_MERCHANT_ID=1234567
PAYHERE_MERCHANT_SECRET=your_secret_here
PAYHERE_SANDBOX=true
```

---

### Step 2 — Start ngrok (for PayHere)

```powershell
ngrok http 8081
```

Copy the **Forwarding HTTPS URL** shown (e.g. `https://abc123.ngrok-free.app`).

Update `payment-service/.env`:
```env
API_PUBLIC_URL=https://abc123.ngrok-free.app
```

Restart the payment service (see Step 5).

---

### Step 3 — Start Stripe CLI listener (for Stripe)

In a **new terminal**:

```powershell
stripe listen --forward-to localhost:8081/api/payments/webhooks/stripe
```

The CLI will print:
```
> Ready! Your webhook signing secret is whsec_abcdef1234...  (^C to quit)
```

Copy the `whsec_...` value and add it to `payment-service/.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_abcdef1234...
```

Restart the payment service (see Step 5).

---

### Step 4 — Start remaining services

Make sure these are all running:

```powershell
# Terminal A — API Gateway (port 8081)
cd backend\api-gateway
npm start

# Terminal B — Payment Service (port 8006)
cd backend\services\payment-service
npm run dev          # nodemon — auto-restarts when .env changes

# Terminal C — Stripe CLI (from Step 3)
stripe listen --forward-to localhost:8081/api/payments/webhooks/stripe

# Terminal D — ngrok (from Step 2)
ngrok http 8081

# Terminal E — Frontend
cd frontend
npm run dev
```

---

### Step 5 — Restarting the payment service

After editing `.env`, the service must restart to pick up new env vars.

```powershell
cd backend\services\payment-service
npm run dev    # nodemon watches src/ and restarts automatically
```

---

## Verifying it works

### Stripe
1. In the browser, go through a booking checkout with **Card payment**
2. Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC
3. Watch the **Stripe CLI terminal** — it should show:
   ```
   --> payment_intent.created [evt_...]
   <-- [200] POST http://localhost:8081/api/payments/webhooks/stripe
   --> payment_intent.succeeded [evt_...]
   <-- [200] POST http://localhost:8081/api/payments/webhooks/stripe
   ```
4. Then click **"Complete booking"** — the appointment is created

### PayHere
1. Go through a booking checkout, choose **HelaPay / PayHere**
2. The checkout form submits to `https://sandbox.payhere.lk/pay/checkout`
3. Pay in sandbox with PayHere test credentials
4. Watch the **ngrok terminal** and **ngrok dashboard** at `http://localhost:4040`
5. You should see a POST to `/api/payments/webhooks/payhere`
6. The payment service logs `PayHere webhook OK` (or similar)
7. When redirected back, click **"Complete booking"**

---

## Troubleshooting

### Stripe — "No signatures found matching the expected signature"
- The `STRIPE_WEBHOOK_SECRET` doesn't match the current `stripe listen` session
- Each time you restart `stripe listen` it generates a **new** `whsec_...`
- Copy the new secret to `.env` and restart the payment service

### Stripe — "STRIPE_WEBHOOK_SECRET is not configured"
- The env var is missing or still set to `whsec_REPLACE_ME`
- Fix it in `.env` and restart the payment service

### PayHere — "Invalid signature" (400 error)
- `PAYHERE_MERCHANT_SECRET` in `.env` doesn't match your sandbox account
- Double-check in PayHere Merchant Portal → Settings

### PayHere — "Payment not verified yet" / webhook never arrives
- `API_PUBLIC_URL` is still `http://localhost:8081` (not an ngrok URL)
- PayHere can't reach `localhost` — you **must** use ngrok
- Run `start-webhooks.ps1` or set `API_PUBLIC_URL=https://xxxx.ngrok-free.app`

### ngrok — "failed to start tunnel: Your account is limited to 1 simultaneous ngrok agent"
- Kill any other ngrok processes: `Stop-Process -Name ngrok -Force`
- Free ngrok accounts allow only one tunnel at a time

### ngrok URL changes every restart (free plan)
- ngrok free accounts generate a new URL each session
- Always re-run `start-webhooks.ps1` to update `API_PUBLIC_URL` in `.env`
- To get a fixed URL: upgrade to ngrok paid plan and use `--subdomain=mediflow-dev`

### "Appointment created but status stuck pending"
- The webhook arrived but the service was not restarted with the correct `STRIPE_WEBHOOK_SECRET`
- Fix the secret, restart, and try again (Stripe CLI resends failed events with `stripe events resend <id>`)

---

## Environment variable reference

| Key | What it does |
|-----|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key — used server-side to create PaymentIntents |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key — sent to browser for Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from `stripe listen` — verifies Stripe webhook signatures |
| `PAYHERE_MERCHANT_ID` | Your PayHere merchant ID (sandbox or live) |
| `PAYHERE_MERCHANT_SECRET` | Your PayHere merchant secret — used to verify `notify_url` MD5 sig |
| `PAYHERE_SANDBOX` | `true` → sandbox.payhere.lk / `false` → live payhere.lk |
| `API_PUBLIC_URL` | Public base URL (ngrok URL) — used as `notify_url` prefix for PayHere |
| `FRONTEND_URL` | Frontend origin — used as `return_url` and `cancel_url` for PayHere |
