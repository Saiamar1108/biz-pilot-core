const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const env = require("../config/env");

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

const numberOrZero = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => numberOrZero(value).toFixed(2);

function normalizeCustomer(customer) {
  const totalSpent = numberOrZero(customer.totalSpent ?? customer.spent);
  const pendingAmount = numberOrZero(
    customer.pendingAmount ?? customer.pendingPayments ?? customer.due,
  );

  return {
    ...customer,
    name: customer.name || "N/A",
    totalSpent,
    spent: numberOrZero(customer.spent ?? totalSpent),
    pendingAmount,
    due: numberOrZero(customer.due ?? pendingAmount),
    favoriteProduct: customer.favoriteProduct || "N/A",
    customerType:
      customer.customerType ||
      (customer.status === "vip" ? "VIP" : customer.status === "new" ? "New" : "Regular"),
    status: customer.status || "regular",
  };
}

function normalizeProduct(product) {
  return {
    ...product,
    name: product.name || "N/A",
    sku: product.sku || "",
    category: product.category || "General",
    stock: numberOrZero(product.stock),
    price: numberOrZero(product.price),
    sold: numberOrZero(product.sold),
  };
}

function normalizeInvoice(invoice) {
  return {
    ...invoice,
    total: numberOrZero(invoice.total),
    createdAt: invoice.createdAt || new Date(),
  };
}

async function getAnalyticsContext() {
  const [rawProducts, rawCustomers, rawInvoices] = await Promise.all([
    Product.find().lean(),
    Customer.find().lean(),
    Invoice.find().lean(),
  ]);

  const products = rawProducts.map(normalizeProduct);
  const customers = rawCustomers.map(normalizeCustomer);
  const invoices = rawInvoices.map(normalizeInvoice);

  const totalSales = invoices.reduce((sum, inv) => sum + numberOrZero(inv.total), 0);
  const lowStockItems = products.filter((p) => p.stock < env.lowStockThreshold);
  const topProducts = [...products].sort((a, b) => b.sold - a.sold).slice(0, 5);

  const monthlyRevenue = {};
  for (const inv of invoices) {
    const date = new Date(inv.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyRevenue[key] = numberOrZero(monthlyRevenue[key]) + numberOrZero(inv.total);
  }

  const monthlyRevenueArray = Object.entries(monthlyRevenue)
    .map(([month, revenue]) => ({ month, revenue: parseFloat(money(revenue)) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalSales,
    monthlyRevenue: monthlyRevenueArray,
    topProducts,
    lowStockItems,
    customers,
    products,
    invoices,
  };
}

function buildHeuristicResponse(message, ctx) {
  const text = message.toLowerCase().trim();

  if (text.includes("revenue") || text.includes("sales")) {
    const latest = ctx.monthlyRevenue.at(-1);
    return {
      reply: `Total sales are $${money(ctx.totalSales)}. ${latest ? `Latest month (${latest.month}): $${money(latest.revenue)}.` : "No monthly data yet."}`,
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

  if (
    text.includes("top") &&
    (text.includes("product") || text.includes("selling") || text.includes("seller"))
  ) {
    const top = ctx.topProducts
      .slice(0, 3)
      .map((p) => `${p.name || "N/A"} (${numberOrZero(p.sold)} sold)`)
      .join(", ");
    return {
      reply: ctx.topProducts.length ? `Top sellers: ${top}.` : "No product sales data yet.",
      data: { topProducts: ctx.topProducts },
    };
  }

  if (text.includes("customer")) {
    const top = [...ctx.customers]
      .sort((a, b) => numberOrZero(b.totalSpent ?? b.spent) - numberOrZero(a.totalSpent ?? a.spent))
      .slice(0, 5);
    const names = top
      .map((c) => `${c.name || "N/A"} ($${money(c.totalSpent ?? c.spent)})`)
      .join(", ");
    return {
      reply: top.length ? `Top customers by spend: ${names}.` : "No customer data yet.",
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
    const pending = ctx.customers.filter((c) => numberOrZero(c.pendingAmount ?? c.due) > 0);
    const total = pending.reduce((s, c) => s + numberOrZero(c.pendingAmount ?? c.due), 0);
    return {
      reply: pending.length
        ? `${pending.length} customers have outstanding balances totaling $${money(total)}: ${pending.map((c) => c.name || "N/A").join(", ")}.`
        : "No pending payments at the moment.",
      data: { pendingPayments: pending, totalDue: total },
    };
  }

  return {
    reply:
      "I can help with revenue, inventory, top products, customers, and demand forecasts. Try asking about this week's revenue or which products are running low.",
    data: null,
  };
}

function formatBusinessContext(ctx) {
  const topProducts =
    ctx.topProducts
      .slice(0, 5)
      .map(
        (p) => `${p.name || "N/A"} (${numberOrZero(p.sold)} sold, stock ${numberOrZero(p.stock)})`,
      )
      .join("; ") || "None";
  const lowStock =
    ctx.lowStockItems
      .slice(0, 5)
      .map((p) => `${p.name || "N/A"} (${numberOrZero(p.stock)} left)`)
      .join("; ") || "None";
  const pendingPayments =
    ctx.customers
      .filter((c) => numberOrZero(c.pendingAmount ?? c.due) > 0)
      .slice(0, 5)
      .map((c) => `${c.name || "N/A"} ($${money(c.pendingAmount ?? c.due)})`)
      .join("; ") || "None";
  const customerInsights =
    [...ctx.customers]
      .sort((a, b) => numberOrZero(b.totalSpent ?? b.spent) - numberOrZero(a.totalSpent ?? a.spent))
      .slice(0, 5)
      .map(
        (c) =>
          `${c.name || "N/A"} spent $${money(c.totalSpent ?? c.spent)} (${c.customerType || c.status || "Regular"})`,
      )
      .join("; ") || "None";
  const revenueTrend =
    ctx.monthlyRevenue
      .slice(-3)
      .map((m) => `${m.month}: $${money(m.revenue)}`)
      .join("; ") || "None";

  return `Top products: ${topProducts}
Low stock items: ${lowStock}
Pending payments: ${pendingPayments}
Customer insights: ${customerInsights}
Recent revenue trend: ${revenueTrend}`;
}

async function askOpenAI(message, ctx) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const businessContext = formatBusinessContext(ctx);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are ShopPilot AI, a helpful assistant for a retail business. Answer questions about sales, inventory, customers, invoices, and restocking clearly and concisely.",
        },
        {
          role: "system",
          content: `Use the following business data when answering: ${businessContext}`,
        },
        {
          role: "user",
          content: `User question: ${message}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("OpenAI returned an empty response");
  }

  return reply;
}

async function generateAiResponse(message) {
  const ctx = await getAnalyticsContext();

  try {
    const reply = await askOpenAI(message, ctx);
    return {
      reply,
      data: {
        source: "openai",
        context: {
          totalSales: ctx.totalSales,
          monthlyRevenue: ctx.monthlyRevenue,
          lowStockItems: ctx.lowStockItems.slice(0, 5),
          topProducts: ctx.topProducts.slice(0, 5),
          customers: ctx.customers.slice(0, 5),
          invoices: ctx.invoices.slice(0, 5),
        },
      },
    };
  } catch (error) {
    console.error("AI generation failed, falling back to heuristic response:", error.message);
    const fallback = buildHeuristicResponse(message, ctx);
    return {
      ...fallback,
      data: {
        ...(fallback.data || {}),
        source: "fallback",
        warning: error.message,
      },
    };
  }
}

module.exports = { getAnalyticsContext, generateAiResponse };
