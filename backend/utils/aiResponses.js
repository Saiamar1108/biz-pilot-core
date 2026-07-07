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

async function askOpenAI(message, context, intent) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  let scopedData = "";

  switch (intent) {
    case "inventory":
      scopedData = `INVENTORY INSIGHTS:
- Low Stock Items: ${context.lowStockItems?.length || 0}
${context.lowStockSummary}
- Stock Risk Prediction: ${context.smartPredictions?.find(p => p.title === "Stock Alert")?.forecast || "No active stock risk"}`;
      break;
    case "purchase_orders":
      const fastMoving = context.topProducts?.slice(0, 3).map(p => `${p.name} (${p.sold} sold)`).join(", ") || "None";
      scopedData = `PURCHASE ORDER INSIGHTS:
- Fast-Moving Products: ${fastMoving}
- Low Stock Items to Reorder: ${context.lowStockItems?.length || 0}
${context.lowStockSummary}`;
      break;
    case "profit":
      const margin = context.totalBilled > 0 ? ((context.profit / context.totalBilled) * 100).toFixed(1) : 0;
      const topProfit = context.productAnalytics?.mostProfitable?.slice(0, 5).map(p => `${p.name}: ₹${p.profit?.toLocaleString('en-IN')}`).join('\n') || 'No data';
      scopedData = `PROFIT INSIGHTS:
- Total Profit: ₹${context.profit?.toLocaleString('en-IN') || 0}
- Profit Margin: ${margin}%
- Monthly Profit Trends: ${context.monthlyProfitTrends?.slice(-3).map(m => `${m.month}: ₹${m.profit?.toLocaleString('en-IN')}`).join(', ') || 'No data'}
- Most Profitable Products:
${topProfit}`;
      break;
    case "forecasting":
      scopedData = `FORECASTING INSIGHTS:
- Revenue Forecast (7 days): ${context.smartPredictions?.find(p => p.title === "Revenue Forecast")?.forecast || 'No forecast'}
- Growth Rate: ${context.growthRate || 0}%
- Demand Predictions: ${context.demandPredictions?.map(p => `${p.title}: ${p.forecast} (${p.confidence})`).join('\n') || 'No predictions'}
- Category Trend: ${context.smartPredictions?.find(p => p.title === "Category Trend")?.forecast || 'No trend data'}`;
      break;
    case "customers":
      const topPaying = context.customerIntelligence?.topPaying?.slice(0, 5).map(c => `${c.name}: ₹${c.totalSpent?.toLocaleString('en-IN')}`).join('\n') || 'No data';
      const mostPending = context.customerIntelligence?.mostPending?.slice(0, 3).map(c => `${c.name}: ₹${c.pendingAmount?.toLocaleString('en-IN')} pending`).join('\n') || 'None';
      scopedData = `CUSTOMER INSIGHTS:
- Active Customers: ${context.activeCustomers || 0}
- Repeat Customer Rate: ${context.repeatCustomerRate || 0}%
- Top Paying Customers:
${topPaying}
- Customers with Pending Dues (${context.customerIntelligence?.mostPending?.length || 0}):
${mostPending}`;
      break;
    case "invoices":
      const recentInvoices = context.activityFeed?.slice(0, 5).map(i => `${i.text} (${new Date(i.date).toLocaleDateString('en-IN')})`).join('\n') || 'No recent invoices';
      scopedData = `INVOICE INSIGHTS:
- Total Invoices: ${context.totalOrders || 0}
- Pending Invoices: ${context.pendingInvoicesCount || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Recent Invoices:
${recentInvoices}`;
      break;
    case "payments":
      const aging = context.invoiceAging?.map(a => `${a.label}: ${a.count} invoices, ₹${a.amount?.toLocaleString('en-IN')}`).join('\n') || 'No data';
      scopedData = `PAYMENT INSIGHTS:
- Pending Invoices: ${context.pendingInvoicesCount || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Collection Efficiency: ${context.collectionEfficiency || 0}%
- Invoice Aging:
${aging}`;
      break;
    case "sales":
      scopedData = `SALES INSIGHTS:
- Total Revenue: ₹${context.totalBilled?.toLocaleString('en-IN') || 0}
- Revenue Received: ₹${context.revenueReceived?.toLocaleString('en-IN') || 0}
- Total Orders: ${context.totalOrders || 0}
- Collection Efficiency: ${context.collectionEfficiency || 0}%
- Top Products:
${context.topProductsSummary}`;
      break;
    case "analytics":
    case "general":
    default:
      scopedData = `BUSINESS OVERVIEW:
- Total Revenue: ₹${context.totalBilled?.toLocaleString('en-IN') || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Total Orders: ${context.totalOrders || 0}
- Active Customers: ${context.activeCustomers || 0}
- Low Stock Items: ${context.lowStockItems?.length || 0}
- Growth Rate: ${context.growthRate || 0}%`;
      break;
  }

  const systemPrompt = `You are ShopPilot AI, an experienced Indian retail store manager. Be concise, practical, and action-oriented.

RULES:
1. Keep responses SHORT - max 3-5 lines by default
2. Answer DIRECTLY first - give the answer immediately
3. Always use the business context provided below
4. Never give generic textbook answers
5. Answer the user's question naturally using their exact wording
6. Avoid long paragraphs, theory, "in general", "typically", "it depends"

USER MESSAGE: "${message}"

SCOPED BUSINESS DATA TO USE:
${scopedData}

If the user asked about something not available in the data, say so clearly.`;

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
    let fallbackReply = "";

    switch (intentLabel) {
      case "inventory":
        fallbackReply = `Answer: ${ctx.lowStockItems?.length || 0} items low stock.
Why: Stock below threshold of ${ctx.lowStockThreshold || 5} units.
Action: Restock ${ctx.lowStockItems?.[0]?.name || 'top items'} and monitor fast movers.`;
        break;
      case "purchase_orders":
        fallbackReply = `Answer: ${ctx.lowStockItems?.length || 0} items need reordering.
Why: ${ctx.topProducts?.[0]?.name || 'Top product'} is selling fast.
Action: Place purchase orders for low stock items and increase safety stock.`;
        break;
      case "profit":
        fallbackReply = `Answer: ₹${ctx.profit?.toLocaleString('en-IN') || 0} total profit.
Why: ${ctx.totalBilled ? ((ctx.profit / ctx.totalBilled) * 100).toFixed(1) : 0}% profit margin.
Action: Focus on ${ctx.productAnalytics?.mostProfitable?.[0]?.name || 'top profitable products'} and review pricing.`;
        break;
      case "forecasting":
        fallbackReply = `Answer: ${ctx.growthRate || 0}% growth rate.
Why: Based on current month-over-month trends.
Action: Plan inventory around ${ctx.smartPredictions?.find(p => p.title === "Category Trend")?.forecast?.split(' leads')[0] || 'top category'}.`;
        break;
      case "customers":
        fallbackReply = `Answer: ${ctx.activeCustomers || 0} active customers, ${ctx.repeatCustomerRate || 0}% repeat rate.
Why: ${ctx.customerIntelligence?.mostPending?.length || 0} customers have pending dues.
Action: Follow up with ${ctx.customerIntelligence?.mostPending?.[0]?.name || 'pending customers'} and reward repeat buyers.`;
        break;
      case "invoices":
        fallbackReply = `Answer: ${ctx.totalOrders || 0} total invoices, ${ctx.pendingInvoicesCount || 0} pending.
Why: Pending revenue is ₹${ctx.pendingRevenue?.toLocaleString('en-IN') || 0}.
Action: Review recent invoices and collect payments.`;
        break;
      case "payments":
        fallbackReply = `Answer: ${ctx.pendingInvoicesCount || 0} pending payments totaling ₹${ctx.pendingRevenue?.toLocaleString('en-IN') || 0}.
Why: Collection efficiency is ${ctx.collectionEfficiency || 0}%.
Action: Send reminders for oldest overdue invoices.`;
        break;
      case "sales":
        fallbackReply = `Answer: ₹${ctx.totalBilled?.toLocaleString('en-IN') || 0} total revenue, ${ctx.totalOrders || 0} orders.
Why: Collection efficiency is ${ctx.collectionEfficiency || 0}%.
Action: Focus on ${ctx.topProducts?.[0]?.name || 'top products'} and clear ₹${ctx.pendingRevenue?.toLocaleString('en-IN') || 0} pending.`;
        break;
      case "analytics":
      case "greeting":
      case "general":
      default:
        fallbackReply = `Answer: ₹${ctx.totalBilled?.toLocaleString('en-IN') || 0} total revenue, ${ctx.pendingInvoicesCount || 0} pending payments.
Why: ${ctx.lowStockItems?.length || 0} items low stock affecting sales.
Action: Restock top selling items and follow up on pending payments.`;
        break;
    }

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
