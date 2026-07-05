import axios from "axios";
import { getAccessToken } from "./auth-store";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5001";

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    console.log(
      "[api.ts] Token from store:",
      token ? `${token.substring(0, 20)}...` : null
    );

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${apiBaseUrl}/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        );

        const newToken = refreshResponse.data?.data?.accessToken;

        if (newToken) {
          localStorage.setItem("accessToken", newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export type ApiResponse<T> = {
  success: boolean;
  count?: number;
  data: T;
  message?: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  sold: number;
  stockMovements: Array<{
    type: "added" | "sold" | "adjusted";
    quantity: number;
    note: string;
    date: string;
  }>;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  gstNumber: string;
  notes: string;
  totalPurchases: number;
  totalBilled: number;
  totalSpent: number;
  lastPaymentDate: string;
  lastPurchaseDate: string;
  favoriteProduct: string;
  pendingAmount: number;
  customerType: "VIP" | "Regular" | "New";
  orders: number;
  spent: number;
  due: number;
  pendingPayments: number;
  orderHistory: string[];
  status: "vip" | "regular" | "new";
  lastOrder: string;
};

export type InvoiceLineItem = {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
};

export type PaymentHistoryEntry = {
  amount: number;
  method: string;
  date: string;
  note: string;
};

export type Invoice = {
  id: string;
  customerId: string;
  customer: string;
  customerPhone: string;
  customerEmail: string;
  amount: number;
  pendingAmount: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  paidAmount: number;
  status: "paid" | "pending" | "partial" | "overdue" | "sent";
  date: string;
  createdAt: string;
  dueDate: string;
  paidAt: string;
  paymentMethod: string;
  items: number;
  lineItems: InvoiceLineItem[];
  paymentHistory: PaymentHistoryEntry[];
};

export type ProductAnalyticsRow = {
  id?: string;
  name?: string;
  category: string;
  units: number;
  revenue: number;
  profit: number;
};

export type CustomerIntelRow = {
  id: string;
  name: string;
  totalSpent: number;
  pendingAmount: number;
  orders: number;
  avgOrderValue: number;
};

export type InvoiceAgingBucket = {
  label: string;
  amount: number;
  count: number;
};

export type MonthlyProfitPoint = {
  month: string;
  collected: number;
  pending: number;
  profit: number;
};

export type AnalyticsDateRange = {
  label: string;
  startDate: string | null;
  endDate: string | null;
};

export type AnalyticsRangePreset =
  | "all"
  | "today"
  | "last7"
  | "last30"
  | "thismonth"
  | "custom";

export type AnalyticsSummary = {
  dateRange: AnalyticsDateRange;
  totalSales: number;
  totalBilled: number;
  revenueReceived: number;
  pendingRevenue: number;
  collectionEfficiency: number;
  profit: number;
  totalOrders: number;
  activeCustomers: number;
  avgOrderValue: number;
  pendingInvoicesCount: number;
  repeatCustomerRate: number;
  growthRate: number;
  topCategory: string;
  predictionAccuracy: number | null;
  lowStockThreshold: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  monthlyPendingRevenue: Array<{ month: string; revenue: number }>;
  monthlyTotalBilled: Array<{ month: string; revenue: number }>;
  monthlyGrowth: Array<{ month: string; growth: number }>;
  demandPredictions: Array<{
    title: string;
    forecast: string;
    confidence: string;
    detail: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    sold: number;
    revenue: number;
    category: string;
  }>;
  lowStockItems: Array<{ id: string; name: string; sku: string; stock: number; category: string }>;
  topCustomers: Array<{ id: string; name: string; totalSpent: number; pendingAmount: number }>;
  activityFeed: Array<{ type: string; text: string; date: string }>;
  recommendations: string[];
  monthlyProfitTrends: MonthlyProfitPoint[];
  productAnalytics: {
    byCategory: ProductAnalyticsRow[];
    byProduct: ProductAnalyticsRow[];
    mostProfitable: ProductAnalyticsRow[];
    lowPerforming: ProductAnalyticsRow[];
  };
  customerIntelligence: {
    topPaying: CustomerIntelRow[];
    mostPending: CustomerIntelRow[];
    mostFrequent: CustomerIntelRow[];
    avgOrderValueByCustomer: CustomerIntelRow[];
  };
  invoiceAging: InvoiceAgingBucket[];
  smartPredictions: Array<{
    title: string;
    forecast: string;
    confidence: string;
    detail: string;
  }>;
};

export const EMPTY_ANALYTICS: AnalyticsSummary = {
  dateRange: { label: "All time", startDate: null, endDate: null },
  totalSales: 0,
  totalBilled: 0,
  revenueReceived: 0,
  pendingRevenue: 0,
  collectionEfficiency: 0,
  profit: 0,
  totalOrders: 0,
  activeCustomers: 0,
  avgOrderValue: 0,
  pendingInvoicesCount: 0,
  repeatCustomerRate: 0,
  growthRate: 0,
  topCategory: "—",
  predictionAccuracy: null,
  lowStockThreshold: 0,
  monthlyRevenue: [],
  monthlyPendingRevenue: [],
  monthlyTotalBilled: [],
  monthlyGrowth: [],
  demandPredictions: [],
  topProducts: [],
  lowStockItems: [],
  topCustomers: [],
  activityFeed: [],
  recommendations: [],
  monthlyProfitTrends: [],
  productAnalytics: {
    byCategory: [],
    byProduct: [],
    mostProfitable: [],
    lowPerforming: [],
  },
  customerIntelligence: {
    topPaying: [],
    mostPending: [],
    mostFrequent: [],
    avgOrderValueByCustomer: [],
  },
  invoiceAging: [],
  smartPredictions: [],
};

// Inventory Intelligence Types
export type InventoryInsights = {
  movementAnalysis: {
    fastMoving: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      salesCount: number;
      price: number;
    }>;
    slowMoving: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      salesCount: number;
      daysSinceLastSale: number | null;
    }>;
    deadStock: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      daysSinceLastSale: number | null;
    }>;
    bestSellers: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      salesCount: number;
      revenue: number;
    }>;
  };
  restockPredictions: Array<{
    id: string;
    name: string;
    sku: string;
    category: string;
    currentStock: number;
    avgDailySales: number;
    daysUntilStockout: number | null;
    recommendedReorder: number;
    urgency: "critical" | "high" | "medium" | "low";
    confidence: number;
    explanation: string;
  }>;
  expiryAlerts: {
    expired: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      expiryDate: string;
      daysUntilExpiry: number;
    }>;
    critical: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      expiryDate: string;
      daysUntilExpiry: number;
    }>;
    warning: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      stock: number;
      expiryDate: string;
      daysUntilExpiry: number;
    }>;
  };
  categoryPerformance: Array<{
    category: string;
    revenue: number;
    profit: number;
    unitsSold: number;
    profitMargin: number;
  }>;
  stockTurnover: {
    turnoverRatio: number;
    totalCOGS: number;
    averageInventoryValue: number;
    period: string;
  };
};

