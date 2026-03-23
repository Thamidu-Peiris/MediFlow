const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8005;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ service: "notification-service", status: "ok" });
});

app.listen(PORT, () => console.log(`Notification Service listening on ${PORT}`));
