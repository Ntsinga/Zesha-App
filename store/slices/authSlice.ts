import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_BASE_URL, API_HEADERS } from "../../config/api";

// Types - aligned with backend User model
export interface User {
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

// Request types for syncing with backend
export interface UserSyncRequest {
  clerk_user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  profile_image_url?: string | null;
  phone_number?: string | null;
  metadata?: string | null;
}

export interface AuthState {
  user: User | null;
  clerkUserId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  clerkUserId: null,
  isAuthenticated: false,
  isLoading: false,
  isSyncing: false,
  isInitialized: false,
  error: null,
};

// Secure storage helpers (with web fallback)
const USER_KEY = "backend_user";
const CLERK_USER_ID_KEY = "clerk_user_id";

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// Async thunks
export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_, { rejectWithValue }) => {
    try {
      const clerkUserId = await getSecureItem(CLERK_USER_ID_KEY);
      const userJson = await getSecureItem(USER_KEY);

      if (clerkUserId && userJson) {
        const user = JSON.parse(userJson) as User;
        return { clerkUserId, user };
      }
      return null;
    } catch (error) {
      return rejectWithValue("Failed to initialize auth");
    }
  }
);

// Sync user with backend after Clerk authentication
export const syncUserWithBackend = createAsyncThunk(
  "auth/syncUser",
  async (syncData: UserSyncRequest, { rejectWithValue }) => {
    try {
      console.log("[Auth Sync] Syncing to:", `${API_BASE_URL}/users/sync`);
      console.log("[Auth Sync] Sync data:", syncData);

      const response = await fetch(`${API_BASE_URL}/users/sync`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify(syncData),
      });

      console.log("[Auth Sync] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("[Auth Sync] Error response:", errorData);
        throw new Error(
          errorData.detail || `Sync failed with status ${response.status}`
        );
      }

      const user: User = await response.json();
      console.log("[Auth Sync] User synced successfully:", user.id);

      // Store user data locally
      await setSecureItem(USER_KEY, JSON.stringify(user));
      await setSecureItem(CLERK_USER_ID_KEY, syncData.clerk_user_id);

      return user;
    } catch (error) {
      console.error("[Auth Sync] Error:", error);
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to sync user with backend"
      );
    }
  }
);

// Get user from backend by Clerk ID
export const fetchUserByClerkId = createAsyncThunk(
  "auth/fetchUser",
  async (clerkUserId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/users/clerk/${clerkUserId}`,
        {
          headers: API_HEADERS,
        }
      );

      if (response.status === 404) {
        // User doesn't exist in backend yet
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Fetch failed with status ${response.status}`
        );
      }

      const user: User = await response.json();

      // Store user data locally
      await setSecureItem(USER_KEY, JSON.stringify(user));
      await setSecureItem(CLERK_USER_ID_KEY, clerkUserId);

      return user;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch user"
      );
    }
  }
);

// Update user profile on backend
export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    { userId, data }: { userId: number; data: Partial<User> },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: API_HEADERS,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Update failed with status ${response.status}`
        );
      }

      const user: User = await response.json();

      // Store updated user data locally
      await setSecureItem(USER_KEY, JSON.stringify(user));

      return user;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    }
  }
);

// Clear local auth data (used when Clerk signs out)
export const clearLocalAuth = createAsyncThunk("auth/clearLocal", async () => {
  await deleteSecureItem(CLERK_USER_ID_KEY);
  await deleteSecureItem(USER_KEY);
});

// Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = action.payload !== null;
    },
    setClerkUserId: (state, action: PayloadAction<string | null>) => {
      state.clerkUserId = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Initialize auth
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        if (action.payload) {
          state.user = action.payload.user;
          state.clerkUserId = action.payload.clerkUserId;
          state.isAuthenticated = true;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
      });

    // Sync user with backend
    builder
      .addCase(syncUserWithBackend.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
      })
      .addCase(syncUserWithBackend.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.user = action.payload;
        state.clerkUserId = action.payload.clerk_user_id;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(syncUserWithBackend.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.payload as string;
      });

    // Fetch user by Clerk ID
    builder
      .addCase(fetchUserByClerkId.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserByClerkId.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload;
          state.clerkUserId = action.payload.clerk_user_id;
          state.isAuthenticated = true;
        }
        state.error = null;
      })
      .addCase(fetchUserByClerkId.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update user profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Clear local auth
    builder.addCase(clearLocalAuth.fulfilled, (state) => {
      state.user = null;
      state.clerkUserId = null;
      state.isAuthenticated = false;
      state.error = null;
    });
  },
});

export const { clearError, setUser, setClerkUserId } = authSlice.actions;
export default authSlice.reducer;
