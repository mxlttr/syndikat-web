const DEFAULT_DEV_API_URL = "http://localhost:8080";
const DEFAULT_PROD_API_URL = "https://api.syndikat.golf";

type ProductStreamMessage = {
  stores?: string[];
  store?: string;
  products?: unknown[];
};

type ProductStreamCallback = (data: ProductStreamMessage, event: MessageEvent) => void;

type ProductStreamCallbacks = {
  onStart?: ProductStreamCallback;
  onStore?: ProductStreamCallback;
  onStoreError?: ProductStreamCallback;
  onEnd?: ProductStreamCallback;
  onServerError?: ProductStreamCallback;
  onStreamError?: (event: Event) => void;
};

type RatingsRequestOptions = {
  signal?: AbortSignal;
  club?: string;
  division?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export function resolveApiUrl() {
  const configuredUrl = import.meta.env.PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocalhost ? DEFAULT_DEV_API_URL : DEFAULT_PROD_API_URL;
  }

  return DEFAULT_PROD_API_URL;
}

const API_URL = resolveApiUrl();

export function streamProducts(query: string, callbacks: ProductStreamCallbacks = {}) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return null;
  }

  const source = new EventSource(`${API_URL}/products/search-stream/${encodeURIComponent(query)}`, {
    withCredentials: true,
  });

  const parseEventData = (event: MessageEvent): ProductStreamMessage | null => {
    if (typeof event.data !== "string" || !event.data.length) return null;

    try {
      const data: unknown = JSON.parse(event.data);
      return data && typeof data === "object" && !Array.isArray(data) ? (data as ProductStreamMessage) : null;
    } catch (err) {
      window.Sentry?.captureException(new Error("Failed to parse product search event data"));
      console.error("Failed to parse product stream event.", err);
      return null;
    }
  };

  const bind = (eventName: string, callback?: ProductStreamCallback) => {
    if (!callback) return;

    source.addEventListener(eventName, (event) => {
      if (!(event instanceof MessageEvent)) return;
      const data = parseEventData(event);
      if (!data) return;
      callback(data, event);
    });
  };

  bind("start", callbacks.onStart);
  bind("store", callbacks.onStore);
  bind("store-error", callbacks.onStoreError);
  bind("end", callbacks.onEnd);
  bind("error", callbacks.onServerError);

  const onStreamError = callbacks.onStreamError;
  if (onStreamError) {
    source.onerror = (event) => {
      if (event instanceof MessageEvent && typeof event.data === "string" && event.data.length) return;
      onStreamError(event);
    };
  }

  return source;
}

export async function fetchNewestProducts() {
  try {
    const response = await fetch(`${API_URL}/products/feed`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    if (!response.ok) {
      console.error(`Fetch error: ${response.status} ${response.statusText}`);
      return [];
    }
    return await response.json();
  } catch (err) {
    window.Sentry?.captureException(err);
    console.error("Uncaught (in promise) TypeError: NetworkError when attempting to fetch resource.", err);
    return [];
  }
}

export async function fetchRatings({
  signal,
  club = "",
  division = "",
  search = "",
  page = 1,
  pageSize = 50,
}: RatingsRequestOptions = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (club) params.set("club", club);
  if (division && division !== "all") params.set("division", division);
  if (search) params.set("search", search);
  const response = await fetch(`${API_URL}/ratings?${params}`, { signal, credentials: "include" });
  if (!response.ok) {
    throw Object.assign(new Error(`Failed to load ratings: ${response.status}`), { status: response.status });
  }
  const result = await response.json();
  if (!result || !Array.isArray(result.items)) {
    throw new Error("Ratings response has an invalid shape");
  }
  return result;
}

export async function fetchPlayer(id: string, { signal }: { signal?: AbortSignal } = {}) {
  const response = await fetch(`${API_URL}/players/${encodeURIComponent(id)}`, { signal, credentials: "include" });
  if (!response.ok) {
    throw Object.assign(new Error(`Failed to load player: ${response.status}`), { status: response.status });
  }
  return response.json();
}
