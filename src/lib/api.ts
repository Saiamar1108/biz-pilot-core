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
  customer: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "sent";
  date: string;
  items: number;
};

export type AnalyticsSummary = {
  totalSales: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  topProducts: Array<{ id: string; name: string; sku: string; sold: number; revenue: number; category: string }>;
  lowStockItems: Array<{ id: string; name: string; sku: string; stock: number; category: string }>;
};

export type AiChatResponse = {
  role: string;
  message: string;
  context: unknown;
};

const normalizeDate = (value?: string | Date | null) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const normalizeProduct = (item: any): Product => ({
  id: item._id ?? item.id ?? item.sku,
  sku: item.sku ?? "",
  name: item.name ?? "",
  category: item.category ?? "General",
  stock: Number(item.stock ?? 0),
  price: Number(item.price ?? 0),
  sold: Number(item.sold ?? 0),
});

const normalizeCustomer = (item: any): Customer => ({
  id: item._id ?? item.id ?? item.email,
  name: item.name ?? "",
  email: item.email ?? "",
  phone: item.phone ?? "",
  orders: Number(item.orders ?? 0),
  spent: Number(item.spent ?? 0),
  due: Number(item.due ?? 0),
  pendingPayments: Number(item.pendingPayments ?? item.due ?? 0),
  orderHistory: Array.isArray(item.orderHistory) ? item.orderHistory.map(String) : [],
  status: item.status ?? "regular",
  lastOrder: normalizeDate(item.lastOrder),
});

const normalizeInvoice = (item: any): Invoice => ({
  id: item.invoiceNumber ?? item._id ?? item.id ?? "",
  customer: typeof item.customer === "object" ? item.customer?.name ?? item.customerName ?? "" : item.customerName ?? item.customer ?? "",
  amount: Number(item.total ?? item.amount ?? 0),
  status: item.status ?? "pending",
  date: normalizeDate(item.createdAt ?? item.date),
  items: Array.isArray(item.lineItems) ? item.lineItems.length : Number(item.items ?? 0),
});

export async function getProducts() {
  const response = await api.get<ApiResponse<any[]>>("/products");
  return response.data.data.map(normalizeProduct);
}

export async function createProduct(payload: Omit<Product, "id">) {
  const response = await api.post<ApiResponse<any>>("/products", payload);
  return normalizeProduct(response.data.data);
}

export async function updateProduct(id: string, payload: Partial<Omit<Product, "id">>) {
  const response = await api.put<ApiResponse<any>>(`/products/${id}`, payload);
  return normalizeProduct(response.data.data);
}

export async function deleteProduct(id: string) {
  const response = await api.delete<ApiResponse<any>>(`/products/${id}`);
  return response.data.data;
}

export async function getCustomers() {
  const response = await api.get<ApiResponse<any[]>>("/customers");
  return response.data.data.map(normalizeCustomer);
}

export async function getInvoices() {
  const response = await api.get<ApiResponse<any[]>>("/invoices");
  return response.data.data.map(normalizeInvoice);
}

export async function createInvoice(payload: {
  customer: string;
  lineItems: Array<{ product: string; quantity: number; unitPrice: number }>;
  status?: string;
  taxRate?: number;
}) {
  const response = await api.post<ApiResponse<any>>("/invoices", payload);
  return normalizeInvoice(response.data.data);
}

export async function getAnalytics() {
  const response = await api.get<ApiResponse<AnalyticsSummary>>("/analytics");
  return response.data.data;
}

export async function postAiChat(message: string) {
  const response = await api.post<ApiResponse<AiChatResponse>>("/ai/chat", { message });
  return response.data.data;
}
