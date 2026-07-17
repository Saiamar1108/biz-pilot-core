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
    fullName: { type: String, trim: true, default: "" },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    phone: { type: String, trim: true, default: "" },
    timezone: { type: String, trim: true, default: "Asia/Kolkata" },
    imageDataUrl: { type: String, default: "" },
  },
  { _id: false },
);

const businessSchema = new mongoose.Schema(
  {
    storeName: { type: String, trim: true, default: "" },
    ownerName: { type: String, trim: true, default: "" },
    gstNumber: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, lowercase: true, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" },
    logoDataUrl: { type: String, default: "" },
    upiId: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const preferencesSchema = new mongoose.Schema(
  {
    theme: { type: String, default: "system" },
    language: { type: String, default: "en" },
    currency: { type: String, default: "INR" },
    dateFormat: { type: String, default: "DD/MM/YYYY" },
    numberFormat: { type: String, default: "en-IN" },
    startPage: { type: String, default: "/dashboard" },
  },
  { _id: false },
);

const aiSettingsSchema = new mongoose.Schema(
  {
    personality: { type: String, default: "professional" },
    responseLength: { type: String, default: "medium" },
    businessContext: { type: String, default: "" },
    enableVoice: { type: Boolean, default: false },
  },
  { _id: false },
);

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, default: "default" },
    profile: { type: profileSchema, default: () => ({}) },
    business: { type: businessSchema, default: () => ({}) },
    notifications: { type: notificationSchema, default: () => ({}) },
    preferences: { type: preferencesSchema, default: () => ({}) },
    aiSettings: { type: aiSettingsSchema, default: () => ({}) },
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
