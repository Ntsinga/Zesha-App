import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  ExpectedCommission,
  ExpectedCommissionFilters,
  CommissionTotals,
  CommissionTotalsFilters,
  CommissionAccountBreakdown,
  CommissionBreakdownFilters,
} from "@/types";
import { mapApiResponse, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import { isDeviceOffline } from "@/utils/offlineCheck";
import type { RootState } from "../index";

export interface ExpectedCommissionsState {
  items: ExpectedCommission[];
  totals: CommissionTotals | null;
  breakdown: CommissionAccountBreakdown[];
  isTotalsLoading: boolean;
  isBreakdownLoading: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: ExpectedCommissionsState = {
  items: [],
  totals: null,
  breakdown: [],
  isTotalsLoading: false,
  isBreakdownLoading: false,
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

const CACHE_DURATION = 30 * 1000;

export const fetchCommissionTotals = createAsyncThunk<
  CommissionTotals,
  CommissionTotalsFilters,
  { state: RootState; rejectValue: string }
>(
  "expectedCommissions/fetchTotals",
  async (filters, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const query = buildTypedQueryString({
        companyId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        ...(filters.shift ? { shift: filters.shift } : {}),
      });

      const data = await apiRequest<CommissionTotals>(
        `${API_ENDPOINTS.expectedCommissions.totals}${query}`,
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch commission totals",
      );
    }
  },
);

export const fetchCommissionBreakdown = createAsyncThunk<
  CommissionAccountBreakdown[],
  CommissionBreakdownFilters,
  { state: RootState; rejectValue: string }
>(
  "expectedCommissions/fetchBreakdown",
  async (filters, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const query = buildTypedQueryString({
        companyId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        ...(filters.shift ? { shift: filters.shift } : {}),
      });

      return await apiRequest<CommissionAccountBreakdown[]>(
        `${API_ENDPOINTS.expectedCommissions.breakdown}${query}`,
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch commission breakdown",
      );
    }
  },
);

export const fetchExpectedCommissions = createAsyncThunk<
  ExpectedCommission[],
  ExpectedCommissionFilters & { forceRefresh?: boolean },
  { state: RootState; rejectValue: string }
>(
  "expectedCommissions/fetchAll",
  async (filters, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const offline = await isDeviceOffline();
      if (offline) {
        if (state.expectedCommissions.items.length > 0) {
          return state.expectedCommissions.items;
        }
        return rejectWithValue(
          "You're offline and no cached data is available.",
        );
      }

      const { forceRefresh, ...filterParams } = filters;

      const { lastFetched, items } = state.expectedCommissions;
      const isCacheValid =
        lastFetched && Date.now() - lastFetched < CACHE_DURATION;

      if (!forceRefresh && isCacheValid) {
        return items;
      }

      const query = buildTypedQueryString({
        ...filterParams,
        companyId,
        limit: 500,
      });

      const records = await apiRequest<ExpectedCommission[]>(
        `${API_ENDPOINTS.expectedCommissions.list}${query}`,
      );
      return records;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch expected commissions",
      );
    }
  },
);

const expectedCommissionsSlice = createSlice({
  name: "expectedCommissions",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpectedCommissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpectedCommissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchExpectedCommissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unknown error";
      })
      .addCase(fetchCommissionTotals.pending, (state) => {
        state.isTotalsLoading = true;
      })
      .addCase(fetchCommissionTotals.fulfilled, (state, action) => {
        state.isTotalsLoading = false;
        state.totals = action.payload;
      })
      .addCase(fetchCommissionTotals.rejected, (state) => {
        state.isTotalsLoading = false;
      })
      .addCase(fetchCommissionBreakdown.pending, (state) => {
        state.isBreakdownLoading = true;
      })
      .addCase(fetchCommissionBreakdown.fulfilled, (state, action) => {
        state.isBreakdownLoading = false;
        state.breakdown = action.payload;
      })
      .addCase(fetchCommissionBreakdown.rejected, (state) => {
        state.isBreakdownLoading = false;
      });
  },
});

export const { clearError } = expectedCommissionsSlice.actions;
export default expectedCommissionsSlice.reducer;
