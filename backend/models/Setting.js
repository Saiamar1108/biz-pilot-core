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

const businessSchema = new mongoose.Schema(
  {
    storeName: { type: String, trim: true, default: "SaiMart Retail" },
    ownerName: { type: String, trim: true, default: "A. Sai Amar Chaitanya" },
    gstNumber: { type: String, trim: true, default: "37ABCDE1234F1Z5" },
    phone: { type: String, trim: true, default: "+91 7569681350" },
    email: { type: String, lowercase: true, trim: true, default: "support@saimart.in" },
    address: { type: String, trim: true, default: "Vijayawada, Andhra Pradesh" },
    category: { type: String, trim: true, default: "Grocery & Retail" },
    logoDataUrl: { type: String, default: "" },
    upiId: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, default: "default" },
    profile: { type: profileSchema, default: () => ({}) },
    business: { type: businessSchema, default: () => ({}) },
    notifications: { type: notificationSchema, default: () => ({}) },
    shopId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Shop", 
      required: true,
      index: true 
    },
  },
  { timestamps: true },
);

settingSchema.index({ key: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Setting", settingSchema);
