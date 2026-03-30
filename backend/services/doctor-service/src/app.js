const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const doctorRoutes = require("./routes/doctor.routes");

dotenv.config();
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
  app.listen(PORT, () => console.log(`Doctor Service listening on ${PORT}`));
});
