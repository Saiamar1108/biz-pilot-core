const env = require("../config/env");
const { buildAnalytics } = require("../services/analyticsService");

const OPENAI_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

async function getAnalyticsContext(req) {
  return buildAnalytics({}, req);
}

async function askOpenAI(message, context) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  const systemPrompt = `You are ShopPilot AI, an experienced Indian retail store manager. Be concise, practical, and action-oriented.

RULES:
1. Keep responses SHORT - max 3-5 lines by default
2. Answer DIRECTLY first - give the answer immediately
3. Always use business context from the provided data
4. Never give generic textbook answers
5. Avoid long paragraphs, theory, "in general", "typically", "it depends"

FOR QUESTIONS, use this format:
Answer: [direct answer]
Why: [short reason]
Action: [what owner should do]

FOR PREDICTIONS, always show:
- Expected value with % change
- Confidence %
- Top affected products
- Action item

BUSINESS CONTEXT TO USE:
- Total Revenue: ₹${context.totalBilled?.toLocaleString('en-IN') || 0}
- Pending Revenue: ₹${context.pendingRevenue?.toLocaleString('en-IN') || 0}
- Total Orders: ${context.totalOrders || 0}
- Active Customers: ${context.activeCustomers || 0}
- Low Stock Items: ${context.lowStockItems?.length || 0}
- Top Category: ${context.topCategory || 'N/A'}
- Recent Revenue Trend: ${context.monthlyRevenue?.slice(-1)?.[0]?.revenue ? '₹' + context.monthlyRevenue.slice(-1)[0].revenue.toLocaleString('en-IN') : 'N/A'}

TOP PRODUCTS (by revenue):
${context.topProducts?.slice(0, 5).map(p => `- ${p.name}: ${p.sold} sold, ₹${p.revenue?.toLocaleString('en-IN')}`).join('\n') || 'No data'}

LOW STOCK ITEMS:
${context.lowStockItems?.slice(0, 5).map(p => `- ${p.name}: ${p.stock} units left`).join('\n') || 'No items'}

PENDING PAYMENTS: ${context.pendingInvoicesCount || 0} invoices`;

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
  const ctx = await getAnalyticsContext(req);

  try {
    const reply = await askOpenAI(message, ctx);

    return {
      reply,
      data: {
        source: "groq",
        context: ctx,
      },
    };
  } catch (error) {
    // Fallback with structured, concise response
    const fallbackReply = `Answer: ₹${ctx.totalBilled?.toLocaleString('en-IN') || 0} total revenue, ${ctx.pendingInvoicesCount || 0} pending payments.

Why: ${ctx.lowStockItems?.length || 0} items low stock affecting sales.

Action: Restock top selling items and follow up on pending payments.`;

    return {
      reply: fallbackReply,
      data: {
        source: "fallback",
        context: ctx,
      },
    };
  }
}

module.exports = {
  getAnalyticsContext,
  generateAiResponse,
};
