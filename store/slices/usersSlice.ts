import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { API_BASE_URL } from "../../config/api";

// Types
export interface UserInviteRequest {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  role: string;
  redirect_url?: string;
}

export interface UserInviteResponse {
  success: boolean;
  message: string;
  clerk_user_id?: string;
  invitation_id?: string;
  email: string;
}

export interface UsersState {
  isInviting: boolean;
  inviteSuccess: boolean;
  inviteError: string | null;
  lastInvitedEmail: string | null;
}

const initialState: UsersState = {
  isInviting: false,
  inviteSuccess: false,
  inviteError: null,
  lastInvitedEmail: null,
};

// API helper
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// Async thunks
export const inviteUser = createAsyncThunk(
  "users/invite",
  async (inviteData: UserInviteRequest, { rejectWithValue }) => {
    try {
      const response = await apiRequest<UserInviteResponse>("/users/invite", {
        method: "POST",
        body: JSON.stringify(inviteData),
      });
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to send invitation"
      );
    }
  }
);

// Slice
const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearInviteState: (state) => {
      state.inviteSuccess = false;
      state.inviteError = null;
      state.lastInvitedEmail = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Invite user
      .addCase(inviteUser.pending, (state) => {
        state.isInviting = true;
        state.inviteError = null;
        state.inviteSuccess = false;
      })
      .addCase(inviteUser.fulfilled, (state, action) => {
        state.isInviting = false;
        state.inviteSuccess = true;
        state.lastInvitedEmail = action.payload.email;
      })
      .addCase(inviteUser.rejected, (state, action) => {
        state.isInviting = false;
        state.inviteError = action.payload as string;
        state.inviteSuccess = false;
      });
  },
});

export const { clearInviteState } = usersSlice.actions;
export default usersSlice.reducer;
