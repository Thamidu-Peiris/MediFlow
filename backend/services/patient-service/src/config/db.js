const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("MONGODB_URI not set. Patient service running without database.");
    return;
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("Patient service connected to MongoDB Atlas");
  } catch (error) {
    console.error("Patient service MongoDB connection failed:", error.message);
  }
};

module.exports = connectDB;
