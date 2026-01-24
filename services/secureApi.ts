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
    : `${API_BASE_URL}${urlOrEndpoint}`;
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

/**
 * Make an authenticated API request with JSON parsing and error handling
 */
export async function secureApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeaders = await getAuthHeaders();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_HEADERS,
        ...authHeaders,
        ...options.headers,
      },
    });

    // Handle authentication errors
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
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network error occurred",
      0,
      "NETWORK_ERROR",
    );
  }
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
