const asyncHandler = require("../middlewares/asyncHandler");
const { buildAnalytics } = require("../services/analyticsService");

const safeNumber = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (value) => Number(safeNumber(value).toFixed(2));

const mapMonthlySeries = (series) =>
  Array.isArray(series)
    ? series.map((item) => ({
        month: item.month || item.label || "",
        revenue: round2(item.revenue ?? item.amount),
      }))
    : [];

const mapProfitTrends = (series) =>
  Array.isArray(series)
    ? series.map((item) => ({
        month: item.month || "",
        collected: round2(item.collected),
        pending: round2(item.pending),
        profit: round2(item.profit),
      }))
    : [];

exports.getAnalytics = asyncHandler(async (req, res) => {
  const { range, startDate, endDate } = req.query;

  const ctx = await buildAnalytics({ range, startDate, endDate });

  const analytics = {
    dateRange: ctx.dateRange,
    totalSales: round2(ctx.totalSales),
    totalBilled: round2(ctx.totalBilled),
    revenueReceived: round2(ctx.revenueReceived),
    pendingRevenue: round2(ctx.pendingRevenue),
    collectionEfficiency: safeNumber(ctx.collectionEfficiency),
    profit: round2(ctx.profit),
    totalOrders: safeNumber(ctx.totalOrders),
    activeCustomers: safeNumber(ctx.activeCustomers),
    avgOrderValue: round2(ctx.avgOrderValue),
    pendingInvoicesCount: safeNumber(ctx.pendingInvoicesCount),
    repeatCustomerRate: safeNumber(ctx.repeatCustomerRate),
    growthRate: safeNumber(ctx.growthRate),
    topCategory: ctx.topCategory || "—",
    predictionAccuracy:
      ctx.predictionAccuracy == null ? null : safeNumber(ctx.predictionAccuracy),
    lowStockThreshold: safeNumber(ctx.lowStockThreshold),
    monthlyRevenue: mapMonthlySeries(ctx.monthlyRevenue),
    monthlyPendingRevenue: mapMonthlySeries(ctx.monthlyPendingRevenue),
    monthlyTotalBilled: mapMonthlySeries(ctx.monthlyTotalBilled),
    monthlyGrowth: Array.isArray(ctx.monthlyGrowth)
      ? ctx.monthlyGrowth.map((item) => ({
          month: item.month || item.label || "",
          growth: safeNumber(item.growth ?? item.value),
        }))
      : [],
    monthlyProfitTrends: mapProfitTrends(ctx.monthlyProfitTrends),
    demandPredictions: Array.isArray(ctx.demandPredictions)
      ? ctx.demandPredictions.map((item) => ({
          title: item.title || "N/A",
          forecast: item.forecast ?? String(item.value ?? "—"),
          confidence: item.confidence ?? "Live",
          detail: item.detail || "",
        }))
      : [],
    topProducts: Array.isArray(ctx.topProducts)
      ? ctx.topProducts.map((p) => ({
          id: p.id || p._id || "",
          name: p.name || "N/A",
          sku: p.sku || "",
          sold: safeNumber(p.sold),
          revenue: round2(p.revenue ?? safeNumber(p.sold) * safeNumber(p.price)),
          category: p.category || "General",
        }))
      : [],
    lowStockItems: Array.isArray(ctx.lowStockItems)
      ? ctx.lowStockItems.map((p) => ({
          id: p.id || p._id || "",
          name: p.name || "N/A",
          sku: p.sku || "",
          stock: safeNumber(p.stock),
          category: p.category || "General",
        }))
      : [],
    topCustomers: Array.isArray(ctx.topCustomers)
      ? ctx.topCustomers.map((c) => ({
          id: c.id || c._id || "",
          name: c.name || "N/A",
          totalSpent: round2(c.totalSpent ?? c.spent),
          pendingAmount: round2(c.pendingAmount ?? c.due),
        }))
      : [],
    productAnalytics: {
      byCategory: (ctx.productAnalytics?.byCategory || []).map((row) => ({
        category: row.category || "General",
        units: safeNumber(row.units),
        revenue: round2(row.revenue),
        profit: round2(row.profit),
      })),
      byProduct: (ctx.productAnalytics?.byProduct || []).map((row) => ({
        id: row.id || "",
        name: row.name || "N/A",
        category: row.category || "General",
        units: safeNumber(row.units),
        revenue: round2(row.revenue),
        profit: round2(row.profit),
      })),
      mostProfitable: (ctx.productAnalytics?.mostProfitable || []).map((row) => ({
        id: row.id || "",
        name: row.name || "N/A",
        category: row.category || "General",
        units: safeNumber(row.units),
        revenue: round2(row.revenue),
        profit: round2(row.profit),
      })),
      lowPerforming: (ctx.productAnalytics?.lowPerforming || []).map((row) => ({
        id: row.id || "",
        name: row.name || "N/A",
        category: row.category || "General",
        units: safeNumber(row.units),
        revenue: round2(row.revenue),
        profit: round2(row.profit),
      })),
    },
    customerIntelligence: {
      topPaying: (ctx.customerIntelligence?.topPaying || []).map((c) => ({
        id: c.id || "",
        name: c.name || "N/A",
        totalSpent: round2(c.totalSpent),
        pendingAmount: round2(c.pendingAmount),
        orders: safeNumber(c.orders),
        avgOrderValue: round2(c.avgOrderValue),
      })),
      mostPending: (ctx.customerIntelligence?.mostPending || []).map((c) => ({
        id: c.id || "",
        name: c.name || "N/A",
        totalSpent: round2(c.totalSpent),
        pendingAmount: round2(c.pendingAmount),
        orders: safeNumber(c.orders),
        avgOrderValue: round2(c.avgOrderValue),
      })),
      mostFrequent: (ctx.customerIntelligence?.mostFrequent || []).map((c) => ({
        id: c.id || "",
        name: c.name || "N/A",
        totalSpent: round2(c.totalSpent),
        pendingAmount: round2(c.pendingAmount),
        orders: safeNumber(c.orders),
        avgOrderValue: round2(c.avgOrderValue),
      })),
      avgOrderValueByCustomer: (
        ctx.customerIntelligence?.avgOrderValueByCustomer || []
      ).map((c) => ({
        id: c.id || "",
        name: c.name || "N/A",
        totalSpent: round2(c.totalSpent),
        pendingAmount: round2(c.pendingAmount),
        orders: safeNumber(c.orders),
        avgOrderValue: round2(c.avgOrderValue),
      })),
    },
    invoiceAging: (ctx.invoiceAging || []).map((bucket) => ({
      label: bucket.label,
      amount: round2(bucket.amount),
      count: safeNumber(bucket.count),
    })),
    smartPredictions: (ctx.smartPredictions || ctx.demandPredictions || []).map(
      (item) => ({
        title: item.title || "N/A",
        forecast: item.forecast ?? "—",
        confidence: item.confidence ?? "Live",
        detail: item.detail || "",
      })
    ),
    activityFeed: Array.isArray(ctx.activityFeed) ? ctx.activityFeed : [],
    recommendations: Array.isArray(ctx.recommendations) ? ctx.recommendations : [],
    purchaseOrder: Array.isArray(ctx.purchaseOrder)
      ? ctx.purchaseOrder.map((item) => ({
          id: item.id || "",
          name: item.name || "N/A",
          sku: item.sku || "",
          category: item.category || "General",
          currentStock: safeNumber(item.currentStock),
          avgDailySales: round2(item.avgDailySales),
          totalSoldLast30Days: safeNumber(item.totalSoldLast30Days),
          daysOfStock: item.daysOfStock == null ? null : round2(item.daysOfStock),
          recommendedQty: safeNumber(item.recommendedQty),
          urgency: item.urgency || "Low",
          confidence: safeNumber(item.confidence),
          confidenceLabel: item.confidenceLabel || "Low",
          reason: item.reason || "",
        }))
      : [],
  };

  res.status(200).json({
    success: true,
    data: analytics,
  });
});
