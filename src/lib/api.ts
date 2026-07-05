import axios from "axios";
import { getAccessToken, setAccessToken } from "./auth-store";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// request interceptor
api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // don't retry login
    if (originalRequest?.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    // don't retry refresh
    if (originalRequest?.url?.includes("/auth/refresh")) {
      setAccessToken(null);
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await api.post("/auth/refresh");

        const newToken = refreshResponse.data?.data?.accessToken;

        if (newToken) {
          setAccessToken(newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch {
        setAccessToken(null);
      }
    }

    return Promise.reject(error);
  },
);

// ---------------- Notifications ----------------

export type NotificationItem = {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export async function getNotifications() {
  const response = await api.get("/notifications");
  return response.data.data;
}

export async function markNotificationRead(id: string) {
  const response = await api.patch(`/notifications/${id}/read`);
  return response.data.data;
}

export async function clearNotifications() {
  const response = await api.delete("/notifications");
  return response.data.data;
}

// ---------------- Invoices ----------------

export async function getInvoices() {
  const response = await api.get("/invoices");
  return response.data.data;
}


// ---------------- Settings ----------------

export async function getSettings() {
  const response = await api.get("/settings");
  return response.data.data;
}

// ---------------- Purchase Orders ----------------

export async function createPurchaseOrder(payload: any) {
  const response = await api.post("/purchase-orders", payload);
  return response.data.data;
}

export async function getPurchaseOrder(id: string) {
  const response = await api.get(`/purchase-orders/${id}`);
  return response.data.data;
}
// ---------------- Analytics ----------------

export async function getAnalytics() {
  const response = await api.get("/analytics");
  return response.data.data;
}
// ---------------- Products ----------------

export async function getProducts() {
  const response = await api.get("/products");
  return response.data.data;
}

export async function createProduct(payload: any) {
  const response = await api.post("/products", payload);
  return response.data.data;
}

export async function updateProduct(id: string, payload: any) {
  const response = await api.patch(`/products/${id}`, payload);
  return response.data.data;
}

export async function deleteProduct(id: string) {
  const response = await api.delete(`/products/${id}`);
  return response.data.data;
}