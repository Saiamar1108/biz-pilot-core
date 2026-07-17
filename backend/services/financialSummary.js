const Invoice = require("../models/Invoice");
const {
  PENDING_BUCKET_STATUSES,
  getOutstandingAmount,
  numberOrZero,
} = require("../utils/invoiceAmounts");

function getDateKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function toMonthlySeries(bucket) {
  return Object.entries(bucket)
    .map(([month, revenue]) => ({
      month,
      revenue: Number(numberOrZero(revenue).toFixed(2)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function safeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfDay(value) {
  const date = safeDate(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
}

function resolvePeriod(period = {}) {
  const startDate = safeDate(period.startDate ?? period.start);
  const endDate = endOfDay(period.endDate ?? period.end);

  if (!startDate || !endDate) {
    return { startDate: null, endDate: null };
  }

  return { startDate, endDate };
}

async function sumRevenueForPeriod(storeId, period = {}) {
  const { startDate, endDate } = resolvePeriod(period);

  if (!startDate || !endDate) {
    return 0;
  }

  const filter = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  if (storeId) {
    filter.shopId = storeId;
  }

  const invoices = await Invoice.find(filter)
    .select("total amount paidAmount")
    .lean();

  const revenue = invoices.reduce(
    (sum, invoice) =>
      sum + numberOrZero(invoice?.paidAmount ?? invoice?.total ?? invoice?.amount),
    0,
  );

  return Number(revenue.toFixed(2));
}

async function compareRevenuePeriods(storeId, period1 = {}, period2 = {}) {
  const [period1Revenue, period2Revenue] = await Promise.all([
    sumRevenueForPeriod(storeId, period1),
    sumRevenueForPeriod(storeId, period2),
  ]);
  const delta = Number((period2Revenue - period1Revenue).toFixed(2));
  const percentChange =
    period1Revenue > 0 ? Number(((delta / period1Revenue) * 100).toFixed(2)) : null;

  return {
    storeId: storeId ? String(storeId) : null,
    period1: {
      ...resolvePeriod(period1),
      revenue: period1Revenue,
    },
    period2: {
      ...resolvePeriod(period2),
      revenue: period2Revenue,
    },
    delta,
    percentChange,
  };
}

async function calculateFinancialSummary(filter = {}) {
  const groupStage = {
    _id: null,
    totalBilled: { $sum: { $ifNull: ["$total", { $ifNull: ["$amount", 0] }] } },
    collectedRevenue: { $sum: { $ifNull: ["$paidAmount", 0] } },
    pendingRevenue: {
      $sum: {
        $cond: [
          {
            $and: [
              { $in: ["$status", ["pending", "partial", "overdue", "sent"]] },
              { $gt: [{ $ifNull: ["$pendingAmount", 0] }, 0] }
            ]
          },
          { $ifNull: ["$pendingAmount", 0] },
          0
        ]
      }
    },
    profit: {
      $sum: {
        $sum: {
          $map: {
            input: "$lineItems",
            as: "item",
            in: {
              $cond: [
                { $gt: [{ $ifNull: ["$$item.costPrice", 0] }, 0] },
                {
                  $multiply: [
                    { $subtract: [{ $ifNull: ["$$item.sellingPrice", { $ifNull: ["$$item.unitPrice", 0] }] }, { $ifNull: ["$$item.costPrice", 0] }] },
                    { $ifNull: ["$$item.quantity", 0] }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    },
    totalRevenue: {
      $sum: {
        $sum: {
          $map: {
            input: "$lineItems",
            as: "item",
            in: {
              $cond: [
                { $gt: [{ $ifNull: ["$$item.costPrice", 0] }, 0] },
                {
                  $multiply: [
                    { $ifNull: ["$$item.sellingPrice", { $ifNull: ["$$item.unitPrice", 0] }] },
                    { $ifNull: ["$$item.quantity", 0] }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    },
    totalCost: {
      $sum: {
        $sum: {
          $map: {
            input: "$lineItems",
            as: "item",
            in: {
              $cond: [
                { $gt: [{ $ifNull: ["$$item.costPrice", 0] }, 0] },
                {
                  $multiply: [
                    { $ifNull: ["$$item.costPrice", 0] },
                    { $ifNull: ["$$item.quantity", 0] }
                  ]
                },
                0
              ]
            }
          }
        }
      }
    },
    totalInvoices: { $sum: 1 },
    paidInvoices: {
      $sum: {
        $cond: [{ $eq: ["$status", "paid"] }, 1, 0]
      }
    },
    pendingInvoices: {
      $sum: {
        $cond: [
          {
            $and: [
              { $in: ["$status", ["pending", "partial", "overdue", "sent"]] },
              { $gt: [{ $ifNull: ["$pendingAmount", 0] }, 0] }
            ]
          },
          1,
          0
        ]
      }
    }
  };

  const overallResults = await Invoice.aggregate([
    { $match: filter },
    { $group: groupStage }
  ]);

  const summary = overallResults[0] || {
    totalBilled: 0,
    collectedRevenue: 0,
    pendingRevenue: 0,
    profit: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0
  };

  // Calculate the monthly series using aggregation
  const monthlyResults = await Invoice.aggregate([
    { $match: filter },
    {
      $project: {
        month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        total: { $ifNull: ["$total", { $ifNull: ["$amount", 0] }] },
        paidAmount: { $ifNull: ["$paidAmount", 0] },
        pendingAmount: { $ifNull: ["$pendingAmount", 0] },
        status: 1,
        invoiceProfit: {
          $sum: {
            $map: {
              input: "$lineItems",
              as: "item",
              in: {
                $cond: [
                  { $gt: [{ $ifNull: ["$$item.costPrice", 0] }, 0] },
                  {
                    $multiply: [
                      { $subtract: [{ $ifNull: ["$$item.sellingPrice", { $ifNull: ["$$item.unitPrice", 0] }] }, { $ifNull: ["$$item.costPrice", 0] }] },
                      { $ifNull: ["$$item.quantity", 0] }
                    ]
                  },
                  0
                ]
              }
            }
          }
        }
      }
    },
    {
      $group: {
        _id: "$month",
        collected: { $sum: "$paidAmount" },
        pending: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $in: ["$status", ["pending", "partial", "overdue", "sent"]] },
                  { $gt: ["$pendingAmount", 0] }
                ]
              },
              "$pendingAmount",
              0
            ]
          }
        },
        profit: { $sum: "$invoiceProfit" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const monthlyCollectedRevenue = [];
  const monthlyPendingRevenue = [];
  const monthlyProfit = [];

  for (const row of monthlyResults) {
    if (row._id) {
      monthlyCollectedRevenue.push({ month: row._id, revenue: Number(row.collected.toFixed(2)) });
      monthlyPendingRevenue.push({ month: row._id, revenue: Number(row.pending.toFixed(2)) });
      monthlyProfit.push({ month: row._id, revenue: Number(row.profit.toFixed(2)) });
    }
  }

  // Fetch invoices for downstream processing like aging, activity feed, customer intelligence
  const invoices = await Invoice.find(filter)
    .select(`
      invoiceNumber
      customer
      customerName
      total
      amount
      status
      createdAt
      paidAt
      paidAmount
      pendingAmount
      lineItems
    `)
    .sort({ createdAt: -1 })
    .lean();

  // Attach pre-calculated profit to each invoice object
  for (const invoice of invoices) {
    let invoiceProfit = 0;
    let hasCost = false;
    for (const item of invoice.lineItems || []) {
      if (item.costPrice && item.costPrice > 0) {
        hasCost = true;
        invoiceProfit += (Number(item.sellingPrice ?? item.unitPrice ?? item.price) - Number(item.costPrice)) * Number(item.quantity);
      }
    }
    invoice.profit = hasCost ? Number(invoiceProfit.toFixed(2)) : 0;
  }

  return {
    totalBilled: Number((summary.totalBilled || 0).toFixed(2)),
    collectedRevenue: Number((summary.collectedRevenue || 0).toFixed(2)),
    pendingRevenue: Number((summary.pendingRevenue || 0).toFixed(2)),
    profit: Number((summary.profit || 0).toFixed(2)),
    totalRevenue: Number((summary.totalRevenue || 0).toFixed(2)),
    totalCost: Number((summary.totalCost || 0).toFixed(2)),
    totalInvoices: summary.totalInvoices || 0,
    paidInvoices: summary.paidInvoices || 0,
    pendingInvoices: summary.pendingInvoices || 0,
    monthlyCollectedRevenue,
    monthlyPendingRevenue,
    monthlyProfit,
    invoices,
  };
}

module.exports = {
  calculateFinancialSummary,
  compareRevenuePeriods,
  PENDING_BUCKET_STATUSES,
  getOutstandingAmount,
};