export type PurchaseOrder = {
  items: Array<{
    productName: string;
    sku: string;
    category: string;
    currentStock: number;
    recommendedQuantity: number;
    urgency: "critical" | "high" | "medium" | "low";
    confidence: number;
    explanation: string;
    estimatedCost: number;
  }>;
  totalEstimatedCost: number;
  generatedAt: string;
};

const normalizeMonthlySeries = (
  value: unknown,
): Array<{ month: string; revenue: number }> => {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const item = asRecord(entry);
    return {
      month: asString(item.month ?? item.label),
      revenue: asNumber(item.revenue ?? item.amount),
    };
  });
};

const normalizeProductAnalyticsRow = (entry: unknown): ProductAnalyticsRow => {
  const row = asRecord(entry);
  return {
    id: asString(row.id ?? row._id),
    name: asString(row.name, "N/A"),
    category: asString(row.category, "General"),
    units: asNumber(row.units),
    revenue: asNumber(row.revenue),
    profit: asNumber(row.profit),
  };
};

const normalizeCustomerIntelRow = (entry: unknown): CustomerIntelRow => {
  const row = asRecord(entry);
  return {
    id: asString(row.id ?? row._id),
    name: asString(row.name, "N/A"),
    totalSpent: asNumber(row.totalSpent ?? row.spent),
    pendingAmount: asNumber(row.pendingAmount ?? row.due),
    orders: asNumber(row.orders),
    avgOrderValue: asNumber(row.avgOrderValue),
  };
};

