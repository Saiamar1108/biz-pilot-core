import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

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
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalPurchases: number;
  totalSpent: number;
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

export type Invoice = {
  id: string;
  customerId: string;
  customer: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "sent";
  date: string;
  items: number;
};

export type AnalyticsSummary = {
  totalSales: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    sold: number;
    revenue: number;
    category: string;
  }>;
  lowStockItems: Array<{ id: string; name: string; sku: string; stock: number; category: string }>;
};

export type AiChatResponse = {
  role: string;
  message: string;
  context: unknown;
};

export type SettingsProfile = {
  fullName: string;
  email: string;
  phone: string;
  timezone: string;
  imageDataUrl: string;
};

export type NotificationSettings = {
  invoiceNotifications: boolean;
  stockAlerts: boolean;
  paymentReminders: boolean;
  aiInsightsAlerts: boolean;
};

export type AppSettings = {
  profile: SettingsProfile;
  notifications: NotificationSettings;
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
  if (value === "paid" || value === "pending" || value === "overdue" || value === "sent") {
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

  return {
    id: asString(item._id ?? item.id ?? item.sku),
    sku: asString(item.sku),
    name: asString(item.name),
    category: asString(item.category, "General"),
    stock: asNumber(item.stock),
    price: asNumber(item.price),
    sold: asNumber(item.sold),
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
    totalPurchases: asNumber(item.totalPurchases ?? item.orders),
    totalSpent: asNumber(item.totalSpent ?? item.spent),
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

const normalizeInvoice = (value: unknown): Invoice => {
  const item = asRecord(value);
  const customer = asRecord(item.customer);

  return {
    id: asString(item.invoiceNumber ?? item._id ?? item.id),
    customerId: asString(customer._id ?? customer.id ?? item.customer),
    customer:
      Object.keys(customer).length > 0
        ? asString(customer.name ?? item.customerName)
        : asString(item.customerName ?? item.customer),
    amount: asNumber(item.total ?? item.amount),
    status: normalizeInvoiceStatus(item.status),
    date: normalizeDate(asString(item.createdAt ?? item.date)),
    items: Array.isArray(item.lineItems) ? item.lineItems.length : asNumber(item.items),
  };
};

const normalizeSettings = (value: unknown): AppSettings => {
  const item = asRecord(value);
  const profile = asRecord(item.profile);
  const notifications = asRecord(item.notifications);

  return {
    profile: {
      fullName: asString(profile.fullName, "A. Sai Amar Chaitanya"),
      email: asString(profile.email, "asaiamar@shoppilot.ai"),
      phone: asString(profile.phone, "+91 75696 81350"),
      timezone: asString(profile.timezone, "Asia/Kolkata"),
      imageDataUrl: asString(profile.imageDataUrl),
    },
    notifications: {
      invoiceNotifications: notifications.invoiceNotifications !== false,
      stockAlerts: notifications.stockAlerts !== false,
      paymentReminders: notifications.paymentReminders !== false,
      aiInsightsAlerts: notifications.aiInsightsAlerts === true,
    },
  };
};

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
};

export async function createCustomer(payload: CustomerPayload) {
  const response = await api.post<ApiResponse<unknown>>("/customers", payload);
  return normalizeCustomer(response.data.data);
}

export async function updateCustomer(id: string, payload: CustomerPayload) {
  const response = await api.put<ApiResponse<unknown>>(`/customers/${id}`, payload);
  return normalizeCustomer(response.data.data);
}

export async function getInvoices() {
  const response = await api.get<ApiResponse<unknown[]>>("/invoices");
  return response.data.data.map(normalizeInvoice);
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

export async function getAnalytics() {
  const response = await api.get<ApiResponse<AnalyticsSummary>>("/analytics");
  return response.data.data;
}

export async function getSettings() {
  const response = await api.get<ApiResponse<unknown>>("/settings");
  return normalizeSettings(response.data.data);
}

export async function updateProfile(profile: Omit<SettingsProfile, "imageDataUrl">) {
  const response = await api.put<ApiResponse<unknown>>("/settings/profile", { profile });
  return normalizeSettings(response.data.data);
}

export async function updateProfileImage(imageDataUrl: string) {
  const response = await api.put<ApiResponse<unknown>>("/settings/profile-image", {
    imageDataUrl,
  });
  return normalizeSettings(response.data.data);
}

export async function updateNotifications(notifications: NotificationSettings) {
  const response = await api.put<ApiResponse<unknown>>("/settings/notifications", {
    notifications,
  });
  return normalizeSettings(response.data.data);
}

export async function postAiChat(message: string) {
  const response = await api.post<ApiResponse<AiChatResponse>>("/ai/chat", { message });
  return response.data.data;
}
