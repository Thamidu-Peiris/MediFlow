const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8008;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ service: "ai-service", status: "ok" });
});

app.post("/symptom-check", (req, res) => {
  res.status(200).json({
    suggestions: ["General Physician"],
    note: "AI symptom checker placeholder"
  });
});

app.listen(PORT, () => console.log(`AI Service listening on ${PORT}`));
