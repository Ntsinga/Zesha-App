import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  Balance,
  BalanceCreate,
  BalanceUpdate,
  BalanceFilters,
  BulkBalanceCreate,
  BulkBalanceResponse,
  DraftBalanceEntry,
  BulkBalanceUpdate,
  BulkBalanceUpdateResponse,
} from "@/types";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type { RootState } from "../index";

// Types
export interface BalancesState {
  items: Balance[];
  selectedBalance: Balance | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: BalanceFilters;
  draftEntries: DraftBalanceEntry[];
}

const initialState: BalancesState = {
  items: [],
  selectedBalance: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  filters: {},
  draftEntries: [],
};

// API helper - now uses secure authenticated requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options);
  return mapApiResponse<T>(data);
}

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30 * 1000;

// Helper to create a cache key from filters
function createCacheKey(filters: BalanceFilters, companyId: number): string {
  return JSON.stringify({ ...filters, companyId });
}

// Async thunks
export const fetchBalances = createAsyncThunk<
  Balance[],
  BalanceFilters & { forceRefresh?: boolean },
  { state: RootState; rejectValue: string }
>("balances/fetchAll", async (filters = {}, { getState, rejectWithValue }) => {
  try {
    // Get companyId from auth state - use viewingAgencyId if superadmin viewing agency
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    const { forceRefresh, ...filterParams } = filters;

    // Check cache - skip fetch if data is fresh
    const { lastFetched, items, filters: cachedFilters } = state.balances;
    const isCacheValid =
      lastFetched && Date.now() - lastFetched < CACHE_DURATION;
    const isSameFilters =
      JSON.stringify(cachedFilters) === JSON.stringify(filterParams);

    if (!forceRefresh && isCacheValid && isSameFilters && items.length > 0) {
      console.log(
        "[Balances] Using cached data, age:",
        Date.now() - lastFetched,
        "ms",
      );
      return items;
    }

    // Build query with camelCase filters, convert to snake_case for API
    const query = buildTypedQueryString({
      ...filterParams,
      companyId,
    });

    const balances = await apiRequest<Balance[]>(
      `${API_ENDPOINTS.balances.list}${query}`,
    );
    return balances;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch balances",
    );
  }
});

export const fetchBalanceById = createAsyncThunk<
  Balance,
  number,
  { rejectValue: string }
>("balances/fetchById", async (id, { rejectWithValue }) => {
  try {
    const balance = await apiRequest<Balance>(API_ENDPOINTS.balances.get(id));
    return balance;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch balance",
    );
  }
});

export const createBalance = createAsyncThunk<
  Balance,
  BalanceCreate,
  { rejectValue: string }
>("balances/create", async (data, { rejectWithValue }) => {
  try {
    const balance = await apiRequest<Balance>(API_ENDPOINTS.balances.create, {
      method: "POST",
      body: JSON.stringify(mapApiRequest(data)),
    });
    return balance;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create balance",
    );
  }
});

export const createBalancesBulk = createAsyncThunk<
  BulkBalanceResponse,
  BulkBalanceCreate,
  { rejectValue: string }
>("balances/createBulk", async (data, { rejectWithValue }) => {
  try {
    const response = await apiRequest<BulkBalanceResponse>(
      API_ENDPOINTS.balances.bulk,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return response;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create balances",
    );
  }
});

export const updateBalancesBulk = createAsyncThunk<
  BulkBalanceUpdateResponse,
  BulkBalanceUpdate,
  { rejectValue: string }
>("balances/updateBulk", async (data, { rejectWithValue }) => {
  try {
    const response = await apiRequest<BulkBalanceUpdateResponse>(
      API_ENDPOINTS.balances.bulkUpdate,
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return response;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update balances",
    );
  }
});

export const updateBalance = createAsyncThunk<
  Balance,
  { id: number; data: BalanceUpdate },
  { rejectValue: string }
>("balances/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const balance = await apiRequest<Balance>(
      API_ENDPOINTS.balances.update(id),
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return balance;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update balance",
    );
  }
});

export const deleteBalance = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>("balances/delete", async (id, { rejectWithValue }) => {
  try {
    await apiRequest<void>(API_ENDPOINTS.balances.delete(id), {
      method: "DELETE",
    });
    return id;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete balance",
    );
  }
});

// Slice
const balancesSlice = createSlice({
  name: "balances",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<BalanceFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedBalance: (state) => {
      state.selectedBalance = null;
    },
    saveDraftEntries: (state, action: PayloadAction<DraftBalanceEntry[]>) => {
      state.draftEntries = action.payload;
    },
    clearDraftEntries: (state) => {
      state.draftEntries = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchBalances.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchBalances.fulfilled,
        (
          state,
          action: PayloadAction<
            Balance[],
            string,
            { arg: BalanceFilters & { forceRefresh?: boolean } }
          >,
        ) => {
          state.isLoading = false;
          state.items = action.payload;
          state.lastFetched = Date.now();
          // Update filters to match what was fetched (excluding forceRefresh)
          const { forceRefresh, ...filterParams } = action.meta.arg;
          state.filters = filterParams;
        },
      )
      .addCase(fetchBalances.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchBalanceById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBalanceById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedBalance = action.payload;
      })
      .addCase(fetchBalanceById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createBalance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Bulk Create
    builder
      .addCase(createBalancesBulk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBalancesBulk.fulfilled, (state, action) => {
        state.isLoading = false;
        // Add all successfully created balances to the beginning of the list
        state.items.unshift(...action.payload.created);
        // Set error if some failed
        if (action.payload.totalFailed > 0) {
          state.error = `${action.payload.totalFailed} of ${action.payload.totalSubmitted} balances failed to create`;
        }
      })
      .addCase(createBalancesBulk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateBalance.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedBalance?.id === action.payload.id) {
          state.selectedBalance = action.payload;
        }
      })
      .addCase(updateBalance.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteBalance.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedBalance?.id === action.payload) {
          state.selectedBalance = null;
        }
      })
      .addCase(deleteBalance.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearSelectedBalance,
  saveDraftEntries,
  clearDraftEntries,
} = balancesSlice.actions;
export default balancesSlice.reducer;
