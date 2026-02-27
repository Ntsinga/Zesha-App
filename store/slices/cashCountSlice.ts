import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  CashCount,
  CashCountCreate,
  CashCountUpdate,
  CashCountFilters,
  BulkCashCountResponse,
  ShiftEnum,
} from "@/types";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import { isDeviceOffline } from "@/utils/offlineCheck";
import type { RootState } from "../index";

// Types
export interface CashCountState {
  items: CashCount[];
  selectedCashCount: CashCount | null;
  totalAmount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: CashCountFilters;
}

const initialState: CashCountState = {
  items: [],
  selectedCashCount: null,
  totalAmount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
  filters: {},
};

// API helper - now uses secure authenticated requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options);
  return mapApiResponse<T>(data);
}

// Async thunks
export const fetchCashCounts = createAsyncThunk<
  CashCount[],
  CashCountFilters,
  { state: RootState; rejectValue: string }
>("cashCount/fetchAll", async (filters = {}, { getState, rejectWithValue }) => {
  try {
    // Get companyId from auth state - use viewingAgencyId if superadmin viewing agency
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    // Offline bypass — return persisted data when no connectivity
    const offline = await isDeviceOffline();
    if (offline) {
      if (state.cashCount.items.length > 0) {
        return state.cashCount.items;
      }
      return rejectWithValue("You're offline and no cached data is available.");
    }

    // Build query with camelCase filters, convert to snake_case for API
    const query = buildTypedQueryString({
      ...filters,
      companyId,
    });

    const cashCounts = await apiRequest<CashCount[]>(
      `${API_ENDPOINTS.cashCount.list}${query}`,
    );
    return cashCounts;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch cash counts",
    );
  }
});

export const fetchCashCountById = createAsyncThunk<
  CashCount,
  number,
  { rejectValue: string }
>("cashCount/fetchById", async (id, { rejectWithValue }) => {
  try {
    const cashCount = await apiRequest<CashCount>(
      API_ENDPOINTS.cashCount.get(id),
    );
    return cashCount;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch cash count",
    );
  }
});

export const createCashCount = createAsyncThunk<
  CashCount,
  CashCountCreate,
  { rejectValue: string }
>("cashCount/create", async (data, { rejectWithValue }) => {
  try {
    const cashCount = await apiRequest<CashCount>(
      API_ENDPOINTS.cashCount.create,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return cashCount;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create cash count",
    );
  }
});

export const createManyCashCounts = createAsyncThunk<
  CashCount[],
  CashCountCreate[],
  { rejectValue: string }
>("cashCount/createMany", async (data, { rejectWithValue }) => {
  try {
    const response = await apiRequest<BulkCashCountResponse>(
      API_ENDPOINTS.cashCount.bulk,
      {
        method: "POST",
        body: JSON.stringify({ cash_counts: mapApiRequest(data) }),
      },
    );

    return response.created;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create cash counts",
    );
  }
});

export const updateCashCount = createAsyncThunk<
  CashCount,
  { id: number; companyId: number; data: CashCountUpdate },
  { rejectValue: string }
>("cashCount/update", async ({ id, companyId, data }, { rejectWithValue }) => {
  try {
    const cashCount = await apiRequest<CashCount>(
      `${API_ENDPOINTS.cashCount.update(id)}?company_id=${companyId}`,
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return cashCount;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update cash count",
    );
  }
});

export const deleteCashCount = createAsyncThunk<
  number,
  { id: number; companyId: number },
  { rejectValue: string }
>("cashCount/delete", async ({ id, companyId }, { rejectWithValue }) => {
  try {
    await apiRequest<void>(
      `${API_ENDPOINTS.cashCount.delete(id)}?company_id=${companyId}`,
      { method: "DELETE" },
    );
    return id;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete cash count",
    );
  }
});

export const deleteCashCountsByFilter = createAsyncThunk<
  { deletedCount: number },
  { companyId: number; countDate: string; shift: ShiftEnum },
  { rejectValue: string }
>(
  "cashCount/deleteByFilter",
  async ({ companyId, countDate, shift }, { rejectWithValue }) => {
    try {
      const result = await apiRequest<{ deletedCount: number }>(
        `${API_ENDPOINTS.cashCount.deleteByFilter}?company_id=${companyId}&count_date=${countDate}&shift=${shift}`,
        { method: "DELETE" },
      );
      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete cash counts",
      );
    }
  },
);

// Slice
const cashCountSlice = createSlice({
  name: "cashCount",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<CashCountFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedCashCount: (state) => {
      state.selectedCashCount = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchCashCounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCashCounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.totalAmount = action.payload.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );
        state.lastFetched = Date.now();
      })
      .addCase(fetchCashCounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchCashCountById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCashCountById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCashCount = action.payload;
      })
      .addCase(fetchCashCountById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create single
    builder
      .addCase(createCashCount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCashCount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.totalAmount += Number(action.payload.amount);
      })
      .addCase(createCashCount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create many
    builder
      .addCase(createManyCashCounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createManyCashCounts.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.length > 0) {
          // Replace any existing items for the same date+shift to avoid duplicates
          // when the edit flow deletes-then-recreates (stale items are still in state)
          const newDate = action.payload[0].date;
          const newShift = action.payload[0].shift;
          const otherItems = state.items.filter(
            (item) => item.date !== newDate || item.shift !== newShift,
          );
          state.items = [...action.payload, ...otherItems];
        } else {
          state.items = [...action.payload, ...state.items];
        }
        state.totalAmount = state.items.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );
      })
      .addCase(createManyCashCounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateCashCount.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          const oldAmount = Number(state.items[index].amount);
          state.items[index] = action.payload;
          state.totalAmount =
            state.totalAmount - oldAmount + Number(action.payload.amount);
        }
        if (state.selectedCashCount?.id === action.payload.id) {
          state.selectedCashCount = action.payload;
        }
      })
      .addCase(updateCashCount.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteCashCount.fulfilled, (state, action) => {
        const deletedItem = state.items.find(
          (item) => item.id === action.payload,
        );
        if (deletedItem) {
          state.totalAmount -= Number(deletedItem.amount);
        }
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedCashCount?.id === action.payload) {
          state.selectedCashCount = null;
        }
      })
      .addCase(deleteCashCount.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete by filter (used for edit — wipes the whole shift before re-creating)
    builder
      .addCase(deleteCashCountsByFilter.fulfilled, (_state, _action) => {
        // Don't clear items here — doing so causes a visible flash in the UI
        // while the new items are being created. The list is refreshed by the
        // fetchCashCounts dispatch that follows createManyCashCounts.
      })
      .addCase(deleteCashCountsByFilter.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearFilters, clearSelectedCashCount } =
  cashCountSlice.actions;
export default cashCountSlice.reducer;
