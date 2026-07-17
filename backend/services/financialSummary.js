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
  const invoices = await Invoice.find(filter)
    .select(
      `
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
    `
    )
    .lean();

  let totalBilled = 0;
  let collectedRevenue = 0;
  let pendingRevenue = 0;
  let profit = 0;
  let paidInvoices = 0;
  let pendingInvoices = 0;

  const monthlyCollected = {};
  const monthlyPending = {};
  const monthlyProfit = {};

  for (const invoice of invoices) {
    const total = numberOrZero(invoice.total ?? invoice.amount);
    const paidAmount = numberOrZero(invoice.paidAmount);
    const outstanding = getOutstandingAmount(invoice);

    totalBilled += total;

    const monthKey = getDateKey(invoice.createdAt);

    // Collected revenue includes all partial and full payments
    if (paidAmount > 0) {
      collectedRevenue += paidAmount;

      if (monthKey) {
        monthlyCollected[monthKey] =
          numberOrZero(monthlyCollected[monthKey]) + paidAmount;
      }
    }

    // Pending revenue includes overdue invoices and outstanding amounts
    if (PENDING_BUCKET_STATUSES.has(String(invoice.status)) && outstanding > 0) {
      pendingRevenue += outstanding;
      pendingInvoices += 1;

      if (monthKey) {
        monthlyPending[monthKey] =
          numberOrZero(monthlyPending[monthKey]) + outstanding;
      }
    }

    if (String(invoice.status) === "paid") {
      paidInvoices += 1;
    }

    let invoiceProfit = 0;

    for (const item of invoice.lineItems || []) {
      const quantity = numberOrZero(item.quantity);
      const sellingPrice = numberOrZero(item.unitPrice ?? item.price);
      const costPrice = numberOrZero(item.costPrice ?? sellingPrice * 0.7);
      invoiceProfit += (sellingPrice - costPrice) * quantity;
    }

    profit += invoiceProfit;

    if (monthKey) {
      monthlyProfit[monthKey] =
        numberOrZero(monthlyProfit[monthKey]) + invoiceProfit;
    }
  }

  // Ensure consistency: Total Billed = Collected + Pending
  const calculatedTotal = Number((collectedRevenue + pendingRevenue).toFixed(2));
  const finalTotalBilled = Math.abs(totalBilled - calculatedTotal) < 0.01 ? calculatedTotal : totalBilled;

  return {
    totalBilled: Number(finalTotalBilled.toFixed(2)),
    collectedRevenue: Number(collectedRevenue.toFixed(2)),
    pendingRevenue: Number(pendingRevenue.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    totalInvoices: invoices.length,
    paidInvoices,
    pendingInvoices,
    monthlyCollectedRevenue: toMonthlySeries(monthlyCollected),
    monthlyPendingRevenue: toMonthlySeries(monthlyPending),
    monthlyProfit: toMonthlySeries(monthlyProfit),
    invoices,
  };
}

module.exports = {
  calculateFinancialSummary,
  compareRevenuePeriods,
  PENDING_BUCKET_STATUSES,
  getOutstandingAmount,
};
