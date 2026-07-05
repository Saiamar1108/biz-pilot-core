const AuthAuditLog = require("../models/AuthAuditLog");

async function logAuthEvent({ userId, shopId, email, action, req, success = true, metadata = {} }) {
  try {
    await AuthAuditLog.create({
      userId,
      shopId,
      email,
      action,
      ip: req?.ip || req?.headers?.["x-forwarded-for"] || "",
      userAgent: req?.headers?.["user-agent"] || "",
      success,
      metadata,
    });
  } catch (error) {
    console.warn("Auth audit log failed:", error.message);
  }
}

module.exports = { logAuthEvent };
