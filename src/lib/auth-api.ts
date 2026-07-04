import { api, type ApiResponse } from "@/lib/api";
import { setAccessToken, type AuthShop, type AuthUser } from "@/lib/auth-store";

export type AuthSession = {
  user: AuthUser;
  shop: AuthShop | null;
  accessToken: string;
};

export async function registerAccount(payload: {
  name: string;
  email: string;
  password: string;
  shopName?: string;
  businessType?: string;
  phone?: string;
  address?: string;
  rememberMe?: boolean;
}) {
  const response = await api.post<ApiResponse<AuthSession>>("/auth/register", payload);
  setAccessToken(response.data.data.accessToken);
  return response.data.data;
}

export async function loginAccount(payload: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) {
  const response = await api.post<ApiResponse<AuthSession>>("/auth/login", payload);
  setAccessToken(response.data.data.accessToken);
  return response.data.data;
}

export async function logoutAccount() {
  try {
    await api.post("/auth/logout");
  } finally {
    setAccessToken(null);
  }
}

export async function fetchCurrentSession() {
  const response =
    await api.get<ApiResponse<{ user: AuthUser; shop: AuthShop | null }>>("/auth/me");
  return response.data.data;
}

export async function requestPasswordReset(email: string) {
  const response = await api.post<ApiResponse<{ message: string; devResetToken?: string }>>(
    "/auth/forgot-password",
    { email },
  );
  return response.data;
}

export async function resetAccountPassword(token: string, password: string) {
  const response = await api.post<ApiResponse<{ message: string }>>("/auth/reset-password", {
    token,
    password,
  });
  return response.data;
}

export async function changeAccountPassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  const response = await api.post<ApiResponse<{ message: string }>>("/auth/change-password", payload);
  return response.data;
}

export async function refreshSessionToken() {
  const response =
    await api.post<ApiResponse<{ accessToken: string; user: AuthUser | null }>>("/auth/refresh");
  setAccessToken(response.data.data.accessToken);
  return response.data.data;
}
