/**
 * Shared API utilities and helpers.
 *
 * Note: Most API calls are made directly from Redux slices using their own
 * apiRequest helpers. This file contains shared utilities and specialized APIs.
 */

import { API_BASE_URL, API_HEADERS } from "../config/api";

// Error class for API errors
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_HEADERS,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ detail: "Request failed" }));
      throw new ApiError(
        errorData.detail || errorData.message || `HTTP ${response.status}`,
        response.status
      );
    }

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
      0
    );
  }
}

// User types for API
export interface UserResponse {
  id: number;
  clerk_user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  phone_number?: string | null;
  role: string;
  is_active: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  metadata?: string | null;
}

export interface UserSyncRequest {
  clerk_user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  phone_number?: string | null;
  metadata?: string | null;
}

// Users API - syncs with Clerk user data
export const usersApi = {
  // Sync user from Clerk (upsert - create or update)
  sync: (data: UserSyncRequest) =>
    fetchApi<UserResponse>("/users/sync", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get user by Clerk user ID
  getByClerkId: (clerkUserId: string) =>
    fetchApi<UserResponse>(`/users/clerk/${clerkUserId}`),

  // Get user by internal ID
  getById: (userId: number) => fetchApi<UserResponse>(`/users/${userId}`),
};
