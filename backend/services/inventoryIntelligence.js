const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const env = require("../config/env");

const numberOrZero = (value) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

function buildShopFilter(storeId) {
  return storeId ? { shopId: storeId } : {};
}

function getProductReorderThreshold(product = {}) {
  return numberOrZero(
    product.reorderThreshold ?? product.lowStockThreshold ?? env.lowStockThreshold,
  );
}

function safeDate(value, fallback = new Date()) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function toDateKey(value) {
  return safeDate(value).toISOString().slice(0, 10);
}

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

async function getLowStockProducts(storeId) {
  const products = await Product.find(buildShopFilter(storeId)).lean();

  return toArray(products)
    .filter((product) => {
      const stock = numberOrZero(product?.stock);
      const reorderThreshold = getProductReorderThreshold(product);
      return stock <= reorderThreshold;
    })
    .map((product) => ({
      ...product,
      stock: numberOrZero(product?.stock),
      reorderThreshold: getProductReorderThreshold(product),
    }));
}

async function predictDemand(productId) {
  if (!productId) {
    return {
      productId: null,
      periodDays: 30,
      totalQuantitySold: 0,
      averageDailyDemand: 0,
      projectedNext30Days: 0,
      dailySales: [],
    };
  }

  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const invoices = await Invoice.find({
    createdAt: { $gte: startDate, $lte: now },
    "lineItems.product": productId,
  })
    .select("createdAt lineItems")
    .lean();

  const salesByDay = new Map();
  let totalQuantitySold = 0;

  for (const invoice of toArray(invoices)) {
    const dateKey = toDateKey(invoice?.createdAt);

    for (const item of toArray(invoice?.lineItems)) {
      if (String(item?.product || "") !== String(productId)) continue;

      const quantity = numberOrZero(item?.quantity);
      totalQuantitySold += quantity;
      salesByDay.set(dateKey, numberOrZero(salesByDay.get(dateKey)) + quantity);
    }
  }

  const dailySales = Array.from(salesByDay.entries())
    .map(([date, quantity]) => ({ date, quantity }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const averageDailyDemand = totalQuantitySold / 30;

  return {
    productId: String(productId),
    periodDays: 30,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    totalQuantitySold,
    averageDailyDemand: Number(averageDailyDemand.toFixed(2)),
    projectedNext30Days: Number((averageDailyDemand * 30).toFixed(2)),
    dailySales,
  };
}

async function getRestockPredictions(products) {
  const now = new Date();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recentInvoices = await Invoice.find({
    createdAt: { $gte: last30Days }
  }).lean();

  const productSales30Days = new Map();
  const productSalesByDay = new Map(); // Track daily sales for consistency

  for (const invoice of recentInvoices) {
    for (const item of invoice.lineItems || []) {
      const productId = String(item.product);
      const quantity = numberOrZero(item.quantity);
      const invoiceDate = new Date(invoice.createdAt).toDateString();

      productSales30Days.set(productId, (productSales30Days.get(productId) || 0) + quantity);

      // Track daily sales for consistency calculation
      if (!productSalesByDay.has(productId)) {
        productSalesByDay.set(productId, new Map());
      }
      const daySales = productSalesByDay.get(productId);
      daySales.set(invoiceDate, (daySales.get(invoiceDate) || 0) + quantity);
    }
  }

  const predictions = products
    .filter(product => product.stock <= env.lowStockThreshold * 2)
    .map(product => {
      const productId = String(product._id);
      const sales30Days = productSales30Days.get(productId) || 0;

      // Calculate average daily sales over 30 days
      const avgDailySales = sales30Days / 30;

      // Calculate days until stockout
      const daysUntilStockout = avgDailySales > 0 
        ? Math.floor(product.stock / avgDailySales)
        : Infinity;

      // Recommended quantity: (avgDailySales * 10) - currentStock
      // 7 days base stock + 3 days buffer = 10 days total
      let recommendedReorder = Math.ceil((avgDailySales * 10) - product.stock);

      // Safety caps
      recommendedReorder = Math.max(0, recommendedReorder); // Minimum 0
      const maxStock = Math.ceil(avgDailySales * 15); // Maximum 15 days of stock
      if (product.stock + recommendedReorder > maxStock) {
        recommendedReorder = Math.max(0, maxStock - product.stock);
      }

      // Calculate confidence score based on sales consistency
      const daySales = productSalesByDay.get(productId);
      let confidence = 0;
      if (daySales && daySales.size > 0) {
        const dailyValues = Array.from(daySales.values());
        const mean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
        const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
        // Higher confidence when sales are consistent (lower coefficient of variation)
        confidence = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));
      } else if (sales30Days > 0) {
        confidence = 60; // Moderate confidence if we have some sales but no daily breakdown
      } else {
        confidence = 0; // No confidence if no sales data
      }

      // Generate explanation
      let explanation = "";
      if (avgDailySales > 0) {
        const daysStockLasts = (product.stock / avgDailySales).toFixed(1);
        if (daysStockLasts < 1) {
          explanation = `Selling ${avgDailySales.toFixed(1)}/day, current stock lasts less than 1 day.`;
        } else if (daysStockLasts < 2) {
          explanation = `Selling ${avgDailySales.toFixed(1)}/day, current stock lasts ${daysStockLasts} days.`;
        } else {
          explanation = `Selling ${avgDailySales.toFixed(1)}/day, current stock lasts ${daysStockLasts} days.`;
        }
      } else {
        explanation = "No recent sales data. Recommended based on stock level.";
      }

      return {
        product,
        currentStock: product.stock,
        avgDailySales: Number(avgDailySales.toFixed(2)),
        daysUntilStockout: daysUntilStockout === Infinity ? null : daysUntilStockout,
        recommendedReorder,
        urgency: getUrgency(daysUntilStockout, product.stock),
        confidence: Math.round(confidence),
        explanation
      };
    })
    .sort((a, b) => (a.daysUntilStockout || Infinity) - (b.daysUntilStockout || Infinity));

  return predictions;
}

