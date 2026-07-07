const env = require("../config/env");
const { buildAnalytics } = require("../services/analyticsService");

const OPENAI_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

async function getAnalyticsContext(req) {
  return buildAnalytics({}, req);
}

function detectIntent(message) {
  const lower = String(message || "").toLowerCase();

  if (/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste)/i.test(lower)) return "greeting";
  if (/(inventory|stock|product|reorder|restock|shelf|warehouse|item)/i.test(lower)) return "inventory";
  if (/(purchase\s*order|\bpo\b|reorder|stock\s*replenishment|supplier)/i.test(lower)) return "purchase_orders";
  if (/(profit|margin|markup|earnings|net\s*income|profitability|most\s*profitable)/i.test(lower)) return "profit";
  if (/(forecast|predict|trend|future|projection|expected|demand\s*plan)/i.test(lower)) return "forecasting";
  if (/(customer|clients|loyal|retention|repeat\s*buyer|top\s*customer|buyer|regular|most\s*paying)/i.test(lower)) return "customers";
  if (/(invoice|billing)/i.test(lower)) return "invoices";
  if (/(payment|paid|unpaid|overdue|pending\s*payment|collection|receivable|due)/i.test(lower)) return "payments";
  if (/(sales|revenue|sold|income|turnover|business\s*health|performance|top\s*sell)/i.test(lower)) return "sales";
  if (/(analytic|insight|dashboard|metric|kpi|summary|report|stats)/i.test(lower)) return "analytics";

  return "general";
}

function buildScopedContext(ctx) {
  const top5 = ctx.topProducts?.slice(0, 5).map(p => `${p.name}: ${p.sold} sold, ₹${p.revenue?.toLocaleString('en-IN')}`).join('\n') || 'No data';
  const low5 = ctx.lowStockItems?.slice(0, 5).map(p => `${p.name}: ${p.stock} units left`).join('\n') || 'No items';

  return {
    ...ctx,
    topProductsSummary: top5,
    lowStockSummary: low5,
    pendingInvoicesCount: ctx.pendingInvoicesCount || 0,
    pendingRevenue: ctx.pendingRevenue || 0,
  };
}

function formatBusinessHealth(context) {
  return `BUSINESS HEALTH
- Total Revenue: ₹${context.totalBilled?.toLocaleString('en-IN') || 0}
- Revenue Received: ₹${context.revenueReceived?.toLocaleString('en-IN') || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Total Orders: ${context.totalOrders || 0}
- Active Customers: ${context.activeCustomers || 0}
- Growth Rate: ${context.growthRate || 0}%
- Collection Efficiency: ${context.collectionEfficiency || 0}%
- Low Stock Items: ${context.lowStockItems?.length || 0}
`;
}

function formatKeyHighlights(context) {
  const topProduct = context.topProducts?.[0];
  const topCustomer = context.customerIntelligence?.topPaying?.[0];
  const stockRisk = context.smartPredictions?.find((p) => p.title === "Stock Alert");
  const categoryTrend = context.smartPredictions?.find((p) => p.title === "Category Trend");
  return `KEY HIGHLIGHTS
- Top Product: ${topProduct ? `${topProduct.name} | ${topProduct.sold} sold | ₹${topProduct.revenue?.toLocaleString('en-IN')}` : 'No data'}
- Best Customer: ${topCustomer ? `${topCustomer.name} | ₹${topCustomer.totalSpent?.toLocaleString('en-IN')}` : 'No data'}
- Inventory Risk: ${stockRisk ? stockRisk.forecast : 'No active stock risk'}
- Category Trend: ${categoryTrend ? categoryTrend.forecast : 'No trend data'}
`;
}

function formatRecommendedActions(context) {
  const actions = [];
  if (context.lowStockItems?.length) actions.push(`Restock ${context.lowStockItems[0].name || 'top items'} now`);
  if (context.pendingRevenue > 0) actions.push(`Collect ₹${context.pendingRevenue.toLocaleString('en-IN')} pending payments`);
  if (context.topProducts?.[0]) actions.push(`Promote ${context.topProducts[0].name} to boost sales`);
  return `RECOMMENDED ACTIONS
- ${actions.slice(0, 3).join('\n- ') || 'Keep operations steady.'}
`;
}

