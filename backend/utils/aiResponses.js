const crypto = require("crypto");
const mongoose = require("mongoose");

const env = require("../config/env");
const { buildAnalytics } = require("../services/analyticsService");
const { detectIntent: detectIntentV2, normalizeInput } = require("./intentDetector");

const NON_BUSINESS_RESPONSE =
  "I'm ShopPilot AI, a business assistant. I can only answer business-related questions such as sales, inventory, customers, invoices, suppliers, payments, analytics, products, and revenue.";

const GREETING_RESPONSE =
  "Hi! I can help with live sales, inventory, customers, invoices, suppliers, payments, analytics, products, and revenue. What would you like to check?";

const CASUAL_RESPONSE =
  "I'm ShopPilot AI, your business assistant. Ask me about live sales, inventory, customers, invoices, suppliers, payments, analytics, products, or revenue.";

const BUSINESS_INTENTS = new Set([
  "sales",
  "inventory",
  "customers",
  "payments",
  "invoices",
  "purchase_orders",
  "profit",
  "forecasting",
  "analytics",
  "general",
]);

const BUSINESS_SIGNAL_PATTERNS = [
  /\b(sales?|revenue|inventory|stock|product|products|customer|customers|invoice|invoices|payment|payments|supplier|suppliers|profit|profits|margin|margins|analytics|analysis|orders?|billing|cash flow|expense|expenses|income|collection|collections|receivable|overdue|pending|restock|reorder|purchase orders?|purchase order|best seller|top selling|dashboard|store|shop|business)\b/i,
  /\b(low stock|out of stock|repeat customer|average order value|gross profit|net profit|pending payment|pending invoice|payment collection|inventory value|top customer|top product)\b/i,
];

const FOLLOW_UP_PATTERNS = [
  /^(what about|how about|and|also|now|then)\b/i,
  /^(why|how much|which one|what changed|what else)\b/i,
  /\b(today|yesterday|this week|last week|this month|last month|this year|last year|same|that|those|these|it|them)\b/i,
];

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMoney(value) {
  return `Rs ${Math.round(toNumber(value)).toLocaleString("en-IN")}`;
}

function formatPercent(value) {
  return `${toNumber(value).toFixed(1)}%`;
}

function trimText(value) {
  return String(value || "").trim();
}

function assertMongoReady() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is not connected");
  }
}

function createAiLogger(req, message) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  const base = {
    requestId,
    method: req?.method,
    path: req?.originalUrl,
    shopId: req?.shopId ? String(req.shopId) : null,
  };

  function log(event, extra = {}) {
    console.log(
      `[ai][${requestId}] ${event} ${JSON.stringify({
        ...base,
        ...extra,
      })}`,
    );
  }

  log("request_received", {
    messagePreview: trimText(message).slice(0, 160),
  });

  return {
    requestId,
    log,
    finish(extra = {}) {
      log("request_finished", {
        durationMs: Date.now() - startedAt,
        ...extra,
      });
    },
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => {
      const role = entry?.role === "user" ? "user" : "assistant";
      const text = trimText(entry?.text || entry?.content);

      if (!text) {
        return null;
      }

      return { role, text };
    })
    .filter(Boolean)
    .slice(-8);
}

