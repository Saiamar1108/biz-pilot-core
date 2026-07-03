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
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    sold: { type: Number, default: 0, min: 0 },
    stockMovements: { type: [movementSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
