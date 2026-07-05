import { redirect } from "@tanstack/react-router";
import { getAccessToken, refreshAccessToken } from "@/lib/auth-store";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

export async function requireAuth() {
  let token = getAccessToken();

  // Only try refresh if browser has refresh cookie
  if (!token) {
    try {
      token = await refreshAccessToken(apiBaseUrl);
    } catch {
      token = null;
    }
  }

  if (!token) {
    throw redirect({
      to: "/login",
      search: {
        redirect:
          typeof window !== "undefined"
            ? window.location.pathname
            : "/dashboard",
      },
    });
  }
}

export async function redirectIfAuthenticated() {
  let token = getAccessToken();

  // If no token, do NOT keep forcing refresh loop
  if (!token) {
    return;
  }

  try {
    token = await refreshAccessToken(apiBaseUrl);
  } catch {
    token = null;
  }

  if (token) {
    throw redirect({
      to: "/dashboard",
    });
  }
}