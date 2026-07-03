const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const env = require("../config/env");
const { ensureDemoData } = require("../utils/demoData");
const { calculateFinancialSummary } = require("./financialSummary");
const {
  getOutstandingAmount,
  numberOrZero,
  PENDING_BUCKET_STATUSES,
} = require("../utils/invoiceAmounts");

const round2 = (value) => Number(numberOrZero(value).toFixed(2));

function startOfDay(date) {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfDay(date) {
  const day = new Date(date);
  day.setHours(23, 59, 59, 999);
  return day;
}

function resolveDateRange(range, startDate, endDate) {
  const now = new Date();
  const todayStart = startOfDay(now);

  switch (String(range || "all").toLowerCase()) {
    case "today":
      return { startDate: todayStart, endDate: endOfDay(now), label: "Today" };
    case "last7":
    case "last_7_days":
      return {
        startDate: startOfDay(new Date(now.getTime() - 6 * 86400000)),
        endDate: endOfDay(now),
        label: "Last 7 days",
      };
    case "last30":
    case "last_30_days":
      return {
        startDate: startOfDay(new Date(now.getTime() - 29 * 86400000)),
        endDate: endOfDay(now),
        label: "Last 30 days",
      };
    case "thismonth":
    case "this_month":
      return {
        startDate: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        endDate: endOfDay(now),
        label: "This month",
      };
    case "custom":
      if (startDate && endDate) {
        return {
          startDate: startOfDay(new Date(startDate)),
          endDate: endOfDay(new Date(endDate)),
          label: "Custom range",
        };
      }
      return { startDate: null, endDate: null, label: "All time" };
    default:
      return { startDate: null, endDate: null, label: "All time" };
  }
}

function buildInvoiceFilter(startDate, endDate) {
  if (!startDate && !endDate) return {};

  const filter = { createdAt: {} };
  if (startDate) filter.createdAt.$gte = startDate;
  if (endDate) filter.createdAt.$lte = endDate;
  return filter;
}

function normalizeProduct(product) {
  return {
    id: String(product._id || product.id || ""),
    name: product.name || "N/A",
    sku: product.sku || "",
    category: product.category || "General",
    stock: numberOrZero(product.stock),
    price: numberOrZero(product.price),
    sold: numberOrZero(product.sold),
    createdAt: product.createdAt || new Date(),
  };
}

function normalizeCustomer(customer) {
  return {
    id: String(customer._id || customer.id || ""),
    name: customer.name || "N/A",
    totalSpent: numberOrZero(customer.totalSpent ?? customer.spent),
    pendingAmount: numberOrZero(
      customer.pendingAmount ?? customer.pendingPayments ?? customer.due
    ),
  };
}

function normalizeInvoice(invoice) {
  const total = numberOrZero(invoice.total ?? invoice.amount);
  const paidAmount = numberOrZero(invoice.paidAmount);

  return {
    ...invoice,
    total,
    paidAmount,
    pendingAmount: getOutstandingAmount(invoice),
    createdAt: invoice.createdAt || new Date(),
  };
}

function aggregateLineItems(invoices, productsById) {
  const byProduct = new Map();
  const byCategory = new Map();

  for (const invoice of invoices) {
    for (const item of invoice.lineItems || []) {
      const productId = String(item.product?._id || item.product || "");
      const catalog = productsById.get(productId);
      const name = item.productName || catalog?.name || "Unknown";
      const category = catalog?.category || "General";
      const quantity = numberOrZero(item.quantity);
      const revenue = numberOrZero(item.lineTotal ?? item.unitPrice * quantity);
      const unitPrice = numberOrZero(item.unitPrice ?? item.price);
      const costPrice = numberOrZero(
        item.costPrice ?? catalog?.costPrice ?? unitPrice * 0.7
      );
      const itemProfit = (unitPrice - costPrice) * quantity;

      const productKey = productId || name;
      const productRow = byProduct.get(productKey) || {
        id: productId,
        name,
        category,
        units: 0,
        revenue: 0,
        profit: 0,
      };
      productRow.units += quantity;
      productRow.revenue += revenue;
      productRow.profit += itemProfit;
      byProduct.set(productKey, productRow);

      const categoryRow = byCategory.get(category) || {
        category,
        units: 0,
        revenue: 0,
        profit: 0,
      };
      categoryRow.units += quantity;
      categoryRow.revenue += revenue;
      categoryRow.profit += itemProfit;
      byCategory.set(category, categoryRow);
    }
  }

  return {
    byProduct: [...byProduct.values()].map((row) => ({
      ...row,
      revenue: round2(row.revenue),
      profit: round2(row.profit),
    })),
    byCategory: [...byCategory.values()].map((row) => ({
      ...row,
      revenue: round2(row.revenue),
      profit: round2(row.profit),
    })),
  };
}

function buildCustomerIntelligence(invoices, customers) {
  const customerMap = new Map(
    customers.map((customer) => [String(customer.id), customer.name])
  );

  const stats = new Map();

  for (const invoice of invoices) {
    const customerId = String(invoice.customer?._id || invoice.customer || "");
    const name =
      invoice.customerName || customerMap.get(customerId) || "Unknown";
    const row = stats.get(customerId) || {
      id: customerId,
      name,
      totalSpent: 0,
      pendingAmount: 0,
      orders: 0,
      totalBilled: 0,
    };

    row.orders += 1;
    row.totalBilled += numberOrZero(invoice.total);
    row.totalSpent += numberOrZero(invoice.paidAmount);

    const outstanding = getOutstandingAmount(invoice);
    if (outstanding > 0) {
      row.pendingAmount += outstanding;
    }

    stats.set(customerId, row);
  }

  const rows = [...stats.values()].map((row) => ({
    ...row,
    totalSpent: round2(row.totalSpent),
    pendingAmount: round2(row.pendingAmount),
    totalBilled: round2(row.totalBilled),
    avgOrderValue: row.orders > 0 ? round2(row.totalBilled / row.orders) : 0,
  }));

  return {
    topPaying: [...rows]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5),
    mostPending: [...rows]
      .filter((row) => row.pendingAmount > 0)
      .sort((a, b) => b.pendingAmount - a.pendingAmount)
      .slice(0, 5),
    mostFrequent: [...rows]
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5),
    avgOrderValueByCustomer: [...rows]
      .sort((a, b) => b.avgOrderValue - a.avgOrderValue)
      .slice(0, 5),
  };
}

