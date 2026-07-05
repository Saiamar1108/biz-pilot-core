const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedId: { type: String, trim: true, default: "" },
    key: { type: String, trim: true, default: "" },
    read: { type: Boolean, default: false },
    shopId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Shop", 
      required: true,
      index: true 
    },
  },
  { timestamps: true },
);

notificationSchema.index({ key: 1, shopId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Notification", notificationSchema);
