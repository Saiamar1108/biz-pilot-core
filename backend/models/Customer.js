const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    gstNumber: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    totalPurchases: { type: Number, default: 0, min: 0 },
    totalBilled: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastPaymentDate: { type: Date },
    lastPurchaseDate: { type: Date, default: Date.now },
    favoriteProduct: { type: String, trim: true, default: "" },
    pendingAmount: { type: Number, default: 0, min: 0 },
    customerType: { type: String, enum: ["VIP", "Regular", "New"], default: "New" },
    orders: { type: Number, default: 0, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    due: { type: Number, default: 0, min: 0 },
    pendingPayments: { type: Number, default: 0, min: 0 },
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Invoice" }],
    status: { type: String, enum: ["vip", "regular", "new"], default: "new" },
    lastOrder: { type: Date, default: Date.now },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", index: true },
    isDemoData: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Customer", customerSchema);
