const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, trim: true, default: "" },
    paidAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const reminderSentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["day3", "day7", "day15"], required: true },
    sentAt: { type: Date, default: Date.now },
    preview: { type: String, default: "" },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    customerName: { type: String, required: true },
    lineItems: { type: [lineItemSchema], required: true, validate: [(v) => v.length > 0, "At least one line item is required"] },
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    pendingAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["paid", "pending", "partial", "overdue", "sent"], default: "pending" },
    paidAmount: { type: Number, default: 0, min: 0 },
    paidAt: { type: Date },
    paymentMethod: { type: String, trim: true, default: "" },
    paymentHistory: { type: [paymentHistorySchema], default: [] },
    remindersSent: { type: [reminderSentSchema], default: [] },
    dueDate: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    shopId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Shop", 
      required: true,
      index: true 
    },
  },
  { timestamps: true }
);

// Compound index for unique invoice number per shop
invoiceSchema.index({ invoiceNumber: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
