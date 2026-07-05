const Notification = require("../models/Notification");
const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const env = require("../config/env");
const {
  PENDING_BUCKET_STATUSES,
  getOutstandingAmount,
} = require("../utils/invoiceAmounts");
const { syncInvoiceReminders } = require("./invoiceReminderService");

/**
 * Create tenant-safe notification
 */
const createNotification = async ({
  shopId,
  userId = null,
  type,
  message,
  relatedId = "",
  key = null,
}) => {
  if (!shopId) {
    throw new Error("shopId is required for notification creation");
  }

  // Prevent duplicate updates per tenant
  if (key) {
    return Notification.findOneAndUpdate(
      { key, shopId },
      {
        $set: {
          shopId,
          userId,
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

  // Prevent duplicate recent notifications per tenant
  const existing = await Notification.findOne({
    shopId,
    type,
    message,
    relatedId,
    read: false,
    createdAt: {
      $gte: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  if (existing) {
    return existing;
  }

  return Notification.create({
    shopId,
    userId,
    type,
    message,
    relatedId,
    read: false,
  });
};

/**
 * Sync all notifications only for one tenant
 */
const syncSystemNotifications = async (shopId) => {
  if (!shopId) {
    throw new Error("shopId is required for notification sync");
  }

  const [lowStockProducts, pendingInvoices, expiringProducts] =
    await Promise.all([
      Product.find({
        shopId,
        stock: { $lte: env.lowStockThreshold },
      })
        .select("_id name stock expiryDate")
        .lean(),

      Invoice.find({
        shopId,
        status: { $in: [...PENDING_BUCKET_STATUSES] },
      })
        .select(
          "_id invoiceNumber customerName total createdAt pendingAmount"
        )
        .lean(),

      Product.find({
        shopId,
        expiryDate: { $ne: null },
      })
        .select("_id name expiryDate stock")
        .lean(),
    ]);

  const now = Date.now();

  /**
   * LOW STOCK
   */
  for (const product of lowStockProducts) {
    await createNotification({
      shopId,
      type: "low_stock",
      message: `Low stock: ${product.name} only ${product.stock} left`,
      relatedId: String(product._id),
      key: `low-stock-${String(product._id)}`,
    });
  }

  /**
   * EXPIRY ALERTS
   */
  for (const product of expiringProducts) {
    const daysUntilExpiry = Math.floor(
      (new Date(product.expiryDate).getTime() - now) /
        (24 * 60 * 60 * 1000)
    );

    if (daysUntilExpiry < 0) {
      await createNotification({
        shopId,
        type: "product_expired",
        message: `${product.name} expired ${Math.abs(
          daysUntilExpiry
        )} days ago (${product.stock} units)`,
        relatedId: String(product._id),
        key: `expired-${String(product._id)}`,
      });
    } else if (daysUntilExpiry <= 7) {
      await createNotification({
        shopId,
        type: "product_expiring_soon",
        message: `${product.name} expires in ${daysUntilExpiry} days (${product.stock} units)`,
        relatedId: String(product._id),
        key: `expiring-soon-${String(product._id)}`,
      });
    } else if (daysUntilExpiry <= 30) {
      await createNotification({
        shopId,
        type: "product_expiring",
        message: `${product.name} expires in ${daysUntilExpiry} days (${product.stock} units)`,
        relatedId: String(product._id),
        key: `expiring-${String(product._id)}`,
      });
    }
  }

  /**
   * PENDING PAYMENTS
   */
  for (const invoice of pendingInvoices) {
    const daysPending = Math.floor(
      (now - new Date(invoice.createdAt).getTime()) /
        (24 * 60 * 60 * 1000)
    );

    if (daysPending <= 7) continue;

    await createNotification({
      shopId,
      type: "pending_payment",
      message: `${invoice.customerName} has ₹${Math.round(
        getOutstandingAmount(invoice)
      ).toLocaleString("en-IN")} pending for ${daysPending} days`,
      relatedId: String(invoice.invoiceNumber || invoice._id),
      key: `pending-payment-${String(invoice._id)}`,
    });
  }

  /**
   * Invoice reminder sync (tenant-safe if implemented properly)
   */
  await syncInvoiceReminders(shopId);
};

module.exports = {
  createNotification,
  syncSystemNotifications,
};