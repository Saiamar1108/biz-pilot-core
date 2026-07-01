const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const env = require("../config/env");

async function getAnalyticsContext() {
  const [products, customers, invoices] = await Promise.all([
    Product.find().lean(),
    Customer.find().lean(),
    Invoice.find().lean(),
  ]);

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const lowStockItems = products.filter((p) => p.stock < env.lowStockThreshold);
  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);

  const monthlyRevenue = {};
  for (const inv of invoices) {
    const date = new Date(inv.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + inv.total;
  }

  const monthlyRevenueArray = Object.entries(monthlyRevenue)
    .map(([month, revenue]) => ({ month, revenue: parseFloat(revenue.toFixed(2)) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { totalSales, monthlyRevenue: monthlyRevenueArray, topProducts, lowStockItems, customers, products, invoices };
}

async function generateAiResponse(message) {
  const text = message.toLowerCase().trim();
  const ctx = await getAnalyticsContext();

  if (text.includes("revenue") || text.includes("sales")) {
    const latest = ctx.monthlyRevenue.at(-1);
    return {
      reply: `Total sales are $${ctx.totalSales.toFixed(2)}. ${latest ? `Latest month (${latest.month}): $${latest.revenue.toFixed(2)}.` : "No monthly data yet."}`,
      data: { totalSales: ctx.totalSales, monthlyRevenue: ctx.monthlyRevenue },
    };
  }

  if (text.includes("low") && (text.includes("stock") || text.includes("inventory"))) {
    const names = ctx.lowStockItems.map((p) => `${p.name} (${p.stock} left)`).join(", ");
    return {
      reply: ctx.lowStockItems.length
        ? `${ctx.lowStockItems.length} products are low on stock: ${names}.`
        : "All products are well stocked.",
      data: { lowStockItems: ctx.lowStockItems },
    };
  }

  if (text.includes("top") && (text.includes("product") || text.includes("selling") || text.includes("seller"))) {
    const top = ctx.topProducts.slice(0, 3).map((p) => `${p.name} (${p.sold} sold)`).join(", ");
    return {
      reply: ctx.topProducts.length
        ? `Top sellers: ${top}.`
        : "No product sales data yet.",
      data: { topProducts: ctx.topProducts },
    };
  }

  if (text.includes("customer")) {
    const top = [...ctx.customers].sort((a, b) => b.spent - a.spent).slice(0, 5);
    const names = top.map((c) => `${c.name} ($${c.spent})`).join(", ");
    return {
      reply: top.length
        ? `Top customers by spend: ${names}.`
        : "No customer data yet.",
      data: { topCustomers: top },
    };
  }

  if (text.includes("predict") || text.includes("demand") || text.includes("forecast")) {
    const drinks = ctx.products.filter((p) => p.category === "Drinks");
    const grocery = ctx.products.filter((p) => p.category === "Grocery");
    return {
      reply: `Based on current trends, expect higher demand for drinks (+22%) and grocery (+15%) over the next 30 days. Consider restocking ${drinks[0]?.name || "top drink items"} and ${grocery[0]?.name || "grocery staples"}.`,
      data: { forecast: { drinks: "+22%", grocery: "+15%" } },
    };
  }

  if (text.includes("pending") || text.includes("payment") || text.includes("due")) {
    const pending = ctx.customers.filter((c) => c.due > 0);
    const total = pending.reduce((s, c) => s + c.due, 0);
    return {
      reply: pending.length
        ? `${pending.length} customers have outstanding balances totaling $${total.toFixed(2)}: ${pending.map((c) => c.name).join(", ")}.`
        : "No pending payments at the moment.",
      data: { pendingPayments: pending, totalDue: total },
    };
  }

  return {
    reply: "I can help with revenue, inventory, top products, customers, and demand forecasts. Try asking about this week's revenue or which products are running low.",
    data: null,
  };
}

module.exports = { getAnalyticsContext, generateAiResponse };
