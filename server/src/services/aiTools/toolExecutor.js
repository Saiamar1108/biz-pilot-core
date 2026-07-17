import { createRequire } from "node:module";

const requireBackend = createRequire(
  new URL("../../../../backend/package.json", import.meta.url),
);

const notImplementedTools = new Set([
  "getPendingInvoices",
  "getCustomerBalances",
  "getRevenueSummary",
  "getProductMargins",
]);

function normalizeArgs(args) {
  return args && typeof args === "object" ? args : {};
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

async function resolveTool(toolName, args) {
  const safeArgs = normalizeArgs(args);

  switch (toolName) {
    case "buildAnalytics": {
      const { buildAnalytics } = requireBackend("./services/analyticsService.js");
      return buildAnalytics(safeArgs.options, safeArgs.req);
    }
    case "calculateFinancialSummary": {
      const { calculateFinancialSummary } = requireBackend("./services/financialSummary.js");
      return calculateFinancialSummary(safeArgs.filter);
    }
    case "getLowStockProducts": {
      const { getLowStockProducts } = requireBackend("./services/inventoryIntelligence.js");
      return getLowStockProducts(safeArgs.storeId);
    }
    case "getProductMovementAnalysis": {
      const { getProductMovementAnalysis } = requireBackend(
        "./services/inventoryIntelligence.js",
      );
      return getProductMovementAnalysis(safeArgs.products, safeArgs.daysThreshold);
    }
    case "predictDemand": {
      const { predictDemand } = requireBackend("./services/inventoryIntelligence.js");
      return predictDemand(safeArgs.productId);
    }
    case "compareRevenuePeriods": {
      const { compareRevenuePeriods } = requireBackend("./services/financialSummary.js");
      return compareRevenuePeriods(safeArgs.storeId, safeArgs.period1, safeArgs.period2);
    }
    case "getRestockPredictions": {
      const { getRestockPredictions } = requireBackend(
        "./services/inventoryIntelligence.js",
      );
      return getRestockPredictions(safeArgs.products);
    }
    case "getExpiryAlerts": {
      const { getExpiryAlerts } = requireBackend("./services/inventoryIntelligence.js");
      return getExpiryAlerts(safeArgs.products);
    }
    case "generatePurchaseOrder": {
      const { generatePurchaseOrder } = requireBackend(
        "./services/inventoryIntelligence.js",
      );
      return generatePurchaseOrder(safeArgs.lowStockProducts);
    }
    case "checkPurchaseOrderStatus":
    case "getPurchaseOrderStatus": {
      const { checkPurchaseOrderStatus } = requireBackend(
        "./services/inventoryIntelligence.js",
      );
      return checkPurchaseOrderStatus(safeArgs.storeId);
    }
    case "getCategoryPerformance": {
      const { getCategoryPerformance } = requireBackend(
        "./services/inventoryIntelligence.js",
      );
      return getCategoryPerformance(safeArgs.products, safeArgs.invoices);
    }
    case "getStockTurnoverRatio": {
      const { getStockTurnoverRatio } = requireBackend(
        "./services/inventoryIntelligence.js",
      );
      return getStockTurnoverRatio(safeArgs.products, safeArgs.invoices);
    }
    case "calculateCustomerMetrics": {
      const { calculateCustomerMetrics } = requireBackend("./services/customerMetrics.js");
      return calculateCustomerMetrics(safeArgs.customerId);
    }
    default:
      return undefined;
  }
}

export async function executeTool(toolName, args = {}) {
  if (notImplementedTools.has(toolName)) {
    return {
      success: false,
      data: null,
      error: "not implemented",
    };
  }

  try {
    const data = await resolveTool(toolName, args);

    if (data === undefined) {
      return {
        success: false,
        data: null,
        error: "not implemented",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: errorMessage(error),
    };
  }
}

export default executeTool;
