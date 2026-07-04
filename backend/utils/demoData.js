const Invoice = require("../models/Invoice");

async function normalizeInvoiceFinancials() {
  const legacyTotal = { $ifNull: ["$total", "$amount", 0] };

  await Invoice.updateMany(
    { $or: [{ total: { $exists: false } }, { total: null }, { total: { $lte: 0 } }] },
    [{ $set: { total: legacyTotal } }],
  );

  await Invoice.updateMany(
    {
      status: "paid",
      $or: [
        { paidAmount: { $exists: false } },
        { paidAmount: { $lte: 0 } },
        { pendingAmount: { $exists: false } },
        { pendingAmount: { $gt: 0 } },
      ],
    },
    [
      {
        $set: {
          paidAmount: legacyTotal,
          pendingAmount: 0,
          paidAt: { $ifNull: ["$paidAt", "$createdAt"] },
        },
      },
    ],
  );

  await Invoice.updateMany({ status: "partial" }, [
    {
      $set: {
        paidAmount: { $max: [0, { $min: ["$paidAmount", legacyTotal] }] },
      },
    },
    {
      $set: {
        pendingAmount: { $max: [0, { $subtract: [legacyTotal, "$paidAmount"] }] },
        paidAt: { $ifNull: ["$paidAt", "$updatedAt"] },
      },
    },
  ]);

  await Invoice.updateMany({ status: { $in: ["pending", "sent", "overdue"] } }, [
    {
      $set: {
        paidAmount: { $max: [0, { $min: ["$paidAmount", legacyTotal] }] },
        pendingAmount: { $max: [0, { $subtract: [legacyTotal, "$paidAmount"] }] },
      },
    },
  ]);
}

async function ensureDemoData(shopId) {
  // Demo data seeding disabled - no hardcoded data
  return Promise.resolve();
}

module.exports = {
  ensureDemoData,
  normalizeInvoiceFinancials,
};
