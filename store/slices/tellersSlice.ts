import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type {
  Teller,
  TellerCreate,
  TellerUpdate,
  TellerDetail,
  TellerFilters,
  TellerAccountAssignmentCreate,
  TellerAccountAssignmentEnd,
  TellerAccountAssignmentRead,
  TellerUserAssignmentCreate,
  TellerUserAssignmentEnd,
  TellerUserAssignmentRead,
} from "@/types";
import { buildTypedQueryString, mapApiResponse, mapApiRequest } from "@/types";

import type { RootState } from "../index";

export interface TellersState {
  items: Teller[];
  selectedTeller: TellerDetail | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: TellersState = {
  items: [],
  selectedTeller: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<unknown>(endpoint, options);
  return mapApiResponse<T>(data);
}

// ── Teller CRUD ─────────────────────────────────────────────────────────────

export const fetchTellers = createAsyncThunk<
  Teller[],
  TellerFilters | undefined,
  { state: RootState; rejectValue: string }
>("tellers/fetchAll", async (filters = {}, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId =
      filters?.companyId ??
      state.auth.viewingAgencyId ??
      state.auth.user?.companyId ??
      undefined;

    const query = buildTypedQueryString({ ...filters, companyId });
    return await apiRequest<Teller[]>(`${API_ENDPOINTS.tellers.list}${query}`);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch tellers",
    );
  }
});

export const fetchTellerDetail = createAsyncThunk<
  TellerDetail,
  number,
  { state: RootState; rejectValue: string }
>("tellers/fetchDetail", async (tellerId, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = state.auth.viewingAgencyId ?? state.auth.user?.companyId;
    const query = buildTypedQueryString({ companyId });
    return await apiRequest<TellerDetail>(
      `${API_ENDPOINTS.tellers.get(tellerId)}${query}`,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch teller detail",
    );
  }
});

export const createTeller = createAsyncThunk<
  Teller,
  TellerCreate,
  { state: RootState; rejectValue: string }
>("tellers/create", async (payload, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId =
      payload.companyId ||
      state.auth.viewingAgencyId ||
      state.auth.user?.companyId;

    if (!companyId) return rejectWithValue("No company_id found");

    return await apiRequest<Teller>(API_ENDPOINTS.tellers.create, {
      method: "POST",
      body: JSON.stringify(mapApiRequest({ ...payload, companyId })),
    });
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create teller",
    );
  }
});

export const updateTeller = createAsyncThunk<
  Teller,
  { tellerId: number; data: TellerUpdate },
  { state: RootState; rejectValue: string }
>(
  "tellers/update",
  async ({ tellerId, data }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId ?? state.auth.user?.companyId;
      const query = buildTypedQueryString({ companyId });
      return await apiRequest<Teller>(
        `${API_ENDPOINTS.tellers.update(tellerId)}${query}`,
        {
          method: "PATCH",
          body: JSON.stringify(mapApiRequest(data)),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update teller",
      );
    }
  },
);

export const deleteTeller = createAsyncThunk<
  void,
  number,
  { state: RootState; rejectValue: string }
>("tellers/delete", async (tellerId, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = state.auth.viewingAgencyId ?? state.auth.user?.companyId;
    const query = buildTypedQueryString({ companyId });
    await secureApiRequest<void>(
      `${API_ENDPOINTS.tellers.delete(tellerId)}${query}`,
      { method: "DELETE" },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete teller",
    );
  }
});

// ── Account Assignments ─────────────────────────────────────────────────────

export const assignAccountToTeller = createAsyncThunk<
  TellerAccountAssignmentRead,
  TellerAccountAssignmentCreate,
  { state: RootState; rejectValue: string }
>("tellers/assignAccount", async (data, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = state.auth.viewingAgencyId ?? state.auth.user?.companyId;
    const query = buildTypedQueryString({ companyId });
    return await apiRequest<TellerAccountAssignmentRead>(
      `${API_ENDPOINTS.tellers.assignAccount}${query}`,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to assign account",
    );
  }
});

export const endAccountAssignment = createAsyncThunk<
  TellerAccountAssignmentRead,
  { assignmentId: number; data: TellerAccountAssignmentEnd },
  { state: RootState; rejectValue: string }