function historyToPrompt(history) {
  if (!history.length) {
    return "No prior conversation context.";
  }

  return history
    .map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${entry.text}`)
    .join("\n");
}

function hasDirectBusinessSignal(normalizedMessage) {
  return BUSINESS_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalizedMessage));
}

function buildConversationContext(history) {
  const recentUserMessages = history.filter((entry) => entry.role === "user").slice(-4);
  let lastBusinessIntent = null;

  for (let index = recentUserMessages.length - 1; index >= 0; index -= 1) {
    const previous = recentUserMessages[index];
    const result = detectIntentV2(previous.text);

    if (BUSINESS_INTENTS.has(result.intent) && result.intent !== "general") {
      lastBusinessIntent = result.intent;
      break;
    }

    if (result.intent === "general" && hasDirectBusinessSignal(normalizeInput(previous.text))) {
      lastBusinessIntent = "general";
      break;
    }
  }

  return {
    promptHistory: historyToPrompt(history),
    lastBusinessIntent,
  };
}

function isBusinessFollowUp(normalizedMessage, conversation) {
  if (!conversation.lastBusinessIntent) {
    return false;
  }

  if (FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(normalizedMessage))) {
    return true;
  }

  return normalizedMessage.split(" ").filter(Boolean).length <= 6;
}

function classifyMessage(message, history) {
  const normalizedMessage = normalizeInput(message);
  const detected = detectIntentV2(message);
  const conversation = buildConversationContext(history);

  if (BUSINESS_INTENTS.has(detected.intent) && detected.intent !== "general") {
    return {
      kind: "business",
      intent: detected.intent,
      normalizedMessage,
      detector: detected,
      conversation,
    };
  }

  if (detected.intent === "greeting") {
    return {
      kind: "greeting",
      intent: "greeting",
      normalizedMessage,
      detector: detected,
      conversation,
    };
  }

  if (detected.intent === "casual") {
    return {
      kind: "casual",
      intent: "casual",
      normalizedMessage,
      detector: detected,
      conversation,
    };
  }

  if (detected.intent === "non_business") {
    return {
      kind: "non_business",
      intent: "non_business",
      normalizedMessage,
      detector: detected,
      conversation,
    };
  }

  if (hasDirectBusinessSignal(normalizedMessage)) {
    return {
      kind: "business",
      intent: "general",
      normalizedMessage,
      detector: detected,
      conversation,
    };
  }

  if (isBusinessFollowUp(normalizedMessage, conversation)) {
    return {
      kind: "business",
      intent: conversation.lastBusinessIntent || "general",
      normalizedMessage,
      detector: detected,
      conversation,
    };
  }

  return {
    kind: "non_business",
    intent: "non_business",
    normalizedMessage,
    detector: detected,
    conversation,
  };
}

function toDateOnly(date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
    .toISOString()
    .slice(0, 10);
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function endOfWeek(date) {
  const copy = startOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  return copy;
}

function resolveAnalyticsOptions(message) {
  const normalized = normalizeInput(message);
  const now = new Date();

  if (/\byesterday\b/i.test(normalized)) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const day = toDateOnly(yesterday);
    return {
      range: "custom",
      startDate: day,
      endDate: day,
      label: "Yesterday",
    };
  }

  if (/\btoday\b/i.test(normalized)) {
    return { range: "today", label: "Today" };
  }

  if (/\bthis week\b/i.test(normalized)) {
    return {
      range: "custom",
      startDate: toDateOnly(startOfWeek(now)),
      endDate: toDateOnly(now),
      label: "This week",
    };
  }

  if (/\blast week\b/i.test(normalized)) {
    const previousWeekEnd = new Date(startOfWeek(now));
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
    const previousWeekStart = startOfWeek(previousWeekEnd);

    return {
      range: "custom",
      startDate: toDateOnly(previousWeekStart),
      endDate: toDateOnly(endOfWeek(previousWeekStart)),
      label: "Last week",
    };
  }

  if (/\blast 7 days?\b/i.test(normalized)) {
    return { range: "last7", label: "Last 7 days" };
  }

  if (/\blast 30 days?\b/i.test(normalized)) {
    return { range: "last30", label: "Last 30 days" };
  }

  if (/\blast month\b/i.test(normalized)) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      range: "custom",
      startDate: toDateOnly(start),
      endDate: toDateOnly(end),
      label: "Last month",
    };
  }

  if (/\bthis month\b/i.test(normalized)) {
    return { range: "thismonth", label: "This month" };
  }

  if (/\blast year\b/i.test(normalized)) {
    const year = now.getFullYear() - 1;
    return {
      range: "custom",
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      label: "Last year",
    };
  }

  if (/\bthis year\b/i.test(normalized)) {
    return {
      range: "custom",
      startDate: `${now.getFullYear()}-01-01`,
      endDate: toDateOnly(now),
      label: "This year",
    };
  }

  if (/\b(all time|overall|since start|entire business)\b/i.test(normalized)) {
    return { range: "all", label: "All time" };
  }

  return { range: "last30", label: "Last 30 days" };
}

async function getAnalyticsContext(req, message) {
  assertMongoReady();

  const options = resolveAnalyticsOptions(message);
  const analytics = await buildAnalytics(
    {
      range: options.range,
      startDate: options.startDate,
      endDate: options.endDate,
      strict: true,
    },
    req,
  );

  return {
    ...analytics,
    requestedRange: options,
  };
}

function buildScopedContext(context) {
  const topProducts = Array.isArray(context.topProducts) ? context.topProducts.slice(0, 5) : [];
  const lowStockItems = Array.isArray(context.lowStockItems)
    ? context.lowStockItems.slice(0, 5)
    : [];
  const topPaying = Array.isArray(context.customerIntelligence?.topPaying)
    ? context.customerIntelligence.topPaying.slice(0, 5)
    : [];
  const mostPending = Array.isArray(context.customerIntelligence?.mostPending)
    ? context.customerIntelligence.mostPending.slice(0, 5)
    : [];
  const invoiceAging = Array.isArray(context.invoiceAging) ? context.invoiceAging.slice(0, 4) : [];
  const mostProfitable = Array.isArray(context.productAnalytics?.mostProfitable)
    ? context.productAnalytics.mostProfitable.slice(0, 5)
    : [];

  return {
    ...context,
    topProducts,
    lowStockItems,
    topPaying,
    mostPending,
    invoiceAging,
    mostProfitable,
    productCount: Array.isArray(context.productAnalytics?.byProduct)
      ? context.productAnalytics.byProduct.length
      : 0,
  };
}

function buildRecommendations(context) {
  const recommendations = [];
  const topPendingCustomer = context.mostPending?.[0];
  const lowStockItem = context.lowStockItems?.[0];
  const topProduct = context.topProducts?.[0];

  if (topPendingCustomer && toNumber(topPendingCustomer.pendingAmount) > 0) {
    recommendations.push(
      `Follow up with ${topPendingCustomer.name} for ${formatMoney(topPendingCustomer.pendingAmount)} in pending payments.`,
    );
  }

  if (lowStockItem) {
    recommendations.push(
      `Restock ${lowStockItem.name} soon. Only ${toNumber(lowStockItem.stock)} units are left.`,
    );
  }

  if (topProduct) {
    recommendations.push(
      `Promote ${topProduct.name}. It is your strongest seller with ${toNumber(topProduct.sold)} units sold.`,
    );
  }

  if (toNumber(context.repeatCustomerRate) < 25 && toNumber(context.activeCustomers) > 0) {
    recommendations.push(
      `Consider a repeat-buyer offer to improve customer retention beyond ${formatPercent(context.repeatCustomerRate)}.`,
    );
  }

  if (!recommendations.length) {
    recommendations.push(
      "Operations look stable. Keep monitoring daily sales, stock, and collections.",
    );
  }

  return recommendations.slice(0, 3);
}

function buildLiveDataBlock(intent, context) {
  const rangeLabel =
    context.requestedRange?.label || context.dateRange?.label || "Last 30 days";
  const lines = [
    `Date range: ${rangeLabel}`,
    `Total billed: ${formatMoney(context.totalBilled)}`,
    `Collected revenue: ${formatMoney(context.revenueReceived)}`,
    `Pending revenue: ${formatMoney(context.pendingRevenue)}`,
    `Total orders: ${toNumber(context.totalOrders)}`,
    `Active customers: ${toNumber(context.activeCustomers)}`,
    `Average order value: ${formatMoney(context.avgOrderValue)}`,
    `Collection efficiency: ${formatPercent(context.collectionEfficiency)}`,
    `Profit: ${formatMoney(context.profit)}`,
    `Growth rate: ${formatPercent(context.growthRate)}`,
    `Pending invoices: ${toNumber(context.pendingInvoicesCount)}`,
    `Low stock items: ${toNumber(context.lowStockItems?.length)}`,
  ];

  if (intent === "inventory" || intent === "purchase_orders") {
    lines.push(
      `Low stock detail: ${
        context.lowStockItems.length
          ? context.lowStockItems
              .map((item) => `${item.name} (${toNumber(item.stock)} left)`)
              .join(", ")
          : "No urgent low stock items"
      }`,
    );
  }

  if (intent === "customers") {
    lines.push(
      `Top customers: ${
        context.topPaying.length
          ? context.topPaying
              .map((customer) => `${customer.name} (${formatMoney(customer.totalSpent)})`)
              .join(", ")
          : "No customer ranking available"
      }`,
    );
  }

  if (intent === "payments" || intent === "invoices") {
    lines.push(
      `Outstanding customers: ${
        context.mostPending.length
          ? context.mostPending
              .map((customer) => `${customer.name} (${formatMoney(customer.pendingAmount)})`)
              .join(", ")
          : "No pending customer dues"
      }`,
    );
  }

  if (intent === "sales" || intent === "analytics" || intent === "general") {
    lines.push(
      `Top products: ${
        context.topProducts.length
          ? context.topProducts
              .map((product) => `${product.name} (${toNumber(product.sold)} sold)`)
              .join(", ")
          : "No top products yet"
      }`,
    );
  }

  if (intent === "profit") {
    lines.push(
      `Most profitable products: ${
        context.mostProfitable.length
          ? context.mostProfitable
              .map((product) => `${product.name} (${formatMoney(product.profit)})`)
              .join(", ")
          : "No profitability ranking available"
      }`,
    );
  }

  if (intent === "forecasting") {
    lines.push(
      `Predictions: ${
        Array.isArray(context.smartPredictions) && context.smartPredictions.length
          ? context.smartPredictions
              .map((prediction) => `${prediction.title}: ${prediction.forecast}`)
              .join(" | ")
          : "No forecast predictions available"
      }`,
    );
  }

  return lines.join("\n");
}

function buildDeterministicReply(intent, context) {
  const recommendations = buildRecommendations(context);
  const lines = [];
  const rangeLabel =
    context.requestedRange?.label || context.dateRange?.label || "Last 30 days";
  const topProduct = context.topProducts?.[0];
  const topPendingCustomer = context.mostPending?.[0];

  switch (intent) {
    case "sales":
      lines.push(
        `Sales for ${rangeLabel}: ${formatMoney(context.totalBilled)} billed across ${toNumber(context.totalOrders)} orders.`,
      );
      lines.push(
        `Collected ${formatMoney(context.revenueReceived)} so far, with ${formatMoney(context.pendingRevenue)} still pending.`,
      );
      if (topProduct) {
        lines.push(
          `Top seller: ${topProduct.name} with ${toNumber(topProduct.sold)} units sold.`,
        );
      }
      break;
    case "inventory":
      lines.push(
        `Inventory for ${rangeLabel}: ${toNumber(context.lowStockItems.length)} low stock items need attention.`,
      );
      lines.push(
        context.lowStockItems.length
          ? `Most urgent restock: ${context.lowStockItems[0].name} with ${toNumber(
              context.lowStockItems[0].stock,
            )} units left.`
          : "No urgent low stock issues in the current live data.",
      );
      break;
    case "customers":
      lines.push(
        `Customer snapshot for ${rangeLabel}: ${toNumber(context.activeCustomers)} active customers and a ${formatPercent(context.repeatCustomerRate)} repeat rate.`,
      );
      lines.push(
        context.topPaying.length
          ? `Top customer: ${context.topPaying[0].name} with ${formatMoney(
              context.topPaying[0].totalSpent,
            )} collected revenue.`
          : "No customer ranking is available yet.",
      );
      break;
    case "payments":
      lines.push(
        `Payments for ${rangeLabel}: ${formatMoney(context.pendingRevenue)} is pending across ${toNumber(context.pendingInvoicesCount)} invoices.`,
      );
      lines.push(
        topPendingCustomer
          ? `Largest pending customer: ${topPendingCustomer.name} with ${formatMoney(
              topPendingCustomer.pendingAmount,
            )} outstanding.`
          : "There are no pending customer dues in the current live data.",
      );
      break;
    case "invoices":
      lines.push(
        `Invoices for ${rangeLabel}: ${toNumber(context.totalOrders)} total invoices, with ${toNumber(context.pendingInvoicesCount)} still pending.`,
      );
      lines.push(
        `Collections are running at ${formatPercent(context.collectionEfficiency)} with ${formatMoney(context.pendingRevenue)} outstanding.`,
      );
      break;
    case "purchase_orders":
      lines.push(
        `Purchase planning for ${rangeLabel}: ${toNumber(context.lowStockItems.length)} items are candidates for reordering.`,
      );
      lines.push(
        topProduct
          ? `${topProduct.name} is moving fastest, so keep enough stock on hand for that line.`
          : "No clear fast-moving product is available in the current live data.",
      );
      break;
    case "profit":
      lines.push(
        `Profit for ${rangeLabel}: ${formatMoney(context.profit)} on ${formatMoney(context.totalBilled)} billed revenue.`,
      );
      lines.push(
        context.mostProfitable.length
          ? `Most profitable product: ${context.mostProfitable[0].name} with ${formatMoney(
              context.mostProfitable[0].profit,
            )} profit contribution.`
          : "No product-level profit ranking is available yet.",
      );
      break;
    case "forecasting":
      lines.push(
        `Forecast signals for ${rangeLabel}: growth is at ${formatPercent(context.growthRate)} with ${toNumber(
          context.lowStockItems.length,
        )} low stock alerts currently open.`,
      );
      lines.push(
        Array.isArray(context.smartPredictions) && context.smartPredictions[0]
          ? `Strongest forecast: ${context.smartPredictions[0].forecast}.`
          : "No forecast prediction is available right now.",
      );
      break;
    case "analytics":
    case "general":
    default:
      lines.push(
        `Business snapshot for ${rangeLabel}: ${formatMoney(context.totalBilled)} billed, ${formatMoney(context.revenueReceived)} collected, and ${formatMoney(context.pendingRevenue)} pending.`,
      );
      lines.push(
        `${toNumber(context.totalOrders)} orders, ${toNumber(context.activeCustomers)} active customers, and ${toNumber(context.lowStockItems.length)} low stock items in the latest live data.`,
      );
      if (topProduct) {
        lines.push(
          `Top product right now: ${topProduct.name} with ${toNumber(topProduct.sold)} units sold.`,
        );
      }
      break;
  }

  lines.push("");
  lines.push("Recommended actions:");
  recommendations.forEach((recommendation, index) => {
    lines.push(`${index + 1}. ${recommendation}`);
  });

  return lines.join("\n");
}

function resolveLlmConfig() {
  if (process.env.GROQ_API_KEY) {
    return {
      provider: "groq",
      apiKey: process.env.GROQ_API_KEY,
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }

  if (env.openaiApiKey) {
    return {
      provider: "openai",
      apiKey: env.openaiApiKey,
      url: process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }

  return null;
}

async function askOpenAI({ message, history, intent, context, logger }) {
  const llmConfig = resolveLlmConfig();

  if (!llmConfig) {
    return null;
  }

  const prompt = [
    "You are ShopPilot AI, a real-time business copilot.",
    "Only use the live business data provided below.",
    "Never invent products, customers, invoices, revenue, or inventory levels.",
    "If the live data does not support a claim, say that clearly.",
    "Keep the answer concise, actionable, and grounded in the current business state.",
    "",
    `Current business intent: ${intent}`,
    `Conversation context:\n${historyToPrompt(history)}`,
    "",
    `Live business data:\n${buildLiveDataBlock(intent, context)}`,
    "",
    "Respond with:",
    "1. A direct answer to the user's question.",
    "2. The most relevant live numbers.",
    "3. Up to three practical next actions.",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    logger.log("llm_request_started", {
      provider: llmConfig.provider,
      model: llmConfig.model,
    });

    const response = await fetch(llmConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${llmConfig.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: llmConfig.model,
        temperature: 0.2,
        max_tokens: 260,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM request failed with status ${response.status}`);
    }

    const data = await response.json();
    const reply = trimText(data?.choices?.[0]?.message?.content);

    if (!reply) {
      throw new Error("LLM returned an empty response");
    }

    logger.log("llm_request_succeeded", {
      provider: llmConfig.provider,
    });

    return {
      reply,
      source: llmConfig.provider,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function generateAiResponse(message, req, history = []) {
  const logger = createAiLogger(req, message);
  const normalizedHistory = normalizeHistory(history);
  const classification = classifyMessage(message, normalizedHistory);

  logger.log("intent_classified", {
    kind: classification.kind,
    intent: classification.intent,
    confidence: classification.detector?.confidence ?? null,
    mongoReadyState: mongoose.connection.readyState,
  });

  if (classification.kind === "non_business") {
    logger.finish({
      source: "non_business_refusal",
      intent: classification.intent,
    });

    return {
      reply: NON_BUSINESS_RESPONSE,
      data: {
        source: "non_business_refusal",
        intent: classification.intent,
        requestedRange: null,
      },
    };
  }

  if (classification.kind === "greeting") {
    logger.finish({
      source: "greeting",
      intent: classification.intent,
    });

    return {
      reply: GREETING_RESPONSE,
      data: {
        source: "greeting",
        intent: classification.intent,
        requestedRange: null,
      },
    };
  }

  if (classification.kind === "casual") {
    logger.finish({
      source: "casual",
      intent: classification.intent,
    });

    return {
      reply: CASUAL_RESPONSE,
      data: {
        source: "casual",
        intent: classification.intent,
        requestedRange: null,
      },
    };
  }

  let liveContext;

  try {
    logger.log("live_analytics_fetch_started", {
      requestedRange: resolveAnalyticsOptions(message).label,
    });

    liveContext = buildScopedContext(await getAnalyticsContext(req, message));

    logger.log("live_analytics_fetch_succeeded", {
      requestedRange: liveContext.requestedRange?.label || null,
      totalOrders: toNumber(liveContext.totalOrders),
      pendingRevenue: toNumber(liveContext.pendingRevenue),
    });
  } catch (error) {
    logger.log("live_analytics_fetch_failed", {
      error: error.message,
      mongoReadyState: mongoose.connection.readyState,
    });
    logger.finish({
      source: "live_data_error",
      intent: classification.intent,
    });

    return {
      reply:
        "I could not reach live business data right now, so I am not going to guess. Please try again in a moment.",
      data: {
        source: "live_data_error",
        intent: classification.intent,
        requestedRange: resolveAnalyticsOptions(message),
      },
    };
  }

  const fallbackReply = buildDeterministicReply(classification.intent, liveContext);

  try {
    const llmResult = await askOpenAI({
      message,
      history: normalizedHistory,
      intent: classification.intent,
      context: liveContext,
      logger,
    });

    if (!llmResult) {
      logger.finish({
        source: "live_deterministic",
        intent: classification.intent,
        requestedRange: liveContext.requestedRange?.label || null,
      });

      return {
        reply: fallbackReply,
        data: {
          source: "live_deterministic",
          intent: classification.intent,
          requestedRange: liveContext.requestedRange,
          context: liveContext,
        },
      };
    }

    logger.finish({
      source: llmResult.source,
      intent: classification.intent,
      requestedRange: liveContext.requestedRange?.label || null,
    });

    return {
      reply: llmResult.reply,
      data: {
        source: llmResult.source,
        intent: classification.intent,
        requestedRange: liveContext.requestedRange,
        context: liveContext,
      },
    };
  } catch (error) {
    logger.log("llm_request_failed", {
      error: error.message,
    });
    logger.finish({
      source: "live_deterministic_fallback",
      intent: classification.intent,
      requestedRange: liveContext.requestedRange?.label || null,
    });

    return {
      reply: fallbackReply,
      data: {
        source: "live_deterministic_fallback",
        intent: classification.intent,
        requestedRange: liveContext.requestedRange,
        context: liveContext,
      },
    };
  }
}

module.exports = {
  getAnalyticsContext,
  generateAiResponse,
};
