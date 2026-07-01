const asyncHandler = require("../middlewares/asyncHandler");
const { getAnalyticsContext } = require("../utils/aiResponses");

exports.getAnalytics = asyncHandler(async (req, res) => {
  const ctx = await getAnalyticsContext();

  res.json({
    success: true,
    data: {
      totalSales: parseFloat(ctx.totalSales.toFixed(2)),
      monthlyRevenue: ctx.monthlyRevenue,
      topProducts: ctx.topProducts.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        sold: p.sold,
        revenue: parseFloat((p.sold * p.price).toFixed(2)),
        category: p.category,
      })),
      lowStockItems: ctx.lowStockItems.map((p) => ({
        id: p._id,
        name: p.name,
        sku: p.sku,
        stock: p.stock,
        category: p.category,
      })),
    },
  });
});
