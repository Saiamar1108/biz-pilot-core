const asyncHandler = require("../middlewares/asyncHandler");
const { getAnalyticsContext } = require("../utils/aiResponses");

const numberOrZero = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

exports.getAnalytics = asyncHandler(async (req, res) => {
  const ctx = await getAnalyticsContext();

  res.json({
    success: true,
    data: {
      totalSales: parseFloat(numberOrZero(ctx.totalSales).toFixed(2)),
      monthlyRevenue: Array.isArray(ctx.monthlyRevenue) ? ctx.monthlyRevenue : [],
      topProducts: ctx.topProducts.map((p) => ({
        id: p._id || p.id || "",
        name: p.name || "N/A",
        sku: p.sku || "",
        sold: numberOrZero(p.sold),
        revenue: parseFloat((numberOrZero(p.sold) * numberOrZero(p.price)).toFixed(2)),
        category: p.category || "General",
      })),
      lowStockItems: ctx.lowStockItems.map((p) => ({
        id: p._id || p.id || "",
        name: p.name || "N/A",
        sku: p.sku || "",
        stock: numberOrZero(p.stock),
        category: p.category || "General",
      })),
    },
  });
});
