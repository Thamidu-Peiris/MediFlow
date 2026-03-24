const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createProxyMiddleware } = require("http-proxy-middleware");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "API Gateway is running" });
});

const proxyRoutes = [
  ["/api/auth", process.env.AUTH_SERVICE_URL || "http://localhost:8001"],
  ["/api/patients", process.env.PATIENT_SERVICE_URL || "http://localhost:8002"],
  ["/api/doctors", process.env.DOCTOR_SERVICE_URL || "http://localhost:8003"],
  ["/api/appointments", process.env.APPOINTMENT_SERVICE_URL || "http://localhost:8004"],
  ["/api/notifications", process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8005"],
  ["/api/payments", process.env.PAYMENT_SERVICE_URL || "http://localhost:8006"],
  ["/api/telemedicine", process.env.TELEMEDICINE_SERVICE_URL || "http://localhost:8007"],
  ["/api/ai", process.env.AI_SERVICE_URL || "http://localhost:8008"]
];

proxyRoutes.forEach(([path, target]) => {
  app.use(
    path,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: (pathName) => pathName.replace(path, "")
    })
  );
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on ${PORT}`);
});
