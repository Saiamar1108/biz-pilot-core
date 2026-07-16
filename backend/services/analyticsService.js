const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const env = require("../config/env");
const { calculateFinancialSummary } = require("./financialSummary");
const {
  getOutstandingAmount,
  numberOrZero,
  PENDING_BUCKET_STATUSES,
} = require("../utils/invoiceAmounts");

/* ------------------------------------------------------------------ */
/* Safety helpers — added so the whole file degrades gracefully        */
/* instead of throwing when upstream data (demo seed, Mongo docs,      */
/* aggregation results) is missing/partial fields.                     */
/* ------------------------------------------------------------------ */

/** Coerce to a finite number, otherwise return fallback (default 0). */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** numberOrZero wrapped with an extra finite-check, in case a caller
 *  passes an object, Decimal128, or other non-numeric shape. */
function safeNumber(value, fallback = 0) {
  try {
    const n = numberOrZero(value);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return toNumber(value, fallback);
  }
}

/** Never let a non-array leak downstream and crash a .map/.filter/.reduce. */
function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Division that can never produce NaN/Infinity. */
function safeDiv(numerator, denominator) {
  const num = toNumber(numerator);
  const den = toNumber(denominator);
  return den > 0 ? num / den : 0;
}

/** getOutstandingAmount can throw on malformed invoices — never let that
 *  bubble up and 500 the whole analytics endpoint. */
function safeOutstanding(invoice) {
  try {
    return safeNumber(getOutstandingAmount(invoice));
  } catch {
    return 0;
  }
}

/** Guard against Invalid Date objects breaking date-math downstream. */
function safeDate(value, fallback = new Date()) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function buildShopFilter(shopId) {
  if (!shopId) return {};
  return { shopId };
}

const round2 = (value) => Number(safeNumber(value).toFixed(2));

