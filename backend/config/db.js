const env = require("./env");
const mongoose = require("mongoose");
const { startLocalMongod } = require("../utils/localMongod");

async function connectDB() {
  let uri = process.env.MONGODB_URI || env.mongodbUri;

  if (!uri) {
    console.error("MongoDB connection failed: MONGODB_URI is not set in environment variables and no fallback URI is configured");
    process.exit(1);
  }

  if (uri === "memory") {
    uri = await startLocalMongod();
    console.log("Using local embedded MongoDB (development)");
  }

  try {
    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Mongoose will attempt to reconnect.");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected successfully");
    });

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
