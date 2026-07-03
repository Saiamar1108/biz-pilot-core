const Notification = require("../models/Notification");
const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const env = require("../config/env");
const { PENDING_BUCKET_STATUSES, getOutstandingAmount } = require("../utils/invoiceAmounts");
const { syncInvoiceReminders } = require("./invoiceReminderService");

async function createNotification({
  type,
  message,
  relatedId = "",
  key = null,
}) {
  // If key exists → update existing notification (prevents duplicates)
  if (key) {
    return Notification.findOneAndUpdate(
      { key },
      {
        $set: {
          type,
          message,
          relatedId,
          read: false,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
  }

  // If no key → check for similar notifications to prevent duplicates
  // Use a combination of type, message, and relatedId to identify duplicates
  if (type && message) {
    const existing = await Notification.findOne({
      type,
      message,
      relatedId,
      read: false,
      createdAt: {
        $gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
      },
    });

    if (existing) {
      return existing; // Return existing instead of creating duplicate
    }
  }

  // If no key and no recent duplicate → create new notification
  return Notification.create({
    type,
    message,
    relatedId,
    read: false,
  });
}

async function syncSystemNotifications() {
  const [lowStockProducts, pendingInvoices] = await Promise.all([
    Product.find({
      stock: { $lte: env.lowStockThreshold },
    })
      .select("_id name stock")
      .lean(),

    Invoice.find({
      status: { $in: [...PENDING_BUCKET_STATUSES] },
    })
      .select("_id invoiceNumber customerName total createdAt pendingAmount")
      .lean(),
  ]);

  // LOW STOCK ALERTS
  for (const product of lowStockProducts) {
    await createNotification({
      type: "low_stock",
      message: `Low stock: ${product.name} only ${product.stock} left`,
      relatedId: String(product._id),
      key: `low-stock-${String(product._id)}`,
    });
  }

  // PENDING PAYMENT ALERTS
  const now = Date.now();

  for (const invoice of pendingInvoices) {
    const daysPending = Math.floor(
      (now - new Date(invoice.createdAt).getTime()) /
        (24 * 60 * 60 * 1000)
    );

    // Skip fresh invoices (< 7 days)
    if (daysPending <= 7) continue;

    await createNotification({
      type: "pending_payment",
      message: `${invoice.customerName} has ₹${Math.round(
        getOutstandingAmount(invoice),
      ).toLocaleString("en-IN")} pending for ${daysPending} days`,
      relatedId: String(invoice.invoiceNumber || invoice._id),
      key: `pending-payment-${String(invoice._id)}`,
    });
  }

  await syncInvoiceReminders();
}

module.exports = {
  createNotification,
  syncSystemNotifications,
};