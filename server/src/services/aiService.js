import toolDefinitions from "./aiTools/toolDefinitions.js";
import { executeTool } from "./aiTools/toolExecutor.js";

const MAX_TOOL_ITERATIONS = 5;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

function isDebugEnabled() {
  return String(process.env.DEBUG_AI || "").toLowerCase() === "true";
}

function debugLog(event, payload = {}) {
  if (isDebugEnabled()) {
    console.log(`[aiService] ${event}`, payload);
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => {
      const role = entry?.role === "assistant" ? "assistant" : "user";
      const content = String(entry?.content || entry?.text || "").trim();

      return content ? { role, content } : null;
    })
    .filter(Boolean)
    .slice(-8);
}

function getGroqConfig() {
  return {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
  };
}

function buildSystemPrompt(req) {
  const shopId = req?.shopId ? String(req.shopId) : null;

  return [
    "You are ShopPilot AI, a real-time business copilot.",
    "Use tools whenever live business data is needed.",
    "Never invent products, customers, invoices, revenue, inventory levels, or purchase-order status.",
    "If a tool returns an error or unavailable data, say that clearly and answer only from the available tool results.",
    "Keep answers concise, practical, and grounded in tool output.",
    shopId
      ? `The current authenticated shopId is ${shopId}. When a tool needs request context, omit it or use this shopId.`
      : "No authenticated shopId was provided.",
  ].join("\n");
}

function buildMessages(message, req, history) {
  return [
    { role: "system", content: buildSystemPrompt(req) },
    ...normalizeHistory(history),
    { role: "user", content: String(message || "") },
  ];
}

async function callGroq(messages) {
  const { apiKey, model } = getGroqConfig();

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 500,
      messages,
      tools: toolDefinitions.toolDefinitions,
      tool_choice: "auto",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed with status ${response.status}: ${body}`);
  }

  const data = await response.json();
  const assistantMessage = data?.choices?.[0]?.message;

  if (!assistantMessage) {
    throw new Error("Groq returned no assistant message");
  }

  return assistantMessage;
}

function parseToolArguments(rawArguments) {
  if (!rawArguments) {
    return {};
  }

  if (typeof rawArguments === "object") {
    return rawArguments;
  }

  try {
    return JSON.parse(rawArguments);
  } catch {
    return {};
  }
}

const storeScopedTools = new Set([
  "getLowStockProducts",
  "compareRevenuePeriods",
  "checkPurchaseOrderStatus",
  "getPurchaseOrderStatus",
]);

function withRequestContext(toolName, args, req) {
  if (toolName !== "buildAnalytics") {
    if (storeScopedTools.has(toolName) && !args.storeId && req?.shopId) {
      return {
        ...args,
        storeId: req.shopId,
      };
    }

    return args;
  }

  return {
    ...args,
    req: args.req || { shopId: req?.shopId },
  };
}

async function executeToolCalls(toolCalls, req) {
  const results = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall?.function?.name;
    const args = withRequestContext(
      toolName,
      parseToolArguments(toolCall?.function?.arguments),
      req,
    );

    debugLog("tool_call_started", {
      id: toolCall?.id,
      name: toolName,
      args,
    });

    const result = await executeTool(toolName, args);

    debugLog("tool_call_finished", {
      id: toolCall?.id,
      name: toolName,
      result,
    });

    results.push({
      role: "tool",
      tool_call_id: toolCall.id,
      name: toolName,
      content: JSON.stringify(result),
    });
  }

  return results;
}

export async function generateAiResponse(message, req, history = []) {
  const messages = buildMessages(message, req, history);

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const assistantMessage = await callGroq(messages);
    const toolCalls = Array.isArray(assistantMessage.tool_calls)
      ? assistantMessage.tool_calls
      : [];

    messages.push(assistantMessage);

    if (!toolCalls.length) {
      const reply = String(assistantMessage.content || "").trim();

      return {
        reply,
        data: {
          source: "groq_tool_agent",
          toolIterations: iteration,
        },
      };
    }

    const toolResults = await executeToolCalls(toolCalls, req);
    messages.push(...toolResults);
  }

  return {
    reply:
      "I could not finish the tool-assisted analysis safely because the tool loop reached its iteration limit.",
    data: {
      source: "groq_tool_agent",
      toolIterations: MAX_TOOL_ITERATIONS,
      error: "max tool iterations reached",
    },
  };
}

export { MAX_TOOL_ITERATIONS };

export default {
  generateAiResponse,
};
