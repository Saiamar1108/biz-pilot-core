/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, refreshAccessToken, setAccessToken } from "./auth-store";

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const url = originalRequest?.url || "";

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (
      originalRequest._retry ||
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/reset-password")
    ) {
      if (url.includes("/auth/refresh")) setAccessToken(null);
      return Promise.reject(error);
    }

    if (!getAccessToken()) {
      setAccessToken(null);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const newToken = await refreshAccessToken(apiBaseUrl);
    if (!newToken) {
      setAccessToken(null);
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);

function unwrap<T>(response: { data: ApiResponse<T> }) {
  return response.data.data;
}

function documentId(value: any) {
  return String(value?.id || value?._id || "");
}

function normalizeProduct(product: any): Product {
  return {
    ...product,
    id: documentId(product),
    sku: product?.sku || "",
    name: product?.name || "",
    category: product?.category || "General",
    stock: Number(product?.stock || 0),
    price: Number(product?.price || 0),
    costPrice: Number(product?.costPrice || 0),
    sold: Number(product?.sold || 0),
    barcode: product?.barcode || "",
    expiryDate: product?.expiryDate || null,
  };
}

function normalizeCustomer(customer: any): Customer {
  return {
    ...customer,
    id: documentId(customer),
    name: customer?.name || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    address: customer?.address || "",
    gstNumber: customer?.gstNumber || "",
    notes: customer?.notes || "",
    totalPurchases: Number(customer?.totalPurchases ?? customer?.orders ?? 0),
    totalSpent: Number(customer?.totalSpent ?? customer?.spent ?? 0),
    pendingAmount: Number(
      customer?.pendingAmount ?? customer?.due ?? customer?.pendingPayments ?? 0,
    ),
    orders: Number(customer?.orders ?? customer?.totalPurchases ?? 0),
    spent: Number(customer?.spent ?? customer?.totalSpent ?? 0),
    due: Number(customer?.due ?? customer?.pendingAmount ?? 0),
    pendingPayments: Number(customer?.pendingPayments ?? customer?.pendingAmount ?? 0),
    customerType: customer?.customerType || "New",
    status: customer?.status || "new",
    favoriteProduct: customer?.favoriteProduct || "N/A",
    lastPurchaseDate:
      customer?.lastPurchaseDate || customer?.lastOrder || customer?.createdAt || "",
    lastOrder: customer?.lastOrder || customer?.lastPurchaseDate || customer?.createdAt || "",
  };
}

function normalizeInvoice(invoice: any): Invoice {
  const customerObject = typeof invoice?.customer === "object" ? invoice.customer : null;
  const customerId = customerObject
    ? documentId(customerObject)
    : String(invoice?.customer || invoice?.customerId || "");
  const lineItems = (invoice?.lineItems || []).map((item: any) => {
    const quantity = Number(item?.quantity ?? 0);
    const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0);
    return {
      ...item,
      productId: item?.productId || String(item?.product || ""),
      productName: item?.productName || item?.name || "",
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      costPrice: Number(item?.costPrice ?? 0),
      lineTotal: Number(
        (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0),
      ),
    };
  });
  const calculatedSubtotal = Number(
    lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2),
  );
  const subtotal = calculatedSubtotal;
  const taxRateValue = Number(invoice?.taxRate ?? 0);
  const taxRate = Number.isFinite(taxRateValue) ? taxRateValue : 0;
  const storedTax = Number(invoice?.tax);
  const tax = storedTax > 0 ? storedTax : Number((subtotal * taxRate).toFixed(2));
  const calculatedTotal = Number((subtotal + tax).toFixed(2));
  const total = calculatedTotal;
  const paidAmountValue = Number(invoice?.paidAmount ?? 0);
  const paidAmount = Number.isFinite(paidAmountValue) ? paidAmountValue : 0;
  const storedPending = Number(invoice?.pendingAmount);
  const calculatedPending = Math.max(0, total - paidAmount);
  const pendingAmount =
    invoice?.status === "paid"
      ? 0
      : invoice?.status === "partial" && Number.isFinite(storedPending) && storedPending > 0
        ? storedPending
        : calculatedPending;

  return {
    ...invoice,
    id: invoice?.invoiceNumber || documentId(invoice),
    _id: documentId(invoice),
    invoiceNumber: invoice?.invoiceNumber || documentId(invoice),
    customerId,
    customer: invoice?.customerName || customerObject?.name || customerId,
    customerName: invoice?.customerName || customerObject?.name || "",
    amount: total,
    total,
    subtotal,
    tax,
    taxRate,
    paidAmount,
    pendingAmount,
    status: invoice?.status || "pending",
    items: Array.isArray(invoice?.lineItems)
      ? invoice.lineItems.length
      : Number(invoice?.items || 0),
    lineItems,
    paymentHistory: invoice?.paymentHistory || [],
    createdAt: invoice?.createdAt || "",
    dueDate: invoice?.dueDate || null,
  };
}

