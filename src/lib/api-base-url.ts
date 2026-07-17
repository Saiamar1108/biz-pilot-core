const LOCAL_API_URL = "http://localhost:5001";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function resolveApiBaseUrl() {
  const configured = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || "");

  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (!isLocalHost) {
      return trimTrailingSlash(origin);
    }
  }

  return LOCAL_API_URL;
}
