const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.warn("MONGODB_URI not set. Doctor service running without database.");
    return;
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("Doctor service connected to MongoDB Atlas");
  } catch (error) {
    console.error("Doctor service MongoDB connection failed:", error.message);
  }
};

module.exports = connectDB;
