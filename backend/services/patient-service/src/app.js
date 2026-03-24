const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const patientRoutes = require("./routes/patient.routes");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (req, res) => {
  res.status(200).json({ service: "patient-service", status: "ok" });
});

app.use("/", patientRoutes);

connectDB().finally(() => {
  app.listen(PORT, () => console.log(`Patient Service listening on ${PORT}`));
});
