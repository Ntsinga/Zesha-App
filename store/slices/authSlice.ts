import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,
};

// Secure storage helpers (with web fallback)
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

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
      const token = await getSecureItem(TOKEN_KEY);
      const userJson = await getSecureItem(USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        return { token, user };
      }
      return null;
    } catch (error) {
      return rejectWithValue("Failed to initialize auth");
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (
    credentials: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      // TODO: Replace with actual API call
      // Simulating API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock successful login
      if (
        credentials.email === "demo@example.com" &&
        credentials.password === "password"
      ) {
        const user: User = {
          id: "1",
          email: credentials.email,
          name: "Demo User",
        };
        const token = "mock_jwt_token_" + Date.now();

        // Store credentials securely
        await setSecureItem(TOKEN_KEY, token);
        await setSecureItem(USER_KEY, JSON.stringify(user));

        return { user, token };
      }

      return rejectWithValue("Invalid email or password");
    } catch (error) {
      return rejectWithValue("Login failed. Please try again.");
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (
    data: { email: string; password: string; name: string },
    { rejectWithValue }
  ) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const user: User = {
        id: Date.now().toString(),
        email: data.email,
        name: data.name,
      };
      const token = "mock_jwt_token_" + Date.now();

      await setSecureItem(TOKEN_KEY, token);
      await setSecureItem(USER_KEY, JSON.stringify(user));

      return { user, token };
    } catch (error) {
      return rejectWithValue("Registration failed. Please try again.");
    }
  }
);

export const logout = createAsyncThunk("auth/logout", async () => {
  await deleteSecureItem(TOKEN_KEY);
  await deleteSecureItem(USER_KEY);
});

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (data: Partial<User>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const currentUser = state.auth.user;

      if (!currentUser) {
        return rejectWithValue("No user logged in");
      }

      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const updatedUser: User = { ...currentUser, ...data };
      await setSecureItem(USER_KEY, JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      return rejectWithValue("Failed to update profile");
    }
  }
);

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
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isInitialized = true;
      });

    // Login
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
