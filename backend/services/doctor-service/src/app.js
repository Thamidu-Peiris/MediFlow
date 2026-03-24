const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8003;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ service: "doctor-service", status: "ok" });
});

connectDB().finally(() => {
  app.listen(PORT, () => console.log(`Doctor Service listening on ${PORT}`));
});
