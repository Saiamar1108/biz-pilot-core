const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    orders: { type: Number, default: 0, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    due: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["vip", "regular", "new"], default: "new" },
    lastOrder: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