function getUrgency(daysUntilStockout, currentStock) {
  if (currentStock === 0) return "critical";
  if (daysUntilStockout === null) return "low";
  if (daysUntilStockout <= 2) return "critical";
  if (daysUntilStockout <= 5) return "high";
  if (daysUntilStockout <= 10) return "medium";
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
      confidence: item.confidence,
      explanation: item.explanation,
      estimatedCost: item.recommendedReorder * (item.product.costPrice || item.product.price * 0.7)
    }));

  const totalEstimatedCost = purchaseOrder.reduce((sum, item) => sum + item.estimatedCost, 0);

  return {
    items: purchaseOrder,
    totalEstimatedCost: Number(totalEstimatedCost.toFixed(2)),
    generatedAt: new Date()
  };
}

async function checkPurchaseOrderStatus(storeId) {
  const lowStockProducts = await getLowStockProducts(storeId);
  const purchaseOrder = await generatePurchaseOrder(lowStockProducts);
  const openPurchaseOrders = toArray(purchaseOrder?.items).map((item) => ({
    ...item,
    status: "open",
    expectedDeliveryDate: item.expectedDeliveryDate || null,
  }));

  return {
    storeId: storeId ? String(storeId) : null,
    openPurchaseOrders,
    totalOpen: openPurchaseOrders.length,
    totalEstimatedCost: numberOrZero(purchaseOrder?.totalEstimatedCost),
    generatedAt: purchaseOrder?.generatedAt || new Date(),
    note:
      "No persisted purchase-order model exists yet; this reflects currently generated open replenishment recommendations.",
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
  getLowStockProducts,
  getProductMovementAnalysis,
  predictDemand,
  getRestockPredictions,
  getExpiryAlerts,
  generatePurchaseOrder,
  checkPurchaseOrderStatus,
  getCategoryPerformance,
  getStockTurnoverRatio
};
