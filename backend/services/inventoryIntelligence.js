const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const env = require("../config/env");

const numberOrZero = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

function getDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getExpiryStatus(expiryDate) {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  if (daysUntil === null) return null;
  if (daysUntil < 0) return "expired";
  if (daysUntil <= 7) return "critical";
  if (daysUntil <= 30) return "warning";
  return "good";
}

async function getProductMovementAnalysis(products, daysThreshold = 30) {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

  const recentInvoices = await Invoice.find({
    createdAt: { $gte: cutoffDate }
  }).lean();

  const productSales = new Map();
  const productLastSold = new Map();

  for (const invoice of recentInvoices) {
    for (const item of invoice.lineItems || []) {
      const productId = String(item.product);
      const quantity = numberOrZero(item.quantity);
      
      const current = productSales.get(productId) || 0;
      productSales.set(productId, current + quantity);
      
      const lastSold = productLastSold.get(productId) || new Date(0);
      if (new Date(invoice.createdAt) > lastSold) {
        productLastSold.set(productId, new Date(invoice.createdAt));
      }
    }
  }

  const analysis = products.map(product => {
    const productId = String(product._id);
    const salesCount = productSales.get(productId) || 0;
    const lastSold = productLastSold.get(productId) || null;
    const daysSinceLastSale = lastSold 
      ? Math.floor((now - lastSold) / (1000 * 60 * 60 * 24))
      : null;

    return {
      product,
      salesCount,
      daysSinceLastSale,
      movementType: classifyMovement(salesCount, daysSinceLastSale, daysThreshold)
    };
  });

  return {
    fastMoving: analysis.filter(item => item.movementType === "fast"),
    slowMoving: analysis.filter(item => item.movementType === "slow"),
    deadStock: analysis.filter(item => item.movementType === "dead"),
    bestSellers: [...analysis].sort((a, b) => b.salesCount - a.salesCount).slice(0, 10)
  };
}

function classifyMovement(salesCount, daysSinceLastSale, threshold) {
  if (daysSinceLastSale === null || daysSinceLastSale > threshold) {
    return "dead";
  }
  if (salesCount >= 10) return "fast";
  if (salesCount >= 3) return "normal";
  return "slow";
}

async function getRestockPredictions(products) {
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentInvoices = await Invoice.find({
    createdAt: { $gte: last30Days }
  }).lean();

  const productSales7Days = new Map();
  const productSales30Days = new Map();

  for (const invoice of recentInvoices) {
    for (const item of invoice.lineItems || []) {
      const productId = String(item.product);
      const quantity = numberOrZero(item.quantity);
      const invoiceDate = new Date(invoice.createdAt);

      if (invoiceDate >= last7Days) {
        productSales7Days.set(productId, (productSales7Days.get(productId) || 0) + quantity);
      }
      productSales30Days.set(productId, (productSales30Days.get(productId) || 0) + quantity);
    }
  }

  const predictions = products
    .filter(product => product.stock <= env.lowStockThreshold * 2)
    .map(product => {
      const productId = String(product._id);
      const sales7Days = productSales7Days.get(productId) || 0;
      const sales30Days = productSales30Days.get(productId) || 0;

      const avgDailySales7Days = sales7Days / 7;
      const avgDailySales30Days = sales30Days / 30;
      const avgDailySales = Math.max(avgDailySales7Days, avgDailySales30Days);

      const daysUntilStockout = avgDailySales > 0 
        ? Math.floor(product.stock / avgDailySales)
        : Infinity;

      const recommendedReorder = Math.ceil(avgDailySales * 30); // 30 days supply

      return {
        product,
        currentStock: product.stock,
        avgDailySales: Number(avgDailySales.toFixed(2)),
        daysUntilStockout: daysUntilStockout === Infinity ? null : daysUntilStockout,
        recommendedReorder,
        urgency: getUrgency(daysUntilStockout, product.stock)
      };
    })
    .sort((a, b) => (a.daysUntilStockout || Infinity) - (b.daysUntilStockout || Infinity));

  return predictions;
}

function getUrgency(daysUntilStockout, currentStock) {
  if (currentStock === 0) return "critical";
  if (daysUntilStockout === null) return "low";
  if (daysUntilStockout <= 2) return "critical";
  if (daysUntilStockout <= 7) return "high";
  if (daysUntilStockout <= 14) return "medium";
  return "low";
}

