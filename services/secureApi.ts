/**
 * Secure API Client with Clerk Authentication
 *
 * This module provides authenticated API requests using Clerk JWT tokens.
 * All API calls should go through this client to ensure proper authentication.
 */

import { API_BASE_URL, API_HEADERS, buildQueryString } from "../config/api";

// Token getter function - will be set by the auth provider
let getAuthToken: (() => Promise<string | null>) | null = null;

/**
 * Initialize the secure API client with a token getter function.
 * This should be called once when the app loads with Clerk's getToken function.
 */
export function initializeSecureApi(tokenGetter: () => Promise<string | null>) {
  getAuthToken = tokenGetter;
}

/**
 * Check if the secure API client is initialized
 */
export function isSecureApiInitialized(): boolean {
  return getAuthToken !== null;
}

// Error class for API errors
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Get authorization headers with JWT token
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!getAuthToken) {
    if (__DEV__) {
      console.warn(
        "[SecureApi] Token getter not initialized - requests will be unauthenticated",
      );
    }
    return {};
  }

  try {
    const token = await getAuthToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (error) {
    if (__DEV__) {
      console.error("[SecureApi] Failed to get auth token:", error);
    }
  }

  return {};
}

/**
 * Make an authenticated fetch request (returns Response object)
 * This is for compatibility with existing code that needs the raw Response.
 * Accepts either a full URL or an endpoint (which will be prefixed with API_BASE_URL)
 */
export async function secureRequest(
  urlOrEndpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  // Check if it's a full URL or an endpoint
  const url = urlOrEndpoint.startsWith("http")
    ? urlOrEndpoint
    : `${API_BASE_URL.replace(/\/$/, "")}${urlOrEndpoint}`;
  const authHeaders = await getAuthHeaders();

  return fetch(url, {
    ...options,
    headers: {
      ...API_HEADERS,
      ...authHeaders,
      ...options.headers,
    },
  });
}

// Transient HTTP status codes that are worth retrying
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;

/** Calculate delay with exponential backoff + jitter */
function getRetryDelay(attempt: number): number {
  const exponential = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const capped = Math.min(exponential, MAX_RETRY_DELAY_MS);
  return Math.round(capped * (0.75 + Math.random() * 0.5));
}

function retryDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an authenticated API request with JSON parsing, error handling,
 * and automatic retry with exponential backoff for transient errors.
 */
export async function secureApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}${endpoint}`;
  let lastError: ApiError | null = null;
  const method = ((options.method as string) || "GET").toUpperCase();
  const isMutating = MUTATING_METHODS.has(method);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const authHeaders = await getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...API_HEADERS,
          ...authHeaders,
          ...options.headers,
        },
      });

      // Handle authentication errors — not retryable
      if (response.status === 401) {
        throw new ApiError(
          "Authentication required. Please sign in again.",
          401,
          "UNAUTHORIZED",
        );
      }

      if (response.status === 403) {
        throw new ApiError(
          "You don't have permission to perform this action.",
          403,
          "FORBIDDEN",
        );
      }

      // Check for retryable server errors
      // Never retry mutating methods on 500 to prevent duplicate data
      if (
        RETRYABLE_STATUS_CODES.has(response.status) &&
        attempt < MAX_RETRIES &&
        !(isMutating && response.status === 500)
      ) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: `HTTP ${response.status}` }));
        lastError = new ApiError(
          errorData.detail || errorData.message || `HTTP ${response.status}`,
          response.status,
          "TRANSIENT",
        );
        await retryDelay(getRetryDelay(attempt));
        continue;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Request failed" }));
        throw new ApiError(
          errorData.detail || errorData.message || `HTTP ${response.status}`,
          response.status,
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      // Handle AbortController timeout
      // Use duck-typing check because DOMException doesn't exist in React Native (Hermes)
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new ApiError(
          `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          0,
          "TIMEOUT",
        );
        if (attempt < MAX_RETRIES && !isMutating) {
          lastError = timeoutError;
          await retryDelay(getRetryDelay(attempt));
          continue;
        }
        throw timeoutError;
      }

      if (error instanceof ApiError) {
        // Don't retry auth errors or non-transient errors
        if (error.code === "UNAUTHORIZED" || error.code === "FORBIDDEN") {
          throw error;
        }
        // Retry transient errors
        if (error.code === "TRANSIENT" && attempt < MAX_RETRIES) {
          continue; // Already delayed above
        }
        // Retry network errors (status 0)
        if (error.status === 0 && attempt < MAX_RETRIES) {
          lastError = error;
          await retryDelay(getRetryDelay(attempt));
          continue;
        }
        throw error;
      }

      // Network-level errors (fetch threw)
      const networkError = new ApiError(
        error instanceof Error ? error.message : "Network error occurred",
        0,
        "NETWORK_ERROR",
      );

      if (attempt < MAX_RETRIES) {
        lastError = networkError;
        await retryDelay(getRetryDelay(attempt));
        continue;
      }

      throw networkError;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // If we exhausted all retries, throw the last error
  throw lastError ?? new ApiError("Request failed after retries", 0, "RETRY_EXHAUSTED");
}

/**
 * Convenience methods for common HTTP verbs
 */
export const secureApi = {
  get: <T>(endpoint: string, params?: Record<string, unknown>) => {
    const query = params ? buildQueryString(params) : "";
    return secureApiRequest<T>(`${endpoint}${query}`);
  },

  post: <T>(endpoint: string, data?: unknown) =>
    secureApiRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown) =>
    secureApiRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    secureApiRequest<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    secureApiRequest<T>(endpoint, {
      method: "DELETE",
    }),
};

export default secureApi;
