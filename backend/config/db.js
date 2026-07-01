require("./env");

const mongoose = require("mongoose");
const { startLocalMongod } = require("../utils/localMongod");

async function connectDB() {
  let uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("MongoDB connection failed: MONGODB_URI is not set in environment variables");
    process.exit(1);
  }

  if (uri === "memory") {
    uri = await startLocalMongod();
    console.log("Using local embedded MongoDB (development)");
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