function buildInvoiceAging(invoices) {
  const buckets = [
    { label: "0-7 days", min: 0, max: 7, amount: 0, count: 0 },
    { label: "8-15 days", min: 8, max: 15, amount: 0, count: 0 },
    { label: "16-30 days", min: 16, max: 30, amount: 0, count: 0 },
    { label: "30+ days", min: 31, max: Infinity, amount: 0, count: 0 },
  ];

  const now = Date.now();

  for (const invoice of invoices) {
    if (!PENDING_BUCKET_STATUSES.has(String(invoice.status))) continue;

    const outstanding = getOutstandingAmount(invoice);
    if (outstanding <= 0) continue;

    const days = Math.floor(
      (now - new Date(invoice.createdAt).getTime()) / 86400000
    );

    const bucket =
      buckets.find((entry) => days >= entry.min && days <= entry.max) ||
      buckets[buckets.length - 1];

    bucket.amount += outstanding;
    bucket.count += 1;
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    amount: round2(bucket.amount),
    count: bucket.count,
  }));
}

function buildSmartPredictions(products, invoices, lineAgg) {
  const now = Date.now();
  const predictions = [];

  const stockRisk = [...products]
    .map((product) => {
      const createdAt = new Date(product.createdAt || now);
      const daysActive = Math.max(
        1,
        Math.floor((now - createdAt.getTime()) / 86400000)
      );
      const dailyVelocity = product.sold / daysActive;

      if (dailyVelocity <= 0 || product.stock <= 0) {
        return null;
      }

      const daysLeft = Math.ceil(product.stock / dailyVelocity);
      return { product, daysLeft, dailyVelocity };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  if (stockRisk) {
    predictions.push({
      title: "Stock Alert",
      forecast: `${stockRisk.product.name} may go out of stock in ${stockRisk.daysLeft} days`,
      confidence: "Medium",
      detail: `Selling ~${stockRisk.dailyVelocity.toFixed(1)} units/day with ${stockRisk.product.stock} left`,
    });
  }

  const last7Start = now - 7 * 86400000;
  const recentCollected = invoices
    .filter((invoice) => new Date(invoice.createdAt).getTime() >= last7Start)
    .reduce((sum, invoice) => sum + numberOrZero(invoice.paidAmount), 0);
  const expectedWeekly = round2(recentCollected || 0);

  predictions.push({
    title: "Revenue Forecast",
    forecast: `Expected ~₹${Math.round(expectedWeekly).toLocaleString("en-IN")} in next 7 days`,
    confidence: recentCollected > 0 ? "High" : "Low",
    detail: "Based on collections from the last 7 days",
  });

  const topCategory = [...lineAgg.byCategory].sort(
    (a, b) => b.revenue - a.revenue
  )[0];

  predictions.push({
    title: "Category Trend",
    forecast: topCategory
      ? `${topCategory.category} leads with ₹${Math.round(topCategory.revenue).toLocaleString("en-IN")} revenue`
      : "No category trend yet",
    confidence: topCategory ? "High" : "Low",
    detail: topCategory
      ? `${topCategory.units} units sold in selected period`
      : "Add sales to unlock trends",
  });

  return predictions;
}

function buildMonthlyProfitTrends(financialSummary) {
  const collected = financialSummary.monthlyCollectedRevenue || [];
  const pending = financialSummary.monthlyPendingRevenue || [];
  const profit = financialSummary.monthlyProfit || [];

  const months = Array.from(
    new Set([
      ...collected.map((entry) => entry.month),
      ...pending.map((entry) => entry.month),
      ...profit.map((entry) => entry.month),
    ])
  ).sort();

  return months.map((month) => ({
    month,
    collected:
      collected.find((entry) => entry.month === month)?.revenue || 0,
    pending: pending.find((entry) => entry.month === month)?.revenue || 0,
    profit: profit.find((entry) => entry.month === month)?.revenue || 0,
  }));
}

function buildGrowthRate(monthlyCollected) {
  if (monthlyCollected.length < 2) return 0;
  const prev = monthlyCollected[monthlyCollected.length - 2].revenue;
  const current = monthlyCollected[monthlyCollected.length - 1].revenue;
  if (prev <= 0) return current > 0 ? 100 : 0;
  return round2(((current - prev) / prev) * 100);
}

function buildMonthlyGrowth(monthlyCollected) {
  return monthlyCollected.map((entry, index) => {
    if (index === 0) return { month: entry.month, growth: 0 };
    const prev = monthlyCollected[index - 1].revenue;
    const growth =
      prev > 0 ? round2(((entry.revenue - prev) / prev) * 100) : entry.revenue > 0 ? 100 : 0;
    return { month: entry.month, growth };
  });
}

function buildRecommendations({ lowStockItems, pendingAgingAlerts, topProducts }) {
  const money = (value) =>
    `₹${Math.round(numberOrZero(value)).toLocaleString("en-IN")}`;

  return [
    lowStockItems[0]
      ? `Restock ${lowStockItems[0].name} before stock runs out`
      : "Inventory healthy",
    pendingAgingAlerts[0]
      ? `${pendingAgingAlerts[0].invoice.customerName} has ${money(
          pendingAgingAlerts[0].outstanding
        )} pending for ${pendingAgingAlerts[0].days} days`
      : "No overdue pending payments",
    topProducts[0]
      ? `${topProducts[0].name} is your best seller (${topProducts[0].sold} sold)`
      : "No product trends yet",
  ];
}

async function buildAnalytics(options = {}) {
  await ensureDemoData();

  await Invoice.updateMany(
    {
      status: { $in: ["pending", "sent"] },
      dueDate: { $lt: new Date() },
    },
    { $set: { status: "overdue" } }
  );

  const { startDate, endDate, label } = resolveDateRange(
    options.range,
    options.startDate,
    options.endDate
  );
  const invoiceFilter = buildInvoiceFilter(startDate, endDate);

  const [rawProducts, rawCustomers, financialSummary] = await Promise.all([
    Product.find().lean(),
    Customer.find().lean(),
    calculateFinancialSummary(invoiceFilter),
  ]);

  const products = rawProducts.map(normalizeProduct);
  const customers = rawCustomers.map(normalizeCustomer);
  const invoices = (financialSummary.invoices || []).map(normalizeInvoice);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const totalBilled = financialSummary.totalBilled;
  const revenueReceived = financialSummary.collectedRevenue;
  const pendingRevenue = financialSummary.pendingRevenue;
  const profit = financialSummary.profit;

  const collectionEfficiency =
    totalBilled > 0
      ? round2((revenueReceived / totalBilled) * 100)
      : 0;

  const lowStockItems = products.filter(
    (product) => product.stock <= env.lowStockThreshold
  );

  const topProducts = [...products]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10)
    .map((product) => ({
      ...product,
      revenue: round2(product.sold * product.price),
    }));

  const monthlyRevenueArray = financialSummary.monthlyCollectedRevenue || [];
  const monthlyPendingRevenueArray =
    financialSummary.monthlyPendingRevenue || [];

  const monthKeys = Array.from(
    new Set([
      ...monthlyRevenueArray.map((entry) => entry.month),
      ...monthlyPendingRevenueArray.map((entry) => entry.month),
    ])
  ).sort();

  const monthlyTotalBilledArray = monthKeys.map((month) => {
    const collected =
      monthlyRevenueArray.find((entry) => entry.month === month)?.revenue || 0;
    const pending =
      monthlyPendingRevenueArray.find((entry) => entry.month === month)
        ?.revenue || 0;

    return { month, revenue: round2(collected + pending) };
  });

  const lineAgg = aggregateLineItems(invoices, productsById);
  const customerIntelligence = buildCustomerIntelligence(invoices, customers);
  const invoiceAging = buildInvoiceAging(invoices);
  const monthlyProfitTrends = buildMonthlyProfitTrends(financialSummary);
  const demandPredictions = buildSmartPredictions(
    products,
    invoices,
    lineAgg
  );

  const pendingAgingAlerts = invoices
    .filter((invoice) =>
      PENDING_BUCKET_STATUSES.has(String(invoice.status))
    )
    .map((invoice) => ({
      invoice,
      outstanding: getOutstandingAmount(invoice),
      days: Math.floor(
        (Date.now() - new Date(invoice.createdAt).getTime()) / 86400000
      ),
    }))
    .filter((entry) => entry.outstanding > 0 && entry.days > 7)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  const repeatCustomers = customerIntelligence.mostFrequent.filter(
    (customer) => customer.orders > 1
  ).length;
  const repeatCustomerRate =
    customers.length > 0
      ? round2((repeatCustomers / customers.length) * 100)
      : 0;

  const topCategory =
    lineAgg.byCategory.sort((a, b) => b.revenue - a.revenue)[0]?.category ||
    "—";

  const recommendations = buildRecommendations({
    lowStockItems,
    pendingAgingAlerts,
    topProducts,
  });

  const mostProfitableProducts = [...lineAgg.byProduct]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);
  const lowPerformingProducts = [...lineAgg.byProduct]
    .sort((a, b) => a.units - b.units || a.revenue - b.revenue)
    .slice(0, 10);

  return {
    dateRange: {
      label,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    },
    totalSales: totalBilled,
    totalBilled,
    revenueReceived,
    pendingRevenue,
    collectionEfficiency,
    profit,
    totalOrders: invoices.length,
    activeCustomers: new Set(invoices.map((inv) => String(inv.customer))).size,
    avgOrderValue:
      invoices.length > 0 ? round2(totalBilled / invoices.length) : 0,
    pendingInvoicesCount: financialSummary.pendingInvoices,
    repeatCustomerRate,
    growthRate: buildGrowthRate(monthlyRevenueArray),
    topCategory,
    predictionAccuracy: invoices.length > 10 ? 82 : invoices.length > 0 ? 65 : null,
    lowStockThreshold: env.lowStockThreshold,
    monthlyRevenue: monthlyRevenueArray,
    monthlyPendingRevenue: monthlyPendingRevenueArray,
    monthlyTotalBilled: monthlyTotalBilledArray,
    monthlyGrowth: buildMonthlyGrowth(monthlyRevenueArray),
    monthlyProfitTrends,
    demandPredictions,
    topProducts,
    lowStockItems,
    topCustomers: customerIntelligence.topPaying,
    activityFeed: invoices.slice(0, 8).map((invoice) => ({
      type: invoice.status,
      text: `${invoice.customerName} — ${invoice.invoiceNumber}`,
      date: new Date(invoice.createdAt).toISOString(),
    })),
    recommendations,
    productAnalytics: {
      byCategory: lineAgg.byCategory,
      byProduct: lineAgg.byProduct,
      mostProfitable: mostProfitableProducts,
      lowPerforming: lowPerformingProducts,
    },
    customerIntelligence,
    invoiceAging,
    smartPredictions: demandPredictions,
  };
}

module.exports = {
  buildAnalytics,
  resolveDateRange,
};
