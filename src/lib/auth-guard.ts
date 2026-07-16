import { redirect } from "@tanstack/react-router";
import { getAccessToken, refreshAccessToken } from "@/lib/auth-store";
import { resolveApiBaseUrl } from "@/lib/api-base-url";

const apiBaseUrl = resolveApiBaseUrl();

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