function normalizeNotification(item: any): NotificationItem {
  return {
    ...item,
    id: documentId(item),
    message: item?.message || "",
    read: Boolean(item?.read),
    createdAt: item?.createdAt || "",
  };
}

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  costPrice?: number;
  sold?: number;
  barcode?: string;
  expiryDate?: string | null;
  [key: string]: any;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  totalPurchases: number;
  totalSpent: number;
  pendingAmount: number;
  orders: number;
  spent: number;
  due: number;
  pendingPayments: number;
  customerType: string;
  status: string;
  favoriteProduct?: string;
  lastPurchaseDate?: string;
  lastOrder?: string;
  [key: string]: any;
};

export type CustomerPayload = {
  name: string;
  phone: string;
  email: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
};

export type InvoiceLineItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  lineTotal: number;
  [key: string]: any;
};

export type Invoice = {
  id: string;
  _id?: string;
  invoiceNumber?: string;
  customerId: string;
  customer: string;
  customerName?: string;
  amount: number;
  total: number;
  subtotal: number;
  tax: number;
  taxRate: number;
  paidAmount: number;
  pendingAmount: number;
  status: "paid" | "pending" | "partial" | "overdue" | "sent";
  items: number;
  lineItems: InvoiceLineItem[];
  paymentHistory?: any[];
  createdAt: string;
  dueDate?: string | null;
  [key: string]: any;
};

export type BusinessProfile = {
  storeName: string;
  ownerName?: string;
  gstNumber?: string;
  phone: string;
  email?: string;
  address?: string;
  category?: string;
  logoDataUrl?: string;
  upiId?: string;
};

export type FinancialSummary = {
  totalBilled: number;
  collectedRevenue: number;
  pendingRevenue: number;
  [key: string]: any;
};

export type NotificationItem = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  [key: string]: any;
};

export type AnalyticsRangePreset = "all" | "today" | "last7" | "last30" | "thismonth" | "custom";

export type ProductAnalyticsRow = {
  id?: string;
  name: string;
  category?: string;
  units: number;
  revenue: number;
  profit: number;
};

export type AnalyticsSummary = {
  dateRange?: { startDate?: string; endDate?: string; label?: string };
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
  monthlyProfitTrends: Array<{ month: string; collected: number; pending: number; profit: number }>;
  demandPredictions: Array<{ title: string; forecast: string; confidence: string; detail: string }>;
  smartPredictions: Array<{ title: string; forecast: string; confidence: string; detail: string }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku?: string;
    sold: number;
    revenue: number;
    category?: string;
  }>;
  lowStockItems: Array<{
    id: string;
    name: string;
    sku?: string;
    stock: number;
    category?: string;
  }>;
  topCustomers: Array<{ id: string; name: string; totalSpent: number; pendingAmount: number }>;
  productAnalytics: {
    byCategory: ProductAnalyticsRow[];
    byProduct: ProductAnalyticsRow[];
    mostProfitable: ProductAnalyticsRow[];
    lowPerforming: ProductAnalyticsRow[];
  };
  customerIntelligence: Record<string, any[]>;
  invoiceAging: Array<{ label: string; amount: number; count: number }>;
  activityFeed: any[];
  recommendations: string[];
};

export type PurchaseOrder = {
  items: any[];
  totalEstimatedCost: number;
  [key: string]: any;
};

export const EMPTY_ANALYTICS: AnalyticsSummary = {
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
  topCategory: "-",
  predictionAccuracy: null,
  lowStockThreshold: 0,
  monthlyRevenue: [],
  monthlyPendingRevenue: [],
  monthlyTotalBilled: [],
  monthlyGrowth: [],
  monthlyProfitTrends: [],
  demandPredictions: [],
  smartPredictions: [],
  topProducts: [],
  lowStockItems: [],
  topCustomers: [],
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
  activityFeed: [],
  recommendations: [],
};

export async function getNotifications() {
  const data = unwrap(
    await api.get<ApiResponse<{ notifications: any[]; unreadCount: number }>>("/notifications"),
  );
  return {
    notifications: (data.notifications || []).map(normalizeNotification),
    unreadCount: data.unreadCount || 0,
  };
}

export async function markNotificationRead(id: string) {
  const response = await api.put<ApiResponse<any>>(`/notifications/${id}/read`);
  return normalizeNotification(unwrap(response));
}

