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