const normalizeAnalytics = (value: unknown): AnalyticsSummary => {
  const item = asRecord(value);
  const dateRange = asRecord(item.dateRange);
  const productAnalytics = asRecord(item.productAnalytics);
  const customerIntelligence = asRecord(item.customerIntelligence);

  return {
    dateRange: {
      label: asString(dateRange.label, "All time"),
      startDate: dateRange.startDate ? asString(dateRange.startDate) : null,
      endDate: dateRange.endDate ? asString(dateRange.endDate) : null,
    },
    totalSales: asNumber(item.totalSales ?? item.totalBilled),
    totalBilled: asNumber(item.totalBilled ?? item.totalSales),
    revenueReceived: asNumber(item.revenueReceived),
    pendingRevenue: asNumber(item.pendingRevenue),
    collectionEfficiency: asNumber(item.collectionEfficiency),
    profit: asNumber(item.profit),
    totalOrders: asNumber(item.totalOrders),
    activeCustomers: asNumber(item.activeCustomers),
    avgOrderValue: asNumber(item.avgOrderValue),
    pendingInvoicesCount: asNumber(item.pendingInvoicesCount),
    repeatCustomerRate: asNumber(item.repeatCustomerRate),
    growthRate: asNumber(item.growthRate),
    topCategory: asString(item.topCategory, "—"),
    predictionAccuracy:
      item.predictionAccuracy == null ? null : asNumber(item.predictionAccuracy),
    lowStockThreshold: asNumber(item.lowStockThreshold),
    monthlyRevenue: normalizeMonthlySeries(item.monthlyRevenue),
    monthlyPendingRevenue: normalizeMonthlySeries(item.monthlyPendingRevenue),
    monthlyTotalBilled: normalizeMonthlySeries(item.monthlyTotalBilled),
    monthlyGrowth: Array.isArray(item.monthlyGrowth)
      ? item.monthlyGrowth.map((entry) => {
          const row = asRecord(entry);
          return {
            month: asString(row.month ?? row.label),
            growth: asNumber(row.growth ?? row.value),
          };
        })
      : [],
    demandPredictions: Array.isArray(item.demandPredictions)
      ? item.demandPredictions.map((entry) => {
          const row = asRecord(entry);
          return {
            title: asString(row.title, "N/A"),
            forecast: asString(row.forecast ?? row.value, "—"),
            confidence: asString(row.confidence, "Live"),
            detail: asString(row.detail),
          };
        })
      : [],
    topProducts: Array.isArray(item.topProducts)
      ? item.topProducts.map((entry) => {
          const row = asRecord(entry);
          return {
            id: asString(row.id ?? row._id),
            name: asString(row.name, "N/A"),
            sku: asString(row.sku),
            sold: asNumber(row.sold),
            revenue: asNumber(row.revenue),
            category: asString(row.category, "General"),
          };
        })
      : [],
    lowStockItems: Array.isArray(item.lowStockItems)
      ? item.lowStockItems.map((entry) => {
          const row = asRecord(entry);
          return {
            id: asString(row.id ?? row._id),
            name: asString(row.name, "N/A"),
            sku: asString(row.sku),
            stock: asNumber(row.stock),
            category: asString(row.category, "General"),
          };
        })
      : [],
    topCustomers: Array.isArray(item.topCustomers)
      ? item.topCustomers.map((entry) => {
          const row = asRecord(entry);
          return {
            id: asString(row.id ?? row._id),
            name: asString(row.name, "N/A"),
            totalSpent: asNumber(row.totalSpent ?? row.spent),
            pendingAmount: asNumber(row.pendingAmount ?? row.due),
          };
        })
      : [],
    activityFeed: Array.isArray(item.activityFeed)
      ? item.activityFeed.map((entry) => {
          const row = asRecord(entry);
          return {
            type: asString(row.type),
            text: asString(row.text),
            date: asString(row.date),
          };
        })
      : [],
    recommendations: Array.isArray(item.recommendations)
      ? item.recommendations.map((entry) => asString(entry))
      : [],
    monthlyProfitTrends: Array.isArray(item.monthlyProfitTrends)
      ? item.monthlyProfitTrends.map((entry) => {
          const row = asRecord(entry);
          return {
            month: asString(row.month),
            collected: asNumber(row.collected),
            pending: asNumber(row.pending),
            profit: asNumber(row.profit),
          };
        })
      : [],
    productAnalytics: {
      byCategory: Array.isArray(productAnalytics.byCategory)
        ? productAnalytics.byCategory.map(normalizeProductAnalyticsRow)
        : [],
      byProduct: Array.isArray(productAnalytics.byProduct)
        ? productAnalytics.byProduct.map(normalizeProductAnalyticsRow)
        : [],
      mostProfitable: Array.isArray(productAnalytics.mostProfitable)
        ? productAnalytics.mostProfitable.map(normalizeProductAnalyticsRow)
        : [],
      lowPerforming: Array.isArray(productAnalytics.lowPerforming)
        ? productAnalytics.lowPerforming.map(normalizeProductAnalyticsRow)
        : [],
    },
    customerIntelligence: {
      topPaying: Array.isArray(customerIntelligence.topPaying)
        ? customerIntelligence.topPaying.map(normalizeCustomerIntelRow)
        : [],
      mostPending: Array.isArray(customerIntelligence.mostPending)
        ? customerIntelligence.mostPending.map(normalizeCustomerIntelRow)
        : [],
      mostFrequent: Array.isArray(customerIntelligence.mostFrequent)
        ? customerIntelligence.mostFrequent.map(normalizeCustomerIntelRow)
        : [],
      avgOrderValueByCustomer: Array.isArray(
        customerIntelligence.avgOrderValueByCustomer,
      )
        ? customerIntelligence.avgOrderValueByCustomer.map(normalizeCustomerIntelRow)
        : [],
    },
    invoiceAging: Array.isArray(item.invoiceAging)
      ? item.invoiceAging.map((entry) => {
          const row = asRecord(entry);
          return {
            label: asString(row.label),
            amount: asNumber(row.amount),
            count: asNumber(row.count),
          };
        })
      : [],
    smartPredictions: Array.isArray(item.smartPredictions)
      ? item.smartPredictions.map((entry) => {
          const row = asRecord(entry);
          return {
            title: asString(row.title, "N/A"),
            forecast: asString(row.forecast ?? row.value, "—"),
            confidence: asString(row.confidence, "Live"),
            detail: asString(row.detail),
          };
        })
      : [],
  };
};

