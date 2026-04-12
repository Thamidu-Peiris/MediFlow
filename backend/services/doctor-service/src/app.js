const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cloudinaryCfg = require("./config/cloudinary");
const doctorRoutes = require("./routes/doctor.routes");

dotenv.config({ path: path.join(__dirname, "..", ".env") });
cloudinaryCfg.configure();
const app = express();
const PORT = process.env.PORT || 8003;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({ service: "doctor-service", status: "ok" });
});

app.use("/", doctorRoutes);

connectDB().finally(() => {
  app.listen(PORT, () => {
    console.log(`Doctor Service listening on ${PORT}`);
    const { cloud_name } = cloudinaryCfg.readEnvTriplet();
    if (cloudinaryCfg.isConfigured()) {
      console.log(`Cloudinary: ON (cloud=${cloud_name}) — profile image uploads enabled.`);
    } else {
      console.warn(
        "Cloudinary: OFF — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in doctor-service .env for photo uploads."
      );
    }
  });
});