>(
  "tellers/endAccountAssignment",
  async ({ assignmentId, data }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId ?? state.auth.user?.companyId;
      const query = buildTypedQueryString({ companyId });
      return await apiRequest<TellerAccountAssignmentRead>(
        `${API_ENDPOINTS.tellers.endAccountAssignment(assignmentId)}${query}`,
        {
          method: "PATCH",
          body: JSON.stringify(mapApiRequest(data)),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to end account assignment",
      );
    }
  },
);

// ── User Assignments ────────────────────────────────────────────────────────

export const assignUserToTeller = createAsyncThunk<
  TellerUserAssignmentRead,
  TellerUserAssignmentCreate,
  { state: RootState; rejectValue: string }
>("tellers/assignUser", async (data, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = state.auth.viewingAgencyId ?? state.auth.user?.companyId;
    const query = buildTypedQueryString({ companyId });
    return await apiRequest<TellerUserAssignmentRead>(
      `${API_ENDPOINTS.tellers.assignUser}${query}`,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to assign user",
    );
  }
});

export const endUserAssignment = createAsyncThunk<
  TellerUserAssignmentRead,
  { assignmentId: number; data: TellerUserAssignmentEnd },
  { state: RootState; rejectValue: string }
>(
  "tellers/endUserAssignment",
  async ({ assignmentId, data }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId ?? state.auth.user?.companyId;
      const query = buildTypedQueryString({ companyId });
      return await apiRequest<TellerUserAssignmentRead>(
        `${API_ENDPOINTS.tellers.endUserAssignment(assignmentId)}${query}`,
        {
          method: "PATCH",
          body: JSON.stringify(mapApiRequest(data)),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to end user assignment",
      );
    }
  },
);

// ── Slice ───────────────────────────────────────────────────────────────────

const tellersSlice = createSlice({
  name: "tellers",
  initialState,
  reducers: {
    clearTellers(state) {
      state.items = [];
      state.selectedTeller = null;
      state.error = null;
      state.lastFetched = null;
    },
    clearSelectedTeller(state) {
      state.selectedTeller = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTellers
      .addCase(fetchTellers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTellers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchTellers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch tellers";
      })
      // fetchTellerDetail
      .addCase(fetchTellerDetail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTellerDetail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedTeller = action.payload;
      })
      .addCase(fetchTellerDetail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch teller detail";
      })
      // createTeller
      .addCase(createTeller.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // updateTeller
      .addCase(updateTeller.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedTeller?.id === action.payload.id) {
          state.selectedTeller = {
            ...state.selectedTeller,
            ...action.payload,
          };
        }
      })
      // deleteTeller
      .addCase(deleteTeller.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.meta.arg);
        if (state.selectedTeller?.id === action.meta.arg) {
          state.selectedTeller = null;
        }
      })
      // assignAccount
      .addCase(assignAccountToTeller.fulfilled, (state, action) => {
        if (
          state.selectedTeller &&
          state.selectedTeller.id === action.payload.tellerId
        ) {
          state.selectedTeller.assignedAccounts.push(action.payload);
        }
      })
      // endAccountAssignment
      .addCase(endAccountAssignment.fulfilled, (state, action) => {
        if (state.selectedTeller) {
          const idx = state.selectedTeller.assignedAccounts.findIndex(
            (a) => a.id === action.payload.id,
          );
          if (idx !== -1) {
            state.selectedTeller.assignedAccounts[idx] = action.payload;
          }
        }
      })
      // assignUser
      .addCase(assignUserToTeller.fulfilled, (state, action) => {
        if (
          state.selectedTeller &&
          state.selectedTeller.id === action.payload.tellerId
        ) {
          state.selectedTeller.assignedUsers.push(action.payload);
        }
      })
      // endUserAssignment
      .addCase(endUserAssignment.fulfilled, (state, action) => {
        if (state.selectedTeller) {
          const idx = state.selectedTeller.assignedUsers.findIndex(
            (u) => u.id === action.payload.id,
          );
          if (idx !== -1) {
            state.selectedTeller.assignedUsers[idx] = action.payload;
          }
        }
      });
  },
});

export const { clearTellers, clearSelectedTeller } = tellersSlice.actions;
export default tellersSlice.reducer;
