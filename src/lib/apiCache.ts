import { QueryClient } from "@tanstack/react-query";

// Global QueryClient instance shared across the application
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

// Cache strategy stale and gc times as specified in the requirements
export const CACHE_SETTINGS = {
  products: { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  customers: { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  invoices: { staleTime: 2 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  analytics: { staleTime: 30 * 1000, gcTime: 15 * 60 * 1000 },
  settings: { staleTime: 30 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  notifications: { staleTime: 30 * 1000, gcTime: 15 * 60 * 1000 },
  suppliers: { staleTime: 10 * 60 * 1000, gcTime: 15 * 60 * 1000 },
  purchaseOrders: { staleTime: 2 * 60 * 1000, gcTime: 15 * 60 * 1000 },
};

const listeners: Record<string, Set<() => void>> = {};
const inFlightBackgroundFetches: Record<string, Promise<any> | null> = {};

// Register cache update listeners (to reload layout/views silently)
export function subscribeToCache(key: string, callback: () => void) {
  if (!listeners[key]) {
    listeners[key] = new Set();
  }
  listeners[key].add(callback);
  return () => {
    listeners[key].delete(callback);
  };
}

export function notifyCacheUpdate(key: string) {
  if (listeners[key]) {
    listeners[key].forEach((callback) => {
      try {
        callback();
      } catch (e) {
        console.error(`Error in cache listener for ${key}:`, e);
      }
    });
  }
}

// Invalidation helper to clear cache keys on mutations
export function invalidateCache(key: string) {
  queryClient.invalidateQueries({ queryKey: [key] });
  queryClient.removeQueries({ queryKey: [key] });
  // Clear any parameterized queries of this base key
  inFlightBackgroundFetches[key] = null;
  // Also clean parameter variations from in-flight maps
  Object.keys(inFlightBackgroundFetches).forEach((k) => {
    if (k.startsWith(`["${key}"`) || k.startsWith(`["${key},`)) {
      inFlightBackgroundFetches[k] = null;
    }
  });
}

// Smart Caching layer with synchronous resolve, deduplication, and silent background updates
export async function cachedFetch<T>(
  baseKey: string,
  fetchFn: () => Promise<T>,
  params?: any
): Promise<T> {
  const settings = CACHE_SETTINGS[baseKey as keyof typeof CACHE_SETTINGS] || {
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  };

  const queryKey = params ? [baseKey, params] : [baseKey];
  const keyStr = JSON.stringify(queryKey);

  const state = queryClient.getQueryState<T>(queryKey);
  const cachedData = queryClient.getQueryData<T>(queryKey);

  if (cachedData !== undefined) {
    const isStale = !state || Date.now() - state.dataUpdatedAt >= settings.staleTime;

    if (isStale && !inFlightBackgroundFetches[keyStr]) {
      const fetchPromise = (async () => {
        try {
          const freshData = await fetchFn();
          const oldDataStr = JSON.stringify(cachedData);
          const newDataStr = JSON.stringify(freshData);

          if (oldDataStr !== newDataStr) {
            queryClient.setQueryData(queryKey, freshData);
            notifyCacheUpdate(baseKey);
          }
        } catch (err) {
          console.error(`Background refresh failed for key ${keyStr}:`, err);
        } finally {
          inFlightBackgroundFetches[keyStr] = null;
        }
      })();

      inFlightBackgroundFetches[keyStr] = fetchPromise;
    }

    return cachedData;
  }

  if (inFlightBackgroundFetches[keyStr]) {
    return inFlightBackgroundFetches[keyStr] as Promise<T>;
  }

  const firstFetchPromise = (async () => {
    try {
      const freshData = await fetchFn();
      queryClient.setQueryData(queryKey, freshData);
      return freshData;
    } finally {
      inFlightBackgroundFetches[keyStr] = null;
    }
  })();

  inFlightBackgroundFetches[keyStr] = firstFetchPromise;
  return firstFetchPromise;
}
