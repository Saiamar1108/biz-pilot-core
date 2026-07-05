import { redirect } from "@tanstack/react-router";
import { getAccessToken, refreshAccessToken } from "@/lib/auth-store";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export async function requireAuth() {
  let token = getAccessToken();
  if (!token) {
    token = await refreshAccessToken(apiBaseUrl);
  }

  if (!token) {
    throw redirect({
      to: "/login",
      search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/dashboard" },
    });
  }
}

export async function redirectIfAuthenticated() {
  let token = getAccessToken();
  if (!token) {
    token = await refreshAccessToken(apiBaseUrl);
  }

  if (token) {
    throw redirect({ to: "/dashboard" });
  }
}