export type FinancialSummary = {
  totalBilled: number;
  collectedRevenue: number;
  pendingRevenue: number;
  profit: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
};

export type NotificationItem = {
  id: string;
  type: string;
  message: string;
  relatedId: string;
  read: boolean;
  createdAt: string;
};

export type AiChatResponse = {
  role: string;
  message: string;
  reply?: string;
  context: unknown;
};

export type SettingsProfile = {
  fullName: string;
  email: string;
  phone: string;
  timezone: string;
  imageDataUrl: string;
};

export type BusinessProfile = {
  storeName: string;
  ownerName: string;
  gstNumber: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  logoDataUrl: string;
  upiId: string;
};

export type NotificationSettings = {
  invoiceNotifications: boolean;
  stockAlerts: boolean;
  paymentReminders: boolean;
  aiInsightsAlerts: boolean;
};

export type AppSettings = {
  profile: SettingsProfile;
  business: BusinessProfile;
  notifications: NotificationSettings;
  taxRate: number;
  lowStockThreshold: number;
};

type ApiRecord = Record<string, unknown>;

const asRecord = (value: unknown): ApiRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as ApiRecord) : {};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : value == null ? fallback : String(value);

const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeCustomerType = (value: unknown, status: unknown): Customer["customerType"] => {
  if (value === "VIP" || value === "Regular" || value === "New") return value;
  if (status === "vip") return "VIP";
  if (status === "new") return "New";
  return "Regular";
};

