/**
 * Secure API Client with Clerk Authentication
 *
 * This module provides authenticated API requests using Clerk JWT tokens.
 * All API calls should go through this client to ensure proper authentication.
 */

import { API_BASE_URL, API_HEADERS, buildQueryString } from "../config/api";
import { addApiBreadcrumb } from "../config/sentry";

// Token getter function - will be set by the auth provider
let getAuthToken: (() => Promise<string | null>) | null = null;
let authRecoveryHandler: ((error: ApiError) => void | Promise<void>) | null =
  null;
const MAX_TOKEN_RETRIEVAL_ATTEMPTS = 2;
const TOKEN_RETRIEVAL_TIMEOUT_MS = 10_000;

/**
 * Race a promise against a timeout.  Rejects with a descriptive error if
 * the promise does not settle within `ms` milliseconds.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Initialize the secure API client with a token getter function.
 * This should be called once when the app loads with Clerk's getToken function.
 */
export function initializeSecureApi(tokenGetter: () => Promise<string | null>) {
  getAuthToken = tokenGetter;
}

export function registerAuthRecoveryHandler(
  handler: ((error: ApiError) => void | Promise<void>) | null,
): void {
  authRecoveryHandler = handler;
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
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildMissingAuthError(details?: unknown): ApiError {
  return new ApiError(
    "Session expired.",
    401,
    "AUTH_TOKEN_UNAVAILABLE",
    details,
  );
}

function buildAuthNotInitializedError(details?: unknown): ApiError {
  return new ApiError(
    "Authentication is still initializing.",
    0,
    "AUTH_NOT_INITIALIZED",
    details,
  );
}

function notifyAuthRecovery(error: ApiError): void {
  if (!authRecoveryHandler) {
    return;
  }

  Promise.resolve(authRecoveryHandler(error)).catch((handlerError) => {
    console.error("[SecureApi] Auth recovery handler failed:", handlerError);
  });
}

function formatValidationLocation(loc?: unknown): string | null {
  if (!Array.isArray(loc) || loc.length === 0) {
    return null;
  }

  const parts = loc.filter((part): part is string | number => {
    return typeof part === "string" || typeof part === "number";
  });

  if (parts.length === 0) {
    return null;
  }

  return parts.join(".");
}

function formatApiErrorMessage(detail: unknown): string {
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => {
        if (entry && typeof entry === "object") {
          const validationEntry = entry as {
            msg?: string;
            loc?: unknown;
            message?: string;
          };
          const location = formatValidationLocation(validationEntry.loc);
          const message =
            validationEntry.msg ??
            validationEntry.message ??
            JSON.stringify(entry);

          return location ? `${location}: ${message}` : message;
        }

        return typeof entry === "string" ? entry : JSON.stringify(entry);
      })
      .join("; ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  return JSON.stringify(detail);
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
    throw buildAuthNotInitializedError("Token getter not initialized");
  }

  let lastTokenError: unknown = null;

  for (let attempt = 0; attempt < MAX_TOKEN_RETRIEVAL_ATTEMPTS; attempt++) {
    try {
      const token = await withTimeout(
        getAuthToken(),
        TOKEN_RETRIEVAL_TIMEOUT_MS,
        "getAuthToken",
      );
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }

      lastTokenError = "Token getter returned no token";
    } catch (error) {
      lastTokenError = error;

      if (__DEV__) {
        console.error("[SecureApi] Failed to get auth token:", error);
      }
    }

    if (attempt < MAX_TOKEN_RETRIEVAL_ATTEMPTS - 1) {
      continue;
    }
  }

  throw buildMissingAuthError(
    lastTokenError instanceof Error
      ? lastTokenError.message
      : lastTokenError ?? "Token retrieval failed",
  );
}

function buildRequestHeaders(
  options: RequestInit,
  authHeaders: Record<string, string>,
): Headers {
  const isMultipartBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const defaultHeaders = isMultipartBody
    ? Object.fromEntries(
        Object.entries(API_HEADERS).filter(
          ([key]) => key.toLowerCase() !== "content-type",
        ),
      )
    : API_HEADERS;

  const headers = new Headers(defaultHeaders);

  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (options.headers) {
    new Headers(options.headers).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
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
  try {
    const authHeaders = await getAuthHeaders();
    const headers = buildRequestHeaders(options, authHeaders);
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      notifyAuthRecovery(new ApiError("Session expired.", 401, "UNAUTHORIZED"));
    }

    return response;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.code === "AUTH_TOKEN_UNAVAILABLE"
    ) {
      notifyAuthRecovery(error);
    }

    throw error;
  }
}

// Transient HTTP status codes that are worth retrying
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5_000;
const REQUEST_TIMEOUT_MS = 15_000;

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
 *
 * @param timeoutMs - Override the default 30s timeout (e.g. pass 60_000 for bulk operations)
 */
export async function secureApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const url = `${API_BASE_URL.replace(/\/$/, "")}${endpoint}`;
  let lastError: ApiError | null = null;
  const method = ((options.method as string) || "GET").toUpperCase();
  const isMutating = MUTATING_METHODS.has(method);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const authHeaders = await getAuthHeaders();
      const headers = buildRequestHeaders(options, authHeaders);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      });

      // Handle authentication errors — not retryable
      if (response.status === 401) {
        throw new ApiError(
          "Session expired.",
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
        const retryDetail =
          errorData.detail ?? errorData.message ?? `HTTP ${response.status}`;
        const retryMessage = formatApiErrorMessage(retryDetail);
        lastError = new ApiError(
          retryMessage,
          response.status,
          "TRANSIENT",
          retryDetail,
        );
        await retryDelay(getRetryDelay(attempt));
        continue;
      }

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Request failed" }));
        // FastAPI returns validation errors as an array in `detail`.
        // Flatten it to a readable string instead of letting it become "[object Object]".
        const detail =
          errorData.detail ?? errorData.message ?? `HTTP ${response.status}`;
        const message = formatApiErrorMessage(detail);
        addApiBreadcrumb(method, endpoint, response.status);
        throw new ApiError(message, response.status, undefined, detail);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        addApiBreadcrumb(method, endpoint, 204);
        return undefined as T;
      }

      addApiBreadcrumb(method, endpoint, response.status);
      return await response.json();
    } catch (error) {
      // Handle AbortController timeout
      // Use duck-typing check because DOMException doesn't exist in React Native (Hermes)
      if (error instanceof Error && error.name === "AbortError") {
        const timeoutError = new ApiError(
          `Request timed out after ${timeoutMs / 1000}s`,
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
        if (
          error.code === "UNAUTHORIZED" ||
          error.code === "FORBIDDEN" ||
          error.code === "AUTH_NOT_INITIALIZED" ||
          error.code === "AUTH_TOKEN_UNAVAILABLE"
        ) {
          if (
            error.code === "UNAUTHORIZED" ||
            error.code === "AUTH_TOKEN_UNAVAILABLE"
          ) {
            notifyAuthRecovery(error);
          }
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
  throw (
    lastError ??
    new ApiError("Request failed after retries", 0, "RETRY_EXHAUSTED")
  );
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