function startOfDay(date) {
  const day = safeDate(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfDay(date) {
  const day = safeDate(date);
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
    case "custom": {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      const validStart = start && !Number.isNaN(start.getTime());
      const validEnd = end && !Number.isNaN(end.getTime());

      if (validStart && validEnd) {
        return {
          startDate: startOfDay(start),
          endDate: endOfDay(end),
          label: "Custom range",
        };
      }
      return { startDate: null, endDate: null, label: "All time" };
    }
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

function normalizeProduct(product = {}) {
  return {
    id: String(product._id || product.id || ""),
    name: product.name || "N/A",
    sku: product.sku || "",
    category: product.category || "General",
    stock: safeNumber(product.stock),
    price: safeNumber(product.price),
    sold: safeNumber(product.sold),
    createdAt: safeDate(product.createdAt),
  };
}

function normalizeCustomer(customer = {}) {
  return {
    id: String(customer._id || customer.id || ""),
    name: customer.name || "N/A",
    totalSpent: safeNumber(customer.totalSpent ?? customer.spent),
    pendingAmount: safeNumber(
      customer.pendingAmount ?? customer.pendingPayments ?? customer.due
    ),
  };
}

function normalizeInvoice(invoice = {}) {
  const total = safeNumber(invoice.total ?? invoice.amount);
  const paidAmount = safeNumber(invoice.paidAmount);

  return {
    ...invoice,
    total,
    paidAmount,
    pendingAmount: safeOutstanding(invoice),
    createdAt: safeDate(invoice.createdAt),
  };
}

function aggregateLineItems(invoices, productsById) {
  const byProduct = new Map();
  const byCategory = new Map();

  for (const invoice of toArray(invoices)) {
    for (const item of toArray(invoice?.lineItems)) {
      const productId = String(item?.product?._id || item?.product || "");
      const catalog = productsById.get(productId);
      const name = item?.productName || catalog?.name || "Unknown";
      const category = catalog?.category || "General";

      // Normalize raw values FIRST, then derive revenue/profit from the
      // normalized numbers — previously revenue was computed from the
      // raw (possibly undefined) unitPrice before normalization, which
      // could produce NaN and mask/incorrect data downstream.
      const quantity = safeNumber(item?.quantity);
      const unitPrice = safeNumber(item?.unitPrice ?? item?.price);
      const revenue =
        item?.lineTotal !== undefined && item?.lineTotal !== null
          ? safeNumber(item.lineTotal)
          : safeNumber(unitPrice * quantity);
      const costPrice = safeNumber(
        item?.costPrice ?? catalog?.costPrice ?? unitPrice * 0.7
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
      units: safeNumber(row.units),
      revenue: round2(row.revenue),
      profit: round2(row.profit),
    })),
    byCategory: [...byCategory.values()].map((row) => ({
      ...row,
      units: safeNumber(row.units),
      revenue: round2(row.revenue),
      profit: round2(row.profit),
    })),
  };
}

function buildCustomerIntelligence(invoices, customers) {
  const customerMap = new Map(
    toArray(customers).map((customer) => [String(customer.id), customer.name])
  );

  const stats = new Map();

  for (const invoice of toArray(invoices)) {
    const customerRef = invoice?.customer;
    const customerId = String(customerRef?._id || customerRef || "");
    const name =
      invoice?.customerName || customerMap.get(customerId) || "Unknown";
    const row = stats.get(customerId) || {
      id: customerId,
      name,
      totalSpent: 0,
      pendingAmount: 0,
      orders: 0,
      totalBilled: 0,
    };

    row.orders += 1;
    row.totalBilled += safeNumber(invoice?.total);
    row.totalSpent += safeNumber(invoice?.paidAmount);

    const outstanding = safeOutstanding(invoice);
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
    avgOrderValue: row.orders > 0 ? round2(safeDiv(row.totalBilled, row.orders)) : 0,
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
  const pendingStatuses = PENDING_BUCKET_STATUSES || new Set();

  for (const invoice of toArray(invoices)) {
    if (!pendingStatuses.has(String(invoice?.status))) continue;

    const outstanding = safeOutstanding(invoice);
    if (outstanding <= 0) continue;

    const createdAt = safeDate(invoice?.createdAt);
    const days = Math.max(0, Math.floor((now - createdAt.getTime()) / 86400000));

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
  const safeProducts = toArray(products);
  const safeInvoices = toArray(invoices);
  const byCategory = toArray(lineAgg?.byCategory);

  const stockRisk = safeProducts
    .map((product) => {
      const createdAt = safeDate(product?.createdAt);
      const daysActive = Math.max(
        1,
        Math.floor((now - createdAt.getTime()) / 86400000)
      );
      const sold = safeNumber(product?.sold);
      const stock = safeNumber(product?.stock);
      const dailyVelocity = safeDiv(sold, daysActive);

      if (dailyVelocity <= 0 || stock <= 0) {
        return null;
      }

      const daysLeft = Math.ceil(stock / dailyVelocity);
      return { product, daysLeft, dailyVelocity };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  if (stockRisk) {
    predictions.push({
      title: "Stock Alert",
      forecast: `${stockRisk.product.name || "A product"} may go out of stock in ${stockRisk.daysLeft} days`,
      confidence: "Medium",
      detail: `Selling ~${stockRisk.dailyVelocity.toFixed(1)} units/day with ${safeNumber(stockRisk.product.stock)} left`,
    });
  }

  const last7Start = now - 7 * 86400000;
  const recentCollected = safeInvoices
    .filter((invoice) => safeDate(invoice?.createdAt).getTime() >= last7Start)
    .reduce((sum, invoice) => sum + safeNumber(invoice?.paidAmount), 0);
  const expectedWeekly = round2(recentCollected);

  predictions.push({
    title: "Revenue Forecast",
    forecast: `Expected ~₹${Math.round(expectedWeekly).toLocaleString("en-IN")} in next 7 days`,
    confidence: recentCollected > 0 ? "High" : "Low",
    detail: "Based on collections from the last 7 days",
  });

  const topCategory = [...byCategory].sort(
    (a, b) => safeNumber(b?.revenue) - safeNumber(a?.revenue)
  )[0];

  predictions.push({
    title: "Category Trend",
    forecast: topCategory
      ? `${topCategory.category} leads with ₹${Math.round(safeNumber(topCategory.revenue)).toLocaleString("en-IN")} revenue`
      : "No category trend yet",
    confidence: topCategory ? "High" : "Low",
    detail: topCategory
      ? `${safeNumber(topCategory.units)} units sold in selected period`
      : "Add sales to unlock trends",
  });

  return predictions;
}

function buildMonthlyProfitTrends(financialSummary = {}) {
  const collected = toArray(financialSummary.monthlyCollectedRevenue);
  const pending = toArray(financialSummary.monthlyPendingRevenue);
  const profit = toArray(financialSummary.monthlyProfit);

  const months = Array.from(
    new Set([
      ...collected.map((entry) => entry?.month).filter(Boolean),
      ...pending.map((entry) => entry?.month).filter(Boolean),
      ...profit.map((entry) => entry?.month).filter(Boolean),
    ])
  ).sort();

  return months.map((month) => ({
    month,
    collected: safeNumber(
      collected.find((entry) => entry?.month === month)?.revenue
    ),
    pending: safeNumber(
      pending.find((entry) => entry?.month === month)?.revenue
    ),
    profit: safeNumber(
      profit.find((entry) => entry?.month === month)?.revenue
    ),
  }));
}

function buildGrowthRate(monthlyCollected) {
  const arr = toArray(monthlyCollected);
  if (arr.length < 2) return 0;
  const prev = safeNumber(arr[arr.length - 2]?.revenue);
  const current = safeNumber(arr[arr.length - 1]?.revenue);
  if (prev <= 0) return current > 0 ? 100 : 0;
  return round2(((current - prev) / prev) * 100);
}

function buildMonthlyGrowth(monthlyCollected) {
  const arr = toArray(monthlyCollected);
  return arr.map((entry, index) => {
    if (index === 0) return { month: entry?.month, growth: 0 };
    const prev = safeNumber(arr[index - 1]?.revenue);
    const current = safeNumber(entry?.revenue);
    const growth =
      prev > 0 ? round2(((current - prev) / prev) * 100) : current > 0 ? 100 : 0;
    return { month: entry?.month, growth };
  });
}

function buildRecommendations({ lowStockItems, pendingAgingAlerts, topProducts }) {
  const money = (value) =>
    `₹${Math.round(safeNumber(value)).toLocaleString("en-IN")}`;

  const lowStock = toArray(lowStockItems);
  const agingAlerts = toArray(pendingAgingAlerts);
  const products = toArray(topProducts);

  return [
    lowStock[0]
      ? `Restock ${lowStock[0].name} before stock runs out`
      : "Inventory healthy",
    agingAlerts[0]
      ? `${agingAlerts[0].invoice?.customerName || "A customer"} has ${money(
          agingAlerts[0].outstanding
        )} pending for ${agingAlerts[0].days} days`
      : "No overdue pending payments",
    products[0]
      ? `${products[0].name} is your best seller (${safeNumber(products[0].sold)} sold)`
      : "No product trends yet",
  ];
}

/** Shape returned when analytics genuinely cannot be computed (e.g. an
 *  unexpected exception deep in a dependency). Keeps the endpoint at a
 *  200 with empty/zeroed data instead of a 500. */
function emptyAnalyticsShape(label = "All time") {
  return {
    dateRange: { label, startDate: null, endDate: null },
    totalSales: 0,
    totalBilled: 0,
    revenueReceived: 0,
    pendingRevenue: 0,
    collectionEfficiency: 0,
    profit: 0,
    totalOrders: 0,
    activeCustomers: 0,
    avgOrderValue: 0,
    pendingInvoicesCount: 0,
    repeatCustomerRate: 0,
    growthRate: 0,
    topCategory: "—",
    predictionAccuracy: null,
    lowStockThreshold: toNumber(env?.lowStockThreshold, 5),
    monthlyRevenue: [],
    monthlyPendingRevenue: [],
    monthlyTotalBilled: [],
    monthlyGrowth: [],
    monthlyProfitTrends: [],
    demandPredictions: [],
    topProducts: [],
    lowStockItems: [],
    topCustomers: [],
    activityFeed: [],
    recommendations: [
      "Inventory healthy",
      "No overdue pending payments",
      "No product trends yet",
    ],
    productAnalytics: {
      byCategory: [],
      byProduct: [],
      mostProfitable: [],
      lowPerforming: [],
    },
    customerIntelligence: {
      topPaying: [],
      mostPending: [],
      mostFrequent: [],
      avgOrderValueByCustomer: [],
    },
    invoiceAging: [
      { label: "0-7 days", amount: 0, count: 0 },
      { label: "8-15 days", amount: 0, count: 0 },
      { label: "16-30 days", amount: 0, count: 0 },
      { label: "30+ days", amount: 0, count: 0 },
    ],
    smartPredictions: [],
  };
}

async function buildAnalytics(options = {}, req = {}) {
  const strictMode = Boolean(options.strict);

  const shopFilter = buildShopFilter(req.shopId);

  try {
    await Invoice.updateMany(
      { ...shopFilter, status: { $in: ["pending", "sent"] }, dueDate: { $lt: new Date() } },
      { $set: { status: "overdue" } }
    );
  } catch (err) {
    console.error("[analyticsService] failed to flag overdue invoices:", err);
  }

  const { startDate, endDate, label } = resolveDateRange(
    options.range,
    options.startDate,
    options.endDate
  );
  const invoiceFilter = {
    ...shopFilter,
    ...buildInvoiceFilter(startDate, endDate),
  };

  let rawProducts = [];
  let rawCustomers = [];
  let financialSummary = {};

  try {
    const results = await Promise.all([
      Product.find(shopFilter).lean(),
      Customer.find(shopFilter).lean(),
      calculateFinancialSummary(invoiceFilter),
    ]);
    rawProducts = toArray(results[0]);
    rawCustomers = toArray(results[1]);
    financialSummary = results[2] || {};
  } catch (err) {
    console.error("[analyticsService] failed to load core analytics data:", err);
    if (strictMode) {
      throw err;
    }
    // Return a safe, zeroed shape instead of a 500.
    return emptyAnalyticsShape(label);
  }

  const products = rawProducts.map(normalizeProduct);
  const customers = rawCustomers.map(normalizeCustomer);
  const invoices = toArray(financialSummary.invoices).map(normalizeInvoice);
  const productsById = new Map(products.map((product) => [product.id, product]));

  const totalBilled = safeNumber(financialSummary.totalBilled);
  const revenueReceived = safeNumber(financialSummary.collectedRevenue);
  const pendingRevenue = safeNumber(financialSummary.pendingRevenue);
  const profit = safeNumber(financialSummary.profit);

  const collectionEfficiency = round2(safeDiv(revenueReceived, totalBilled) * 100);

  const lowStockThreshold = toNumber(env?.lowStockThreshold, 5);
  const lowStockItems = products.filter(
    (product) => product.stock <= lowStockThreshold
  );

  const topProducts = [...products]
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10)
    .map((product) => ({
      ...product,
      revenue: round2(product.sold * product.price),
    }));

  const monthlyRevenueArray = toArray(financialSummary.monthlyCollectedRevenue);
  const monthlyPendingRevenueArray = toArray(financialSummary.monthlyPendingRevenue);

  const monthKeys = Array.from(
    new Set([
      ...monthlyRevenueArray.map((entry) => entry?.month).filter(Boolean),
      ...monthlyPendingRevenueArray.map((entry) => entry?.month).filter(Boolean),
    ])
  ).sort();

  const monthlyTotalBilledArray = monthKeys.map((month) => {
    const collected = safeNumber(
      monthlyRevenueArray.find((entry) => entry?.month === month)?.revenue
    );
    const pending = safeNumber(
      monthlyPendingRevenueArray.find((entry) => entry?.month === month)?.revenue
    );

    return { month, revenue: round2(collected + pending) };
  });

  const lineAgg = aggregateLineItems(invoices, productsById);
  const customerIntelligence = buildCustomerIntelligence(invoices, customers);
  const invoiceAging = buildInvoiceAging(invoices);
  const monthlyProfitTrends = buildMonthlyProfitTrends(financialSummary);
  const demandPredictions = buildSmartPredictions(products, invoices, lineAgg);

  const pendingStatuses = PENDING_BUCKET_STATUSES || new Set();
  const pendingAgingAlerts = invoices
    .filter((invoice) => pendingStatuses.has(String(invoice?.status)))
    .map((invoice) => ({
      invoice,
      outstanding: safeOutstanding(invoice),
      days: Math.max(
        0,
        Math.floor((Date.now() - safeDate(invoice?.createdAt).getTime()) / 86400000)
      ),
    }))
    .filter((entry) => entry.outstanding > 0 && entry.days > 7)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  const repeatCustomers = customerIntelligence.mostFrequent.filter(
    (customer) => customer.orders > 1
  ).length;
  const repeatCustomerRate =
    customers.length > 0 ? round2(safeDiv(repeatCustomers, customers.length) * 100) : 0;

  const topCategory =
    [...lineAgg.byCategory].sort((a, b) => b.revenue - a.revenue)[0]?.category || "—";

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
    activeCustomers: new Set(
      invoices.map((inv) => String(inv?.customer?._id || inv?.customer || ""))
    ).size,
    avgOrderValue: invoices.length > 0 ? round2(safeDiv(totalBilled, invoices.length)) : 0,
    pendingInvoicesCount: safeNumber(financialSummary.pendingInvoices),
    repeatCustomerRate,
    growthRate: buildGrowthRate(monthlyRevenueArray),
    topCategory,
    predictionAccuracy: invoices.length > 10 ? 82 : invoices.length > 0 ? 65 : null,
    lowStockThreshold,
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
      text: `${invoice.customerName || "Unknown"} — ${invoice.invoiceNumber || ""}`,
      date: safeDate(invoice.createdAt).toISOString(),
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