export async function clearNotifications() {
  const response = await api.put<ApiResponse<{ cleared: boolean }>>("/notifications/read-all");
  return unwrap(response);
}

export async function getProducts(params?: Record<string, any>) {
  const data = unwrap(await api.get<ApiResponse<any[]>>("/products", { params }));
  return (data || []).map(normalizeProduct);
}

export async function createProduct(payload: Partial<Product>) {
  const response = await api.post<ApiResponse<any>>("/products", payload);
  return normalizeProduct(unwrap(response));
}

export async function updateProduct(id: string, payload: Partial<Product>) {
  const response = await api.put<ApiResponse<any>>(`/products/${id}`, payload);
  return normalizeProduct(unwrap(response));
}

export async function deleteProduct(id: string) {
  const response = await api.delete<ApiResponse<any>>(`/products/${id}`);
  return normalizeProduct(unwrap(response));
}

export async function getCustomers(params?: Record<string, any>) {
  const data = unwrap(await api.get<ApiResponse<any[]>>("/customers", { params }));
  return (data || []).map(normalizeCustomer);
}

export async function createCustomer(payload: CustomerPayload) {
  const response = await api.post<ApiResponse<any>>("/customers", payload);
  return normalizeCustomer(unwrap(response));
}

export async function updateCustomer(id: string, payload: CustomerPayload) {
  const response = await api.put<ApiResponse<any>>(`/customers/${id}`, payload);
  return normalizeCustomer(unwrap(response));
}

export async function getInvoices(params?: Record<string, any>) {
  const data = unwrap(await api.get<ApiResponse<any[]>>("/invoices", { params }));
  return (data || []).map(normalizeInvoice);
}

export async function getInvoiceSummary(params?: Record<string, any>) {
  const response = await api.get<ApiResponse<FinancialSummary>>("/invoices/summary", { params });
  return unwrap(response);
}

export async function createInvoice(payload: {
  customer: string;
  lineItems: Array<{ product: string; quantity: number; unitPrice?: number }>;
  status?: Invoice["status"];
  taxRate?: number;
  dueDate?: string;
}) {
  const response = await api.post<ApiResponse<any>>("/invoices", payload);
  return normalizeInvoice(unwrap(response));
}

export async function updateInvoicePayment(
  id: string,
  payload: { status: Invoice["status"]; paidAmount?: number; paymentMethod?: string },
) {
  const response = await api.put<ApiResponse<any>>(`/invoices/${id}/payment`, payload);
  return normalizeInvoice(unwrap(response));
}

export async function addInvoicePayment(
  id: string,
  payload: { amount: number; paymentMethod?: string; note?: string },
) {
  const current = (await getInvoices()).find((invoice) => invoice.id === id || invoice._id === id);
  const paidAmount = Number(current?.paidAmount || 0) + Number(payload.amount || 0);
  return updateInvoicePayment(id, {
    status: paidAmount >= Number(current?.total || 0) ? "paid" : "partial",
    paidAmount,
    paymentMethod: payload.paymentMethod,
  });
}

export async function getSettings() {
  const response =
    await api.get<ApiResponse<{ business: BusinessProfile; profile?: any; notifications?: any }>>(
      "/settings",
    );
  return unwrap(response);
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  const response = await api.post<ApiResponse<{ message: string }>>(
    "/auth/change-password",
    payload,
  );
  return response.data;
}

export async function getAnalytics(params?: Record<string, any>) {
  const response = await api.get<ApiResponse<AnalyticsSummary>>("/analytics", { params });
  return { ...EMPTY_ANALYTICS, ...unwrap(response) };
}

export async function getInventoryInsights() {
  const response = await api.get<ApiResponse<any>>("/inventory-intelligence/insights");
  return unwrap(response);
}

export async function getPurchaseOrder() {
  const response = await api.get<ApiResponse<PurchaseOrder>>(
    "/inventory-intelligence/purchase-order",
  );
  return unwrap(response);
}

export async function getProductByBarcode(barcode: string) {
  const response = await api.get<{
    success: boolean;
    found: boolean;
    data?: any;
    message?: string;
  }>(`/inventory-intelligence/barcode/${encodeURIComponent(barcode)}`);
  return {
    ...response.data,
    data: response.data.data ? normalizeProduct(response.data.data) : undefined,
  };
}

export async function postAiChat(message: string) {
  const response = await api.post<ApiResponse<{ reply: string; message: string; context?: any }>>(
    "/ai/chat",
    {
      message,
    },
  );
  return unwrap(response);
}
