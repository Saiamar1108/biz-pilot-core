const asyncHandler = require("../middlewares/asyncHandler");
const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const {
  getProductMovementAnalysis,
  getRestockPredictions,
  getExpiryAlerts,
  generatePurchaseOrder,
  getCategoryPerformance,
  getStockTurnoverRatio
} = require("../services/inventoryIntelligence");

exports.getInventoryInsights = asyncHandler(async (req, res) => {
  const products = await Product.find().lean();
  const invoices = await Invoice.find().lean();

  const [movementAnalysis, restockPredictions, expiryAlerts, categoryPerformance, stockTurnover] = await Promise.all([
    getProductMovementAnalysis(products),
    getRestockPredictions(products),
    getExpiryAlerts(products),
    getCategoryPerformance(products, invoices),
    getStockTurnoverRatio(products, invoices)
  ]);

  const insights = {
    movementAnalysis: {
      fastMoving: movementAnalysis.fastMoving.map(item => ({
        id: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        stock: item.product.stock,
        salesCount: item.salesCount,
        price: item.product.price
      })),
      slowMoving: movementAnalysis.slowMoving.map(item => ({
        id: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        stock: item.product.stock,
        salesCount: item.salesCount,
        daysSinceLastSale: item.daysSinceLastSale
      })),
      deadStock: movementAnalysis.deadStock.map(item => ({
        id: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        stock: item.product.stock,
        daysSinceLastSale: item.daysSinceLastSale
      })),
      bestSellers: movementAnalysis.bestSellers.map(item => ({
        id: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        stock: item.product.stock,
        salesCount: item.salesCount,
        revenue: item.salesCount * item.product.price
      }))
    },
    restockPredictions: restockPredictions.map(item => ({
      id: item.product._id,
      name: item.product.name,
      sku: item.product.sku,
      category: item.product.category,
      currentStock: item.currentStock,
      avgDailySales: item.avgDailySales,
      daysUntilStockout: item.daysUntilStockout,
      recommendedReorder: item.recommendedReorder,
      urgency: item.urgency
    })),
    expiryAlerts: {
      expired: expiryAlerts.expired.map(item => ({
        id: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        stock: item.product.stock,
        expiryDate: item.expiryDate,
        daysUntilExpiry: item.daysUntil
      })),
      critical: expiryAlerts.critical.map(item => ({
        id: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        stock: item.product.stock,
        expiryDate: item.expiryDate,
        daysUntilExpiry: item.daysUntil
      })),
      warning: expiryAlerts.warning.map(item => ({
        id: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        stock: item.product.stock,
        expiryDate: item.expiryDate,
        daysUntilExpiry: item.daysUntil
      }))
    },
    categoryPerformance,
    stockTurnoverRatio: stockTurnover.turnoverRatio
  };

  res.json({
    success: true,
    data: insights
  });
});

exports.getPurchaseOrder = asyncHandler(async (req, res) => {
  const products = await Product.find().lean();
  const purchaseOrder = await generatePurchaseOrder(products);

  res.json({
    success: true,
    data: purchaseOrder
  });
});

exports.getProductByBarcode = asyncHandler(async (req, res) => {
  const { barcode } = req.params;

  const product = await Product.findOne({ barcode }).lean();

  if (!product) {
    return res.json({
      success: false,
      found: false,
      message: "Product not found with this barcode"
    });
  }

  res.json({
    success: true,
    found: true,
    data: product
  });
});