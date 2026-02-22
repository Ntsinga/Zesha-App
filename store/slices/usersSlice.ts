import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { UserInviteRequest, UserInviteResponse, mapApiRequest } from "../../types";
import { secureApiRequest } from "../../services/secureApi";

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

// API helper - now uses secure authenticated requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  return secureApiRequest<T>(endpoint, options);
}

// Async thunks
export const inviteUser = createAsyncThunk(
  "users/invite",
  async (inviteData: UserInviteRequest, { rejectWithValue }) => {
    try {
      const response = await apiRequest<UserInviteResponse>("/users/invite", {
        method: "POST",
        body: JSON.stringify(mapApiRequest(inviteData)),
      });
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to send invitation",
      );
    }
  },
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
