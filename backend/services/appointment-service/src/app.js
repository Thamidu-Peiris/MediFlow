const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ service: "appointment-service", status: "ok" });
});

app.listen(PORT, () => console.log(`Appointment Service listening on ${PORT}`));
