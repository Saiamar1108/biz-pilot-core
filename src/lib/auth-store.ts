const ACCESS_TOKEN_KEY = "sp_access_token";

let accessTokenMemory: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let refreshBlockedUntilLogin = false;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "staff" | "admin";
  shopId: string;
  isVerified: boolean;
  onboardingCompleted: boolean;
  lastLogin?: string | null;
};

export type AuthShop = {
  id: string;
  name: string;
  slug?: string;
};

export function getAccessToken() {
  if (accessTokenMemory) return accessTokenMemory;
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null) {
  accessTokenMemory = token;
  if (token) refreshBlockedUntilLogin = false;
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
  else localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function refreshAccessToken(apiBaseUrl: string) {
  if (refreshBlockedUntilLogin) return null;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        setAccessToken(null);
        refreshBlockedUntilLogin = true;
        return null;
      }

      const payload = await response.json();
      const token = payload?.data?.accessToken as string | undefined;
      if (token) {
        setAccessToken(token);
        return token;
      }
      refreshBlockedUntilLogin = true;
      return null;
    } catch {
      setAccessToken(null);
      refreshBlockedUntilLogin = true;
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
