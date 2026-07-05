const Invoice = require("../models/Invoice");
const Setting = require("../models/Setting");
const Notification = require("../models/Notification");
const { getOutstandingAmount } = require("../utils/invoiceAmounts");
const { generateReminderMessage } = require("../utils/generateReminderMessage");
const { PENDING_BUCKET_STATUSES } = require("../utils/invoiceAmounts");

const REMINDER_SCHEDULE = [
  { type: "day3", minDays: 3, maxDays: 6 },
  { type: "day7", minDays: 7, maxDays: 14 },
  { type: "day15", minDays: 15, maxDays: Infinity },
];

async function getBusinessProfile(shopId) {
  const settings = await Setting.findOne({ key: "default", shopId }).lean();
  return settings?.business || {};
}

async function createReminderNotification({ type, message, relatedId, key, shopId }) {
  return Notification.findOneAndUpdate(
    { key, shopId },
    {
      $set: {
        type,
        message,
        relatedId,
        read: false,
        shopId,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
}

async function syncInvoiceReminders(shopId) {
  if (!shopId) return;

  const business = await getBusinessProfile(shopId);
  const now = Date.now();

  const invoiceQuery = {
    status: { $in: [...PENDING_BUCKET_STATUSES] },
    shopId,
  };

  const pendingInvoices = await Invoice.find(invoiceQuery)
    .populate("customer", "name phone email")
    .lean();

  for (const invoice of pendingInvoices) {
    const outstanding = getOutstandingAmount(invoice);

    if (outstanding <= 0) continue;

    const daysPending = Math.floor((now - new Date(invoice.createdAt).getTime()) / 86400000);

    const sentTypes = new Set((invoice.remindersSent || []).map((entry) => entry.type));

    for (const schedule of REMINDER_SCHEDULE) {
      const inWindow = daysPending >= schedule.minDays && daysPending <= schedule.maxDays;

      if (!inWindow) continue;
      if (sentTypes.has(schedule.type)) continue;

      const customer = invoice.customer || {};

      // Generate reminder preview (used later for WhatsApp/email if needed)
      const reminderPreview = generateReminderMessage({
        invoice,
        business,
        customer,
      });

      await createReminderNotification({
        type: "payment_reminder",
        message: `Reminder (${schedule.type}): ${invoice.customerName} has ₹${Math.round(
          outstanding,
        ).toLocaleString("en-IN")} pending on invoice ${invoice.invoiceNumber}`,
        relatedId: invoice.invoiceNumber,
        key: `reminder-${schedule.type}-${invoice._id}`,
        shopId,
      });

      await Invoice.updateOne(
        { _id: invoice._id, shopId },
        {
          $push: {
            remindersSent: {
              type: schedule.type,
              sentAt: new Date(),
              preview: reminderPreview,
            },
          },
        },
      );
    }
  }
}

module.exports = {
  syncInvoiceReminders,
};
