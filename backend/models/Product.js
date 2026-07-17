const mongoose = require("mongoose");

const movementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["added", "sold", "adjusted"], required: true },
    quantity: { type: Number, required: true },
    note: { type: String, trim: true, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0.01 },
    costPrice: { type: Number, required: true, min: 0.01 },
    sold: { type: Number, default: 0, min: 0 },
    stockMovements: { type: [movementSchema], default: [] },
    shopId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Shop", 
      required: true,
      index: true 
    },
    barcode: { type: String, trim: true, default: "" },
    expiryDate: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for unique SKU per shop
productSchema.index({ sku: 1, shopId: 1 }, { unique: true });

productSchema.index({ shopId: 1, createdAt: -1 });
productSchema.index({ shopId: 1, category: 1 });

module.exports = mongoose.model("Product", productSchema);
