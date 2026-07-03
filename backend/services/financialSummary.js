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

    if (paidAmount > 0) {
      collectedRevenue += paidAmount;

      if (monthKey) {
        monthlyCollected[monthKey] =
          numberOrZero(monthlyCollected[monthKey]) + paidAmount;
      }
    }

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

  return {
    totalBilled: Number(totalBilled.toFixed(2)),
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
  PENDING_BUCKET_STATUSES,
  getOutstandingAmount,
};
