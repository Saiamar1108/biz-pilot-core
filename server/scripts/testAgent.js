import { generateAiResponse } from "../src/services/aiService.js";

process.env.DEBUG_AI = process.env.DEBUG_AI || "true";

const queries = [
  "How is my business today?",
  "Which products should I reorder?",
  "Why has profit dropped this month?",
];

const req = {
  shopId: process.env.TEST_SHOP_ID || process.env.SHOP_ID || "manual-test-shop",
};

function createTraceLogger() {
  const trace = [];
  const originalLog = console.log;

  console.log = (...args) => {
    const [event, payload] = args;

    if (typeof event === "string" && event.startsWith("[aiService]")) {
      trace.push({
        event: event.replace("[aiService] ", ""),
        payload: payload || {},
      });
    }

    originalLog(...args);
  };

  return {
    trace,
    restore() {
      console.log = originalLog;
    },
  };
}

function findFailedToolCall(trace) {
  const failed = [...trace]
    .reverse()
    .find(
      (entry) =>
        entry.event === "tool_call_finished" &&
        entry.payload?.result?.success === false,
    );

  if (failed) {
    return {
      id: failed.payload.id,
      name: failed.payload.name,
      error: failed.payload.result.error,
    };
  }

  const started = [...trace]
    .reverse()
    .find((entry) => entry.event === "tool_call_started");
  const finishedIds = new Set(
    trace
      .filter((entry) => entry.event === "tool_call_finished")
      .map((entry) => entry.payload?.id),
  );

  if (started && !finishedIds.has(started.payload?.id)) {
    return {
      id: started.payload.id,
      name: started.payload.name,
      error: "tool call started but did not finish",
    };
  }

  return null;
}

async function runQuery(query, index) {
  const logger = createTraceLogger();

  try {
    console.log(`\n=== Query ${index + 1}: ${query} ===`);

    const result = await generateAiResponse(query, req, []);

    console.log("\n--- Tool Call Trace ---");
    console.log(JSON.stringify(logger.trace, null, 2));
    console.log("\n--- Final Answer ---");
    console.log(result.reply);
    console.log("\n--- Response Metadata ---");
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    const failedTool = findFailedToolCall(logger.trace);

    console.log("\n--- Tool Call Trace ---");
    console.log(JSON.stringify(logger.trace, null, 2));
    console.error("\n--- Query Failed ---");
    console.error(`Query: ${query}`);

    if (failedTool) {
      console.error(`Tool call: ${failedTool.name} (${failedTool.id})`);
      console.error(`Tool error: ${failedTool.error}`);
    } else {
      console.error("Tool call: none identified");
    }

    console.error(`Exact error: ${error?.stack || error?.message || String(error)}`);
  } finally {
    logger.restore();
  }
}

for (const [index, query] of queries.entries()) {
  await runQuery(query, index);
}
