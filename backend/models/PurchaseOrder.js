const mongoose = require("mongoose");
const { Schema } = mongoose;

const purchaseOrderLineItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "units" },
    purchasePrice: { type: Number, required: true, min: 0.01 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    expectedDeliveryDate: { type: Date },
    remarks: { type: String, default: "" },
    batchNumber: { type: String, default: "" },
    expiryDate: { type: Date, default: null },
  },
  { _id: false }
);

const purchaseOrderSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    purchaseOrderNumber: { type: String, required: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true },
    items: [purchaseOrderLineItemSchema],
    status: {
      type: String,
      enum: ["Draft", "Sent", "Confirmed", "Partially Received", "Received", "Cancelled"],
      default: "Draft",
    },
    totalAmount: { type: Number, required: true },
    notes: { type: String, default: "" },
    expectedDeliveryDate: { type: Date },
    receivedDate: { type: Date },
    invoiceNumber: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index for unique purchase order number per shop
purchaseOrderSchema.index({ purchaseOrderNumber: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
