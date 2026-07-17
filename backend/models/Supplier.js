const mongoose = require("mongoose");
const { Schema } = mongoose;

const supplierSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    supplierName: { type: String, required: true, trim: true },
    contactPerson: { type: String, trim: true, default: "" },
    mobileNumber: { type: String, required: true, trim: true },
    alternateNumber: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    gstNumber: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    preferredSupplier: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate supplier name per shop
supplierSchema.index({ supplierName: 1, shopId: 1 }, { unique: true });

module.exports = mongoose.model("Supplier", supplierSchema);
