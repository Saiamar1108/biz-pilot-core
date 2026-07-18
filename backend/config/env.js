const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const fifteenMinutesMs = 15 * 60 * 1000;
const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

const env = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/shoppilot",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
  taxRate: parseFloat(process.env.TAX_RATE) || 0.08,
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 10,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me",
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  jwtRefreshRememberExpiresIn: process.env.JWT_REFRESH_REMEMBER_EXPIRES_IN || "30d",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "sp_refresh_token",
  refreshCookieMaxAgeMs: sevenDaysMs,
  refreshRememberCookieMaxAgeMs: thirtyDaysMs,
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "ShopPilot AI <no-reply@shoppilot.ai>",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};

module.exports = env;
