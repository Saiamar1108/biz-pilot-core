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
  const [lowStockProducts, pendingInvoices, expiringProducts] = await Promise.all([
    Product.find({
      stock: { $lte: env.lowStockThreshold },
    })
      .select("_id name stock expiryDate")
      .lean(),

    Invoice.find({
      status: { $in: [...PENDING_BUCKET_STATUSES] },
    })
      .select("_id invoiceNumber customerName total createdAt pendingAmount")
      .lean(),

    Product.find({
      expiryDate: { $ne: null },
    })
      .select("_id name expiryDate stock")
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

  // EXPIRY ALERTS
  const now = Date.now();
  for (const product of expiringProducts) {
    const daysUntilExpiry = Math.floor(
      (new Date(product.expiryDate).getTime() - now) / (24 * 60 * 60 * 1000)
    );

    if (daysUntilExpiry < 0) {
      // Expired
      await createNotification({
        type: "product_expired",
        message: `${product.name} expired ${Math.abs(daysUntilExpiry)} days ago (${product.stock} units)`,
        relatedId: String(product._id),
        key: `expired-${String(product._id)}`,
      });
    } else if (daysUntilExpiry <= 7) {
      // Expiring soon
      await createNotification({
        type: "product_expiring_soon",
        message: `${product.name} expires in ${daysUntilExpiry} days (${product.stock} units)`,
        relatedId: String(product._id),
        key: `expiring-soon-${String(product._id)}`,
      });
    } else if (daysUntilExpiry <= 30) {
      // Expiring in 30 days
      await createNotification({
        type: "product_expiring",
        message: `${product.name} expires in ${daysUntilExpiry} days (${product.stock} units)`,
        relatedId: String(product._id),
        key: `expiring-${String(product._id)}`,
      });
    }
  }

  // PENDING PAYMENT ALERTS
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