const normalizeCustomerStatus = (
  value: unknown,
  customerType: Customer["customerType"],
): Customer["status"] => {
  if (value === "vip" || value === "regular" || value === "new") return value;
  return customerType === "VIP" ? "vip" : customerType === "New" ? "new" : "regular";
};

const normalizeInvoiceStatus = (value: unknown): Invoice["status"] => {
  if (value === "paid" || value === "pending" || value === "partial" || value === "overdue" || value === "sent") {
    return value;
  }

  return "pending";
};

const normalizeDate = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const normalizeProduct = (value: unknown): Product => {
  const item = asRecord(value);
  const movements = Array.isArray(item.stockMovements) ? item.stockMovements.map(asRecord) : [];

  return {
    id: asString(item._id ?? item.id ?? item.sku),
    sku: asString(item.sku),
    name: asString(item.name),
    category: asString(item.category, "General"),
    stock: asNumber(item.stock),
    price: asNumber(item.price),
    sold: asNumber(item.sold),
    stockMovements: movements.map((movement) => ({
      type:
        movement.type === "added" || movement.type === "sold" || movement.type === "adjusted"
          ? movement.type
          : "adjusted",
      quantity: asNumber(movement.quantity),
      note: asString(movement.note),
      date: normalizeDate(asString(movement.createdAt ?? movement.date)),
    })),
  };
};

const normalizeCustomer = (value: unknown): Customer => {
  const item = asRecord(value);
  const customerType = normalizeCustomerType(item.customerType, item.status);

  return {
    id: asString(item._id ?? item.id ?? item.email),
    name: asString(item.name),
    email: asString(item.email),
    phone: asString(item.phone),
    address: asString(item.address),
    gstNumber: asString(item.gstNumber),
    notes: asString(item.notes),
    totalPurchases: asNumber(item.totalPurchases ?? item.orders),
    totalBilled: asNumber(item.totalBilled ?? item.billed),
    totalSpent: asNumber(item.totalSpent ?? item.spent),
    lastPaymentDate: normalizeDate(asString(item.lastPaymentDate)),
    lastPurchaseDate: normalizeDate(asString(item.lastPurchaseDate ?? item.lastOrder)),
    favoriteProduct: asString(item.favoriteProduct),
    pendingAmount: asNumber(item.pendingAmount ?? item.pendingPayments ?? item.due),
    customerType,
    orders: asNumber(item.orders ?? item.totalPurchases),
    spent: asNumber(item.spent ?? item.totalSpent),
    due: asNumber(item.due ?? item.pendingAmount),
    pendingPayments: asNumber(item.pendingPayments ?? item.pendingAmount ?? item.due),
    orderHistory: Array.isArray(item.orderHistory) ? item.orderHistory.map(String) : [],
    status: normalizeCustomerStatus(item.status, customerType),
    lastOrder: normalizeDate(asString(item.lastOrder ?? item.lastPurchaseDate)),
  };
};

