import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditLogListResponse,
} from "@/types";
import { buildTypedQueryString, mapApiResponse } from "@/types";

import type { RootState } from "../index";

export interface AuditLogsState {
  items: AuditLogEntry[];
  total: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: AuditLogFilters;
}

const initialState: AuditLogsState = {
  items: [],
  total: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
  filters: {},
};

async function apiRequest<T>(endpoint: string): Promise<T> {
  const data = await secureApiRequest<unknown>(endpoint);
  return mapApiResponse<T>(data);
}

export const fetchAuditLogs = createAsyncThunk<
  AuditLogListResponse,
  AuditLogFilters,
  { state: RootState; rejectValue: string }
>("auditLogs/fetchAll", async (filters = {}, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId =
      filters.companyId ??
      state.auth.viewingAgencyId ??
      state.auth.user?.companyId ??
      undefined;

    const query = buildTypedQueryString({
      ...filters,
      companyId,
      skip: filters.skip ?? 0,
      limit: filters.limit ?? 50,
    });
    return await apiRequest<AuditLogListResponse>(
      `${API_ENDPOINTS.auditLogs.list}${query}`,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch audit logs",
    );
  }
});

const auditLogsSlice = createSlice({
  name: "auditLogs",
  initialState,
  reducers: {
    clearAuditLogs(state) {
      state.items = [];
      state.total = 0;
      state.error = null;
      state.lastFetched = null;
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        state.filters = action.meta.arg;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch audit logs";
      });
  },
});

export const { clearAuditLogs } = auditLogsSlice.actions;
export default auditLogsSlice.reducer;
