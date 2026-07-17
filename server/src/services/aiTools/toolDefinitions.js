const productSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    _id: { type: "string" },
    id: { type: "string" },
    name: { type: "string" },
    sku: { type: "string" },
    category: { type: "string" },
    stock: { type: "number" },
    price: { type: "number" },
    costPrice: { type: "number" },
    sold: { type: "number" },
    createdAt: { type: "string", format: "date-time" },
    expiryDate: { type: "string", format: "date-time" },
  },
};

const invoiceSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    _id: { type: "string" },
    invoiceNumber: { type: "string" },
    customer: { type: "string" },
    customerName: { type: "string" },
    total: { type: "number" },
    amount: { type: "number" },
    status: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    paidAt: { type: "string", format: "date-time" },
    paidAmount: { type: "number" },
    pendingAmount: { type: "number" },
    lineItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        properties: {
          product: { type: "string" },
          productName: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          price: { type: "number" },
          costPrice: { type: "number" },
          lineTotal: { type: "number" },
        },
      },
    },
  },
};

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "buildAnalytics",
      description:
        "Build the live analytics context used by the AI assistant from backend/services/analyticsService.js. Includes inventory, invoices, customer balances, revenue, product margins, predictions, and purchase planning signals.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          options: {
            type: "object",
            additionalProperties: false,
            properties: {
              range: {
                type: "string",
                enum: [
                  "all",
                  "today",
                  "last7",
                  "last_7_days",
                  "last30",
                  "last_30_days",
                  "thismonth",
                  "this_month",
                  "custom",
                ],
              },
              startDate: { type: "string", format: "date" },
              endDate: { type: "string", format: "date" },
              strict: { type: "boolean" },
            },
          },
          req: {
            type: "object",
            additionalProperties: true,
            properties: {
              shopId: { type: "string" },
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateFinancialSummary",
      description:
        "Calculate invoice-backed financial totals from backend/services/financialSummary.js. Used by buildAnalytics for billed revenue, collected revenue, pending revenue, profit, invoice counts, monthly series, and raw invoices.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          filter: {
            type: "object",
            additionalProperties: true,
            description: "Mongo invoice filter object. Defaults to an empty filter.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getLowStockProducts",
      description:
        "Return products for a store where stock is less than or equal to each product's reorder threshold. Uses the configured low-stock threshold when a product-specific threshold is absent.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          storeId: {
            type: "string",
          },
        },
        required: ["storeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "predictDemand",
      description:
        "Predict product demand using a simple 30-day moving average over invoice line-item quantities.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          productId: {
            type: "string",
          },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compareRevenuePeriods",
      description:
        "Compare revenue between two date ranges for a store and return each total, the delta, and percent change.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          storeId: {
            type: "string",
          },
          period1: {
            type: "object",
            additionalProperties: false,
            properties: {
              startDate: { type: "string", format: "date" },
              endDate: { type: "string", format: "date" },
            },
            required: ["startDate", "endDate"],
          },
          period2: {
            type: "object",
            additionalProperties: false,
            properties: {
              startDate: { type: "string", format: "date" },
              endDate: { type: "string", format: "date" },
            },
            required: ["startDate", "endDate"],
          },
        },
        required: ["storeId", "period1", "period2"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "checkPurchaseOrderStatus",
      description:
        "Return current open purchase-order/replenishment recommendations and expected delivery dates when available.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          storeId: {
            type: "string",
          },
        },
        required: ["storeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductMovementAnalysis",
      description:
        "Analyze product movement from backend/services/inventoryIntelligence.js using products and an optional day threshold.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          products: {
            type: "array",
            items: productSchema,
          },
          daysThreshold: {
            type: "number",
            default: 30,
          },
        },
        required: ["products"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getRestockPredictions",
      description:
        "Generate restock and stockout predictions from backend/services/inventoryIntelligence.js for the provided products.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          products: {
            type: "array",
            items: productSchema,
          },
        },
        required: ["products"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getExpiryAlerts",
      description:
        "Find expired, critical, and warning expiry alerts from backend/services/inventoryIntelligence.js for the provided products.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          products: {
            type: "array",
            items: productSchema,
          },
        },
        required: ["products"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generatePurchaseOrder",
      description:
        "Generate a purchase-order recommendation from backend/services/inventoryIntelligence.js for low-stock products.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          lowStockProducts: {
            type: "array",
            items: productSchema,
          },
        },
        required: ["lowStockProducts"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategoryPerformance",
      description:
        "Calculate category revenue, profit, units sold, and margin from backend/services/inventoryIntelligence.js.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          products: {
            type: "array",
            items: productSchema,
          },
          invoices: {
            type: "array",
            items: invoiceSchema,
          },
        },
        required: ["products", "invoices"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStockTurnoverRatio",
      description:
        "Calculate 30-day stock turnover from backend/services/inventoryIntelligence.js using product and invoice data.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          products: {
            type: "array",
            items: productSchema,
          },
          invoices: {
            type: "array",
            items: invoiceSchema,
          },
        },
        required: ["products", "invoices"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculateCustomerMetrics",
      description:
        "Calculate customer purchase, billing, payment, pending balance, and type metrics from backend/services/customerMetrics.js.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          customerId: {
            type: "string",
          },
        },
        required: ["customerId"],
      },
    },
  },
];

export const notYetImplementedTools = [
  "getPendingInvoices",
  "getCustomerBalances",
  "getRevenueSummary",
  "getProductMargins",
];

export default {
  toolDefinitions,
  notYetImplementedTools,
};