const toIsoDate = (value: unknown) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(asString(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
};

const normalizeInvoice = (value: unknown): Invoice => {
  const item = asRecord(value);
  const customer = asRecord(item.customer);
  const createdAtRaw = item.createdAt ?? item.date;
  const lineItemsRaw = Array.isArray(item.lineItems) ? item.lineItems.map(asRecord) : [];

  return {
    id: asString(item.invoiceNumber ?? item._id ?? item.id),
    customerId: asString(customer._id ?? customer.id ?? item.customer),
    customer:
      Object.keys(customer).length > 0
        ? asString(customer.name ?? item.customerName)
        : asString(item.customerName ?? item.customer),
    customerPhone: asString(customer.phone),
    customerEmail: asString(customer.email),
    amount: asNumber(item.total ?? item.amount),
    pendingAmount: asNumber(item.pendingAmount ?? Math.max(0, asNumber(item.total ?? item.amount) - asNumber(item.paidAmount))),
    subtotal: asNumber(item.subtotal),
    tax: asNumber(item.tax),
    taxRate: asNumber(item.taxRate),
    discount: asNumber(item.discount),
    paidAmount: asNumber(item.paidAmount),
    status: normalizeInvoiceStatus(item.status),
    date: normalizeDate(asString(createdAtRaw)),
    createdAt: toIsoDate(createdAtRaw),
    dueDate: normalizeDate(asString(item.dueDate)),
    paidAt: normalizeDate(asString(item.paidAt)),
    paymentMethod: asString(item.paymentMethod),
    items: lineItemsRaw.length || asNumber(item.items),
    lineItems: lineItemsRaw.map((line) => {
      const productRef = asRecord(line.product);
      return {
        productId: asString(productRef._id ?? productRef.id ?? line.product),
        productName: asString(line.productName),
        sku: asString(line.sku),
        quantity: asNumber(line.quantity),
        unitPrice: asNumber(line.unitPrice),
        costPrice: asNumber(line.costPrice),
        lineTotal: asNumber(line.lineTotal),
      };
    }),
    paymentHistory: Array.isArray(item.paymentHistory)
      ? item.paymentHistory.map((entry) => {
          const row = asRecord(entry);
          return {
            amount: asNumber(row.amount),
            method: asString(row.method),
            date: normalizeDate(asString(row.paidAt ?? row.date)),
            note: asString(row.note),
          };
        })
      : [],
  };
};

const normalizeSettings = (value: unknown): AppSettings => {
  const item = asRecord(value);
  const profile = asRecord(item.profile);
  const business = asRecord(item.business);
  const notifications = asRecord(item.notifications);

  return {
    profile: {
      fullName: asString(profile.fullName),
      email: asString(profile.email),
      phone: asString(profile.phone),
      timezone: asString(profile.timezone, "Asia/Kolkata"),
      imageDataUrl: asString(profile.imageDataUrl),
    },
    business: {
      storeName: asString(business.storeName),
      ownerName: asString(business.ownerName),
      gstNumber: asString(business.gstNumber),
      phone: asString(business.phone),
      email: asString(business.email),
      address: asString(business.address),
      category: asString(business.category),
      logoDataUrl: asString(business.logoDataUrl),
      upiId: asString(business.upiId),
    },
    notifications: {
      invoiceNotifications: notifications.invoiceNotifications !== false,
      stockAlerts: notifications.stockAlerts !== false,
      paymentReminders: notifications.paymentReminders !== false,
      aiInsightsAlerts: notifications.aiInsightsAlerts === true,
    },
    taxRate: asNumber(item.taxRate, 0.08),
    lowStockThreshold: asNumber(item.lowStockThreshold, 10),
  };
};

export async function getSettings() {
  const response = await api.get<ApiResponse<unknown>>("/settings");
  return normalizeSettings(response.data.data);
}

export async function getProducts() {
  const response = await api.get<ApiResponse<unknown[]>>("/products");
  return response.data.data.map(normalizeProduct);
}

export async function createProduct(payload: Omit<Product, "id">) {
  const response = await api.post<ApiResponse<unknown>>("/products", payload);
  return normalizeProduct(response.data.data);
}

export async function updateProduct(id: string, payload: Partial<Omit<Product, "id">>) {
  const response = await api.put<ApiResponse<unknown>>(`/products/${id}`, payload);
  return normalizeProduct(response.data.data);
}

export async function deleteProduct(id: string) {
  const response = await api.delete<ApiResponse<unknown>>(`/products/${id}`);
  return response.data.data;
}

export async function getCustomers() {
  const response = await api.get<ApiResponse<unknown[]>>("/customers");
  return response.data.data.map(normalizeCustomer);
}

export type CustomerPayload = {
  name: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  notes?: string;
};

export async function createCustomer(payload: CustomerPayload) {
  const response = await api.post<ApiResponse<unknown>>("/customers", payload);
  return normalizeCustomer(response.data.data);
}

export async function updateCustomer(id: string, payload: CustomerPayload) {
  const response = await api.put<ApiResponse<unknown>>(`/customers/${id}`, payload);
  return normalizeCustomer(response.data.data);
}

export async function getInvoices(params?: { customer?: string; status?: string }) {
  const response = await api.get<ApiResponse<unknown[]>>("/invoices", { params });
  return response.data.data.map(normalizeInvoice);
}

export async function getInvoiceSummary(params?: { status?: string }) {
  const response = await api.get<ApiResponse<FinancialSummary>>("/invoices/summary", { params });
  return response.data.data;
}

export async function updateInvoicePayment(
  invoiceId: string,
  payload: { status: "paid" | "partial" | "pending"; paidAmount?: number; paymentMethod?: string },
) {
  const response = await api.put<ApiResponse<unknown>>(`/invoices/${invoiceId}/payment`, payload);
  return normalizeInvoice(response.data.data);
}

export async function addInvoicePayment(
  invoiceId: string,
  payload: { amount: number; paymentMethod?: string; note?: string },
) {
  const response = await api.post<ApiResponse<unknown>>(`/invoices/${invoiceId}/payment`, payload);
  return normalizeInvoice(response.data.data);
}

export async function createInvoice(payload: {
  customer: string;
  lineItems: Array<{ product: string; quantity: number; unitPrice: number }>;
  status?: string;
  taxRate?: number;
}) {
  const response = await api.post<ApiResponse<unknown>>("/invoices", payload);
  return normalizeInvoice(response.data.data);
}

export type GetAnalyticsParams = {
  range?: AnalyticsRangePreset;
  startDate?: string;
  endDate?: string;
};

export async function getAnalytics(params: GetAnalyticsParams = {}) {
  const response = await api.get<ApiResponse<unknown>>("/analytics", { params });
  return normalizeAnalytics(response.data.data);
}

export async function getNotifications() {
  const response = await api.get<ApiResponse<{ notifications: unknown[]; unreadCount: number }>>("/notifications");
  return {
    unreadCount: asNumber(response.data.data.unreadCount),
    notifications: response.data.data.notifications.map((item) => {
      const record = asRecord(item);
      return {
        id: asString(record._id ?? record.id),
        type: asString(record.type),
        message: asString(record.message),
        relatedId: asString(record.relatedId),
        read: record.read === true,
        createdAt: toIsoDate(record.createdAt),
      } as NotificationItem;
    }),
  };
}

export async function markNotificationRead(id: string) {
  await api.put(`/notifications/${id}/read`);
}

export async function clearNotifications() {
  await api.put("/notifications/read-all");
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  const response = await api.post<ApiResponse<{ message: string }>>("/auth/change-password", payload);
  return response.data;
}

export async function postAiChat(message: string) {
  const response = await api.post<ApiResponse<AiChatResponse>>("/ai/chat", { message });
  return response.data.data;
}

// Inventory Intelligence API
export async function getInventoryInsights() {
  const response = await api.get<ApiResponse<unknown>>("/inventory-intelligence/insights");
  return response.data.data as InventoryInsights;
}

export async function getPurchaseOrder() {
  const response = await api.get<ApiResponse<unknown>>("/inventory-intelligence/purchase-order");
  return response.data.data as PurchaseOrder;
}

export async function getProductByBarcode(barcode: string) {
  const response = await api.get<ApiResponse<{ found: boolean; data?: Product; message?: string }>>(
    `/inventory-intelligence/barcode/${barcode}`
  );
  return response.data;
}
