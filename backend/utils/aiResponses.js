const env = require("../config/env");
const { buildAnalytics } = require("../services/analyticsService");

const OPENAI_API_URL =
  "https://api.groq.com/openai/v1/chat/completions";

async function getAnalyticsContext() {
  return buildAnalytics();
}

async function askOpenAI(message) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY missing");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are ShopPilot AI. Help with sales, invoices, inventory and customers.",
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

async function generateAiResponse(message) {
  const ctx = await getAnalyticsContext();

  try {
    const reply = await askOpenAI(message);

    return {
      reply,
      data: {
        source: "groq",
        context: ctx,
      },
    };
  } catch (error) {
    return {
      reply:
        "AI unavailable. Showing live business insights instead.",
      data: {
        source: "fallback",
        recommendations: ctx.recommendations,
      },
    };
  }
}

module.exports = {
  getAnalyticsContext,
  generateAiResponse,
};
