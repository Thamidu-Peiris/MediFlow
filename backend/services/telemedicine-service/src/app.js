const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const sessionRoutes = require("./routes/session.routes");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8007;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({ service: "telemedicine-service", status: "ok" });
});

app.use("/", sessionRoutes);

connectDB().finally(() => {
  app.listen(PORT, () => console.log(`Telemedicine Service listening on ${PORT}`));
});
