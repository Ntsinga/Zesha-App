import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { secureApiRequest } from "@/services/secureApi";
import type { User, UserSyncRequest, RoleEnum } from "@/types";
import { mapApiResponse, mapApiRequest } from "@/types";

// Re-export for convenience (use types from types.ts)
export type { User, UserSyncRequest };

export interface AuthState {
  user: User | null;
  clerkUserId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  isInitialized: boolean;
  error: string | null;
  // Superadmin agency viewing state
  viewingAgencyId: number | null;
  viewingAgencyName: string | null;
}

const initialState: AuthState = {
  user: null,
  clerkUserId: null,
  isAuthenticated: false,
  isLoading: false,
  isSyncing: false,
  isInitialized: false,
  error: null,
  // Superadmin agency viewing state
  viewingAgencyId: null,
  viewingAgencyName: null,
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
        const rawUser = JSON.parse(userJson);
        // Handle both legacy snake_case and new camelCase stored data
        // by normalizing to camelCase format
        const user = mapApiResponse<User>(rawUser);
        return { clerkUserId, user };
      }
      return null;
    } catch (error) {
      return rejectWithValue("Failed to initialize auth");
    }
  },
);

// Sync user with backend after Clerk authentication
export const syncUserWithBackend = createAsyncThunk(
  "auth/syncUser",
  async (syncData: UserSyncRequest, { rejectWithValue }) => {
    try {
      console.log("[Auth Sync] Syncing to: /users/sync");
      console.log("[Auth Sync] Sync data:", syncData);

      const data = await secureApiRequest<any>("/users/sync", {
        method: "POST",
        body: JSON.stringify(mapApiRequest(syncData)),
      });

      const user: User = mapApiResponse<User>(data);
      console.log("[Auth Sync] User synced successfully:", user.id);

      // Store user data locally
      await setSecureItem(USER_KEY, JSON.stringify(user));
      await setSecureItem(CLERK_USER_ID_KEY, syncData.clerkUserId);

      return user;
    } catch (error) {
      console.error("[Auth Sync] Error:", error);
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to sync user with backend",
      );
    }
  },
);

// Get user from backend by Clerk ID
export const fetchUserByClerkId = createAsyncThunk(
  "auth/fetchUser",
  async (clerkUserId: string, { rejectWithValue }) => {
    try {
      const data = await secureApiRequest<any>(`/users/clerk/${clerkUserId}`);

      const user: User = mapApiResponse<User>(data);

      // Store user data locally
      await setSecureItem(USER_KEY, JSON.stringify(user));
      await setSecureItem(CLERK_USER_ID_KEY, clerkUserId);

      return user;
    } catch (error: any) {
      // Handle 404 - user doesn't exist in backend yet
      if (error?.status === 404) {
        return null;
      }
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch user",
      );
    }
  },
);

// Update user profile on backend
export const updateUserProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    { userId, data }: { userId: number; data: Partial<User> },
    { rejectWithValue },
  ) => {
    try {
      const responseData = await secureApiRequest<any>(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      });

      const user: User = mapApiResponse<User>(responseData);

      // Store updated user data locally
      await setSecureItem(USER_KEY, JSON.stringify(user));

      return user;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    }
  },
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
    // Superadmin actions for viewing agencies
    enterAgency: (
      state,
      action: PayloadAction<{ agencyId: number; agencyName: string }>,
    ) => {
      state.viewingAgencyId = action.payload.agencyId;
      state.viewingAgencyName = action.payload.agencyName;
    },
    exitAgency: (state) => {
      state.viewingAgencyId = null;
      state.viewingAgencyName = null;
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
        state.clerkUserId = action.payload.clerkUserId;
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
          state.clerkUserId = action.payload.clerkUserId;
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

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCompanyId = (state: { auth: AuthState }) =>
  state.auth.user?.companyId ?? null;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
export const selectUserRole = (state: { auth: AuthState }) =>
  state.auth.user?.role ?? null;

// Superadmin selectors
export const selectViewingAgencyId = (state: { auth: AuthState }) =>
  state.auth.viewingAgencyId;
export const selectViewingAgencyName = (state: { auth: AuthState }) =>
  state.auth.viewingAgencyName;
export const selectIsViewingAgency = (state: { auth: AuthState }) =>
  state.auth.viewingAgencyId !== null;

/**
 * Returns the effective company ID for data queries.
 * If superadmin is viewing an agency, returns that agency's ID.
 * Otherwise, returns the user's own company ID.
 */
export const selectEffectiveCompanyId = (state: { auth: AuthState }) =>
  state.auth.viewingAgencyId ?? state.auth.user?.companyId ?? null;

export const { clearError, setUser, setClerkUserId, enterAgency, exitAgency } =
  authSlice.actions;
export default authSlice.reducer;
