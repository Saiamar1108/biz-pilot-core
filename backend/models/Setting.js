const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    invoiceNotifications: { type: Boolean, default: true },
    stockAlerts: { type: Boolean, default: true },
    paymentReminders: { type: Boolean, default: true },
    aiInsightsAlerts: { type: Boolean, default: false },
  },
  { _id: false },
);

const profileSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, default: "A. Sai Amar Chaitanya" },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      default: "asaiamar@shoppilot.ai",
    },
    phone: { type: String, trim: true, default: "+91 75696 81350" },
    timezone: { type: String, trim: true, default: "Asia/Kolkata" },
    imageDataUrl: { type: String, default: "" },
  },
  { _id: false },
);

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    profile: { type: profileSchema, default: () => ({}) },
    notifications: { type: notificationSchema, default: () => ({}) },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Setting", settingSchema);
