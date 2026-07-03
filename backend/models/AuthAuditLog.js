const mongoose = require("mongoose");

const authAuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
    email: { type: String, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true },
    ip: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, default: "" },
    success: { type: Boolean, default: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

authAuditLogSchema.index({ createdAt: -1 });
authAuditLogSchema.index({ email: 1, action: 1 });

module.exports = mongoose.model("AuthAuditLog", authAuditLogSchema);
