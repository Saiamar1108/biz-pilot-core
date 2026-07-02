const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");

const VIP_SPEND_THRESHOLD = 20000;
const NEW_SPEND_THRESHOLD = 5000;

function roundCurrency(value) {
  const parsed = Number(value || 0);
  return parseFloat((Number.isFinite(parsed) ? parsed : 0).toFixed(2));
}

function getCustomerType(totalSpent) {
  if (totalSpent >= VIP_SPEND_THRESHOLD) return "VIP";
  if (totalSpent < NEW_SPEND_THRESHOLD) return "New";
  return "Regular";
}

function getLegacyStatus(customerType) {
  if (customerType === "VIP") return "vip";
  if (customerType === "Regular") return "regular";
  return "new";
}

function getFavoriteProduct(invoices) {
  const productStats = new Map();

  for (const invoice of invoices) {
    for (const item of invoice.lineItems || []) {
      const name = item.productName || "Unknown product";
      const current = productStats.get(name) || { quantity: 0, revenue: 0 };

      productStats.set(name, {
        quantity: current.quantity + Number(item.quantity || 0),
        revenue: current.revenue + Number(item.lineTotal || 0),
      });
    }
  }

  let favorite = "";
  let best = { quantity: 0, revenue: 0 };

  for (const [name, stats] of productStats.entries()) {
    if (
      stats.quantity > best.quantity ||
      (stats.quantity === best.quantity && stats.revenue > best.revenue)
    ) {
      favorite = name;
      best = stats;
    }
  }

  return favorite;
}

async function calculateCustomerMetrics(customerId) {
  const customer = await Customer.findById(customerId).select("createdAt lastOrder").lean();
  const invoices = await Invoice.find({ customer: customerId })
    .select("lineItems status total createdAt")
    .sort({ createdAt: 1 })
    .lean();

  const totalPurchases = invoices.length;
  const totalSpent = roundCurrency(
    invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
  );
  const pendingAmount = roundCurrency(
    invoices.reduce(
      (sum, invoice) => (invoice.status === "paid" ? sum : sum + Number(invoice.total || 0)),
      0,
    ),
  );
  const fallbackDate = customer?.lastOrder || customer?.createdAt || new Date();
  const lastPurchaseDate = invoices.length
    ? invoices[invoices.length - 1].createdAt || fallbackDate
    : fallbackDate;
  const favoriteProduct = getFavoriteProduct(invoices);
  const customerType = getCustomerType(totalSpent);

  return {
    totalPurchases,
    totalSpent,
    lastPurchaseDate,
    favoriteProduct,
    pendingAmount,
    customerType,
    orders: totalPurchases,
    spent: totalSpent,
    due: pendingAmount,
    pendingPayments: pendingAmount,
    lastOrder: lastPurchaseDate,
    status: getLegacyStatus(customerType),
  };
}

async function recalculateCustomerMetrics(customerId) {
  const metrics = await calculateCustomerMetrics(customerId);
  return Customer.findByIdAndUpdate(
    customerId,
    { $set: metrics },
    { new: true, runValidators: true },
  );
}

async function recalculateAllCustomerMetrics() {
  const customers = await Customer.find().select("_id").lean();
  const results = await Promise.allSettled(
    customers.map((customer) => recalculateCustomerMetrics(customer._id)),
  );
  const rejected = results.filter((result) => result.status === "rejected");

  if (rejected.length) {
    console.warn(`Skipped customer metric recalculation for ${rejected.length} customer(s).`);
  }
}

module.exports = {
  calculateCustomerMetrics,
  recalculateAllCustomerMetrics,
  recalculateCustomerMetrics,
};