function formatSalesOverview(context) {
  return `SALES OVERVIEW
- Total Revenue: ₹${context.totalBilled?.toLocaleString('en-IN') || 0}
- Revenue Received: ₹${context.revenueReceived?.toLocaleString('en-IN') || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Total Orders: ${context.totalOrders || 0}
- Average Order Value: ₹${context.avgOrderValue?.toLocaleString('en-IN') || 0}
- Collection Efficiency: ${context.collectionEfficiency || 0}%
`;
}

function formatTopProducts(context) {
  const items = context.topProducts?.slice(0, 5).map((p) => `- ${p.name}: ${p.sold} sold | ₹${p.revenue?.toLocaleString('en-IN')}`).join('\n');
  return `TOP PRODUCTS\n${items || 'No product data'}\n`;
}

function formatSalesOpportunities(context) {
  const top = context.topProducts?.[0];
  const category = context.topCategory && context.topCategory !== '—' ? context.topCategory : null;
  return `SALES OPPORTUNITIES
- ${top ? `Push ${top.name} harder; it's already your best seller` : 'Add strong products to unlock growth'}
- ${category ? `Double down on ${category}—it leads revenue` : 'Keep monitoring category mix'}
- ${context.pendingRevenue > 0 ? `Recover ₹${context.pendingRevenue.toLocaleString('en-IN')} pending to improve cash flow` : 'Cash flow is healthy'}
`;
}

function formatCustomerSummary(context) {
  return `CUSTOMER SUMMARY
- Active Customers: ${context.activeCustomers || 0}
- Repeat Customer Rate: ${context.repeatCustomerRate || 0}%
- Average Order Value: ₹${context.avgOrderValue?.toLocaleString('en-IN') || 0}
`;
}

function formatTopCustomers(context) {
  const topPaying = context.customerIntelligence?.topPaying?.slice(0, 5).map((c) => `- ${c.name}: ₹${c.totalSpent?.toLocaleString('en-IN')}`).join('\n') || 'No data';
  const mostPending = context.customerIntelligence?.mostPending?.slice(0, 5).map((c) => `- ${c.name}: ₹${c.pendingAmount?.toLocaleString('en-IN')} pending`).join('\n') || 'None';
  return `TOP PAYING CUSTOMERS\n${topPaying}\n\nCUSTOMERS WITH PENDING DUES (${context.customerIntelligence?.mostPending?.length || 0})\n${mostPending}\n`;
}

function formatFollowUpActions(context) {
  const name = context.customerIntelligence?.mostPending?.[0]?.name;
  return `FOLLOW-UP ACTIONS
- ${name ? `Contact ${name} first for pending clearance` : 'Review pending customer list'}
- Launch a loyalty reward for repeat buyers`;
}

function formatInvoiceSummary(context) {
  return `INVOICE SUMMARY
- Total Invoices: ${context.totalOrders || 0}
- Pending Invoices: ${context.pendingInvoicesCount || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Collection Efficiency: ${context.collectionEfficiency || 0}%
`;
}

function formatRecentInvoices(context) {
  const recent = context.activityFeed?.slice(0, 5).map((i) => `- ${i.text} (${new Date(i.date).toLocaleDateString('en-IN')})`).join('\n') || 'No recent invoices';
  return `RECENT INVOICES\n${recent}\n`;
}

function formatCollectionActions(context) {
  return `COLLECTION ACTIONS
- Send reminders to ${context.pendingInvoicesCount || 0} pending invoices
- Prioritize oldest overdue payments
- Consider early-payment incentives`;
}

function formatPaymentSummary(context) {
  return `PAYMENT SUMMARY
- Pending Invoices: ${context.pendingInvoicesCount || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Collection Efficiency: ${context.collectionEfficiency || 0}%
`;
}

function formatInvoiceAging(context) {
  const aging = context.invoiceAging?.map((a) => `- ${a.label}: ${a.count} invoices | ₹${a.amount?.toLocaleString('en-IN')}`).join('\n') || 'No aging data';
  return `INVOICE AGING\n${aging}\n`;
}

function formatRecoveryPlan(context) {
  const oldest = context.invoiceAging?.find((a) => a.count > 0)?.label || 'pending';
  return `RECOVERY PLAN
- Start with ${oldest} overdue bucket
- Send payment reminders today
- Escalate invoices older than 30 days`;
}

function formatInventorySnapshot(context) {
  return `INVENTORY SNAPSHOT
- Total Products: ${context.totalProducts || 0}
- Low Stock Items: ${context.lowStockItems?.length || 0}
- Stock Risk: ${context.smartPredictions?.find((p) => p.title === 'Stock Alert')?.forecast || 'No active risk'}
`;
}

function formatLowStockItems(context) {
  const items = context.lowStockItems?.slice(0, 5).map((p) => `- ${p.name}: ${p.stock} units left`).join('\n') || 'No low stock items';
  return `LOW STOCK ITEMS\n${items}\n`;
}

function formatRestockActions(context) {
  const item = context.lowStockItems?.[0]?.name;
  return `RESTOCK ACTIONS
- ${item ? `Order ${item} immediately` : 'No urgent restock needed'}
- Increase safety stock for fast movers
- Review supplier lead times`;
}

function formatPurchaseOrderPlan(context) {
  const fastMoving = context.topProducts?.slice(0, 3).map((p) => `${p.name} (${p.sold} sold)`).join(', ') || 'None';
  return `PURCHASE ORDER PLAN
- Fast-Moving Products: ${fastMoving}
- Low Stock Items to Reorder: ${context.lowStockItems?.length || 0}
`;
}

function formatDemandSignals(context) {
  const stockAlert = context.smartPredictions?.find((p) => p.title === 'Stock Alert')?.forecast || 'No stock alert';
  const revenueForecast = context.smartPredictions?.find((p) => p.title === 'Revenue Forecast')?.forecast || 'No revenue forecast';
  const categoryTrend = context.smartPredictions?.find((p) => p.title === 'Category Trend')?.forecast || 'No category trend';
  return `DEMAND SIGNALS\n- ${stockAlert}\n- ${revenueForecast}\n- ${categoryTrend}\n`;
}

function formatReorderActions(context) {
  const names = context.lowStockItems?.slice(0, 3).map((i) => i.name).join(', ') || 'none';
  return `REORDER ACTIONS\n- Place orders for: ${names}\n- Review minimum stock levels\n- Confirm supplier availability`;
}

function formatProfitAnalysis(context) {
  const margin = context.totalBilled > 0 ? ((context.profit / context.totalBilled) * 100).toFixed(1) : 0;
  const monthly = context.monthlyProfitTrends?.slice(-3).map((m) => `${m.month}: ₹${m.profit?.toLocaleString('en-IN')}`).join(', ') || 'No data';
  return `PROFIT ANALYSIS
- Total Profit: ₹${context.profit?.toLocaleString('en-IN') || 0}
- Profit Margin: ${margin}%
- Recent Monthly Profit: ${monthly}
`;
}

function formatProfitDrivers(context) {
  const items = context.productAnalytics?.mostProfitable?.slice(0, 5).map((p) => `- ${p.name}: ₹${p.profit?.toLocaleString('en-IN')}`).join('\n') || 'No data';
  return `PROFIT DRIVERS\n${items}\n`;
}

function formatMarginActions(context) {
  const best = context.productAnalytics?.mostProfitable?.[0]?.name;
  return `MARGIN ACTIONS
- ${best ? `Scale ${best}, your most profitable product` : 'Review product margins'}
- Bundle high-margin items with fast movers
- Adjust pricing on low-margin products`;
}

function formatForecastSummary(context) {
  const forecast = context.smartPredictions?.find((p) => p.title === 'Revenue Forecast')?.forecast || 'No forecast';
  return `FORECAST SUMMARY
- Growth Rate: ${context.growthRate || 0}%
- Next 7 Days: ${forecast}
`;
}

function formatPredictions(context) {
  const demand = context.demandPredictions?.map((p) => `- ${p.title}: ${p.forecast} (${p.confidence})`).join('\n') || 'No predictions';
  const trend = context.smartPredictions?.find((p) => p.title === 'Category Trend')?.forecast || 'No trend';
  const stock = context.smartPredictions?.find((p) => p.title === 'Stock Alert')?.forecast || 'No stock alert';
  return `PREDICTIONS\n- Category Trend: ${trend}\n- ${stock}\n\nDEMAND\n${demand}\n`;
}

function formatPlanningActions(context) {
  const category = context.topCategory && context.topCategory !== '—' ? context.topCategory : 'top category';
  return `PLANNING ACTIONS
- Plan inventory for ${category} demand
- Align purchase orders with forecast
- Keep cash buffer for next month`;
}

async function askOpenAI(message, context, intent) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  const sections = {
    greeting: () =>
      formatBusinessHealth(context) +
      formatKeyHighlights(context) +
      formatRecommendedActions(context),

    sales: () =>
      formatSalesOverview(context) +
      formatTopProducts(context) +
      formatSalesOpportunities(context) +
      formatRecommendedActions(context),

    customers: () =>
      formatCustomerSummary(context) +
      formatTopCustomers(context) +
      formatFollowUpActions(context),

    invoices: () =>
      formatInvoiceSummary(context) +
      formatRecentInvoices(context) +
      formatCollectionActions(context),

    payments: () =>
      formatPaymentSummary(context) +
      formatInvoiceAging(context) +
      formatRecoveryPlan(context),

    inventory: () =>
      formatInventorySnapshot(context) +
      formatLowStockItems(context) +
      formatRestockActions(context),

    purchase_orders: () =>
      formatPurchaseOrderPlan(context) +
      formatDemandSignals(context) +
      formatReorderActions(context),

    profit: () =>
      formatProfitAnalysis(context) +
      formatProfitDrivers(context) +
      formatMarginActions(context),

    forecasting: () =>
      formatForecastSummary(context) +
      formatPredictions(context) +
      formatPlanningActions(context),

    analytics: () =>
      formatBusinessHealth(context) +
      formatKeyHighlights(context) +
      formatRecommendedActions(context),

    general: () =>
      formatBusinessHealth(context) +
      formatKeyHighlights(context) +
      formatRecommendedActions(context),
  };

  const scopedData = typeof sections[intent] === "function" ? sections[intent]() : sections.general();

  const systemPrompt = `You are ShopPilot AI, an experienced Indian retail business copilot. Generate a premium, structured business report using the provided live data and the user's exact wording.

RULES:
1. Keep it concise but structured: use short sections with headings and bullets
2. Use the provided section templates and live business data
3. Make the response unique to the user's question and data
4. Mention real product names, customer names, and amounts
5. If data is unavailable for a section, clearly state that
6. Never hallucinate; do not invent customers, products, or amounts
7. Prefer actionable recommendations after each insight

USER MESSAGE: "${message}"

SCOPED BUSINESS DATA TEMPLATE:
${scopedData}

Return a clean, scannable business report.`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  const data = await response.json();

  return data.choices?.[0]?.message?.content || "No response";
}

async function generateAiResponse(message, req) {
  const intent = detectIntent(message);
  const ctx = buildScopedContext(await getAnalyticsContext(req));

  try {
    const reply = await askOpenAI(message, ctx, intent);

    return {
      reply,
      data: {
        source: "groq",
        context: ctx,
        intent,
      },
    };
  } catch (error) {
    const intentLabel = intent || "general";

    const fallbackReply = (() => {
      switch (intentLabel) {
        case "inventory":
          return `INVENTORY\n- Low stock items: ${ctx.lowStockItems?.length || 0}\n- Risk: ${ctx.smartPredictions?.find((p) => p.title === 'Stock Alert')?.forecast || 'No active stock risk'}\nRecommended: Restock ${ctx.lowStockItems?.[0]?.name || 'top items'} and monitor fast movers.`;
        case "purchase_orders":
          return `PURCHASE ORDERS\n- Fast movers: ${ctx.topProducts?.slice(0, 3).map((p) => `${p.name} (${p.sold} sold)`).join(', ') || 'None'}\n- Low stock items: ${ctx.lowStockItems?.length || 0}\nRecommended: Order missing stock and confirm supplier lead times.`;
        case "profit":
          const margin = ctx.totalBilled > 0 ? ((ctx.profit / ctx.totalBilled) * 100).toFixed(1) : 0;
          return `PROFIT\n- Total profit: ₹${ctx.profit?.toLocaleString('en-IN') || 0}\n- Margin: ${margin}%\nTop profit drivers: ${ctx.productAnalytics?.mostProfitable?.slice(0, 3).map((p) => `${p.name}: ₹${p.profit?.toLocaleString('en-IN')}`).join(', ') || 'No data'}\nRecommended: Scale best-margin products and review low-margin pricing.`;
        case "forecasting":
          return `FORECAST\n- Growth rate: ${ctx.growthRate || 0}%\n- Next 7 days: ${ctx.smartPredictions?.find((p) => p.title === 'Revenue Forecast')?.forecast || 'No forecast'}\nRecommended: Plan inventory for ${ctx.topCategory && ctx.topCategory !== '—' ? ctx.topCategory : 'top category'} demand and align purchase orders.`;
        case "customers":
          return `CUSTOMERS\n- Active: ${ctx.activeCustomers || 0}\n- Repeat rate: ${ctx.repeatCustomerRate || 0}%\nTop paying: ${ctx.customerIntelligence?.topPaying?.slice(0, 3).map((c) => `${c.name}: ₹${c.totalSpent?.toLocaleString('en-IN')}`).join(', ') || 'No data'}\nRecommended: Reward repeat buyers and follow up with ${ctx.customerIntelligence?.mostPending?.[0]?.name || 'pending customers'}.`;
        case "invoices":
          return `INVOICES\n- Total: ${ctx.totalOrders || 0}\n- Pending: ${ctx.pendingInvoicesCount || 0}\n- Pending revenue: ₹${ctx.pendingRevenue?.toLocaleString('en-IN') || 0}\nRecommended: Review recent invoices, send reminders, and collect payments.`;
        case "payments":
          return `PAYMENTS\n- Pending invoices: ${ctx.pendingInvoicesCount || 0}\n- Pending revenue: ₹${ctx.pendingRevenue?.toLocaleString('en-IN') || 0}\n- Collection efficiency: ${ctx.collectionEfficiency || 0}%\nRecommended: Start recovery with oldest overdue invoices and offer early-payment incentives.`;
        case "sales":
          return `SALES\n- Revenue: ₹${ctx.totalBilled?.toLocaleString('en-IN') || 0}\n- Orders: ${ctx.totalOrders || 0}\n- Collection efficiency: ${ctx.collectionEfficiency || 0}%\nRecommended: Push ${ctx.topProducts?.[0]?.name || 'top products'} and clear ₹${ctx.pendingRevenue?.toLocaleString('en-IN') || 0} pending.`;
        case "analytics":
        case "greeting":
        case "general":
        default:
          return `BUSINESS SNAPSHOT\n- ₹${ctx.totalBilled?.toLocaleString('en-IN') || 0} total revenue\n- ${ctx.pendingInvoicesCount || 0} pending payments\n- ${ctx.lowStockItems?.length || 0} low stock items\nRecommended: Restock top sellers and collect oldest pending payments.`;
      }
    })();

    return {
      reply: fallbackReply,
      data: {
        source: "fallback",
        context: ctx,
        intent,
      },
    };
  }
}

module.exports = {
  getAnalyticsContext,
  generateAiResponse,
};
