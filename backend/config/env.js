const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/shoppilot",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173"],
  taxRate: parseFloat(process.env.TAX_RATE) || 0.08,
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 10,
};

module.exports = env;
