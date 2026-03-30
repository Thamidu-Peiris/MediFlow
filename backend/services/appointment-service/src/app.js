const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const appointmentRoutes = require("./routes/appointment.routes");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({ service: "appointment-service", status: "ok" });
});

app.use("/", appointmentRoutes);

connectDB().finally(() => {
  app.listen(PORT, () => console.log(`Appointment Service listening on ${PORT}`));
});
