const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createProxyMiddleware } = require("http-proxy-middleware");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    exposedHeaders: ["X-MediFlow-Patient-Service-Revision", "X-MediFlow-Upload-Engine"]
  })
);

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
  const opts = {
    target,
    changeOrigin: true,
    pathRewrite: (pathName) =>
      path === "/api/notifications" ? pathName : pathName.replace(path, ""),
    // Avoid premature 504 when the target is slow to accept (e.g. cold start); LLM routes set their own timeouts.
    proxyTimeout: Number(process.env.PROXY_TIMEOUT_MS) || 120000,
    timeout: Number(process.env.PROXY_TIMEOUT_MS) || 120000
  };
  if (path === "/api/patients") {
    opts.onProxyRes = (proxyRes, req, res) => {
      const rev = proxyRes.headers["x-mediflow-patient-service-revision"];
      if (rev) res.setHeader("X-MediFlow-Patient-Service-Revision", rev);
      const eng = proxyRes.headers["x-mediflow-upload-engine"];
      if (eng) res.setHeader("X-MediFlow-Upload-Engine", eng);
    };
  }
  app.use(path, createProxyMiddleware(opts));
});

app.listen(PORT, () => {
  console.log(`API Gateway listening on ${PORT}`);
});