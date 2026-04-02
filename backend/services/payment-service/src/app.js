const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const paymentRoutes = require("./routes/payment.routes");
const webhookController = require("./controllers/webhook.controller");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8006;

app.use(cors());

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  webhookController.stripeWebhook
);

app.post(
  "/webhooks/payhere",
  express.urlencoded({ extended: true }),
  webhookController.payhereWebhook
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ service: "payment-service", status: "ok" });
});

app.use("/", paymentRoutes);

connectDB().finally(() => {
  app.listen(PORT, () => console.log(`Payment Service listening on ${PORT}`));
});
