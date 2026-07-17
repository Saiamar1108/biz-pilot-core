const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    businessType: {
      type: String,
      trim: true,
      default: "Retail",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },
    pan: {
      type: String,
      trim: true,
      default: "",
    },
    upiId: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    addressState: {
      type: String,
      trim: true,
      default: "",
    },
    addressCity: {
      type: String,
      trim: true,
      default: "",
    },
    pincode: {
      type: String,
      trim: true,
      default: "",
    },
    currency: {
      type: String,
      trim: true,
      default: "INR",
    },
    timezone: {
      type: String,
      trim: true,
      default: "Asia/Kolkata",
    },
    logoDataUrl: {
      type: String,
      default: "",
    },
    primaryColor: {
      type: String,
      trim: true,
      default: "#6366f1",
    },
    accentColor: {
      type: String,
      trim: true,
      default: "#10b981",
    },
    invoiceLogoDataUrl: {
      type: String,
      default: "",
    },
    invoiceFooter: {
      type: String,
      trim: true,
      default: "Thank you for your business.",
    },
    invoicePrefix: {
      type: String,
      trim: true,
      default: "INV-",
    },
    settings: {
      taxRate: {
        type: Number,
        default: 0.08,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

shopSchema.pre("validate", function syncShopNames(next) {
  if (!this.shopName && this.name) this.shopName = this.name;
  if (!this.name && this.shopName) this.name = this.shopName;
  next();
});

module.exports = mongoose.model("Shop", shopSchema);