async function getExpiryAlerts(products) {
  const now = new Date();
  
  const expiryAnalysis = products
    .filter(product => product.expiryDate)
    .map(product => {
      const daysUntil = getDaysUntilExpiry(product.expiryDate);
      const status = getExpiryStatus(product.expiryDate);
      
      return {
        product,
        daysUntil,
        status,
        expiryDate: product.expiryDate
      };
    })
    .filter(item => item.status !== null && item.status !== "good")
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    expired: expiryAnalysis.filter(item => item.status === "expired"),
    critical: expiryAnalysis.filter(item => item.status === "critical"),
    warning: expiryAnalysis.filter(item => item.status === "warning")
  };
}

async function generatePurchaseOrder(lowStockProducts) {
  const predictions = await getRestockPredictions(lowStockProducts);
  
  const purchaseOrder = predictions
    .filter(item => item.urgency !== "low")
    .map(item => ({
      productName: item.product.name,
      sku: item.product.sku,
      category: item.product.category,
      currentStock: item.currentStock,
      recommendedQuantity: item.recommendedReorder,
      urgency: item.urgency,
      estimatedCost: item.recommendedReorder * (item.product.costPrice || item.product.price * 0.7)
    }));

  const totalEstimatedCost = purchaseOrder.reduce((sum, item) => sum + item.estimatedCost, 0);

  return {
    items: purchaseOrder,
    totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
    generatedAt: new Date()
  };
}

async function getCategoryPerformance(products, invoices) {
  const categoryRevenue = new Map();
  const categoryProfit = new Map();
  const categoryUnits = new Map();

  for (const invoice of invoices) {
    for (const item of invoice.lineItems || []) {
      const product = products.find(p => String(p._id) === String(item.product));
      if (!product) continue;

      const category = product.category;
      const revenue = numberOrZero(item.lineTotal);
      const quantity = numberOrZero(item.quantity);
      const costPrice = numberOrZero(item.costPrice || item.unitPrice * 0.7);
      const profit = revenue - (costPrice * quantity);

      categoryRevenue.set(category, (categoryRevenue.get(category) || 0) + revenue);
      categoryProfit.set(category, (categoryProfit.get(category) || 0) + profit);
      categoryUnits.set(category, (categoryUnits.get(category) || 0) + quantity);
    }
  }

  const performance = Array.from(categoryRevenue.keys()).map(category => ({
    category,
    revenue: Number(categoryRevenue.get(category).toFixed(2)),
    profit: Number(categoryProfit.get(category).toFixed(2)),
    unitsSold: categoryUnits.get(category) || 0,
    profitMargin: categoryRevenue.get(category) > 0 
      ? Number((categoryProfit.get(category) / categoryRevenue.get(category) * 100).toFixed(2))
      : 0
  })).sort((a, b) => b.revenue - a.revenue);

  return performance;
}

async function getStockTurnoverRatio(products, invoices) {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentInvoices = invoices.filter(inv => new Date(inv.createdAt) >= last30Days);
  
  const totalCOGS = recentInvoices.reduce((sum, invoice) => {
    let invoiceCOGS = 0;
    for (const item of invoice.lineItems || []) {
      const product = products.find(p => String(p._id) === String(item.product));
      if (!product) continue;
      const quantity = numberOrZero(item.quantity);
      const costPrice = numberOrZero(item.costPrice || item.unitPrice * 0.7);
      invoiceCOGS += costPrice * quantity;
    }
    return sum + invoiceCOGS;
  }, 0);

  const averageInventoryValue = products.reduce((sum, product) => {
    const costPrice = numberOrZero(product.costPrice || product.price * 0.7);
    return sum + (product.stock * costPrice);
  }, 0) / products.length;

  const turnoverRatio = averageInventoryValue > 0 
    ? Number((totalCOGS / averageInventoryValue).toFixed(2))
    : 0;

  return {
    turnoverRatio,
    totalCOGS: Number(totalCOGS.toFixed(2)),
    averageInventoryValue: Number(averageInventoryValue.toFixed(2)),
    period: "30 days"
  };
}

module.exports = {
  getDaysUntilExpiry,
  getExpiryStatus,
  getProductMovementAnalysis,
  getRestockPredictions,
  getExpiryAlerts,
  generatePurchaseOrder,
  getCategoryPerformance,
  getStockTurnoverRatio
};