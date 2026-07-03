type ShopPilotErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ShopPilotEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ShopPilotErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __shopPilotEvents?: ShopPilotEvents;
  }
}

export function reportShopPilotError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__shopPilotEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
