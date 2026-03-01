import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  Commission,
  CommissionCreate,
  CommissionUpdate,
  CommissionFilters,
  BulkCommissionUpdate,
  BulkCommissionUpdateResponse,
  DraftCommissionEntry,
} from "@/types";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import { enterAgency, exitAgency } from "./authSlice";
import { isDeviceOffline } from "@/utils/offlineCheck";
import type { RootState } from "../index";

// Types
export interface CommissionsState {
  items: Commission[];
  selectedCommission: Commission | null;
  totalAmount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: CommissionFilters;
  draftEntries: DraftCommissionEntry[];
}

const initialState: CommissionsState = {
  items: [],
  selectedCommission: null,
  totalAmount: 0,
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

// Async thunks
export const fetchCommissions = createAsyncThunk<
  Commission[],
  CommissionFilters & { forceRefresh?: boolean },
  { state: RootState; rejectValue: string }
>(
  "commissions/fetchAll",
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      // Get companyId from auth state - use viewingAgencyId if superadmin viewing agency
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      // Offline bypass — return persisted data when no connectivity
      const offline = await isDeviceOffline();
      if (offline) {
        if (state.commissions.items.length > 0) {
          return state.commissions.items;
        }
        return rejectWithValue("You're offline and no cached data is available.");
      }

      const { forceRefresh, ...filterParams } = filters;

      // Check cache - skip fetch if data is fresh
      const { lastFetched, items, filters: cachedFilters } = state.commissions;
      const isCacheValid =
        lastFetched && Date.now() - lastFetched < CACHE_DURATION;
      const isSameFilters =
        JSON.stringify(cachedFilters) === JSON.stringify(filterParams);

      if (!forceRefresh && isCacheValid && isSameFilters && items.length > 0) {
        return items;
      }

      // Build query with camelCase filters, convert to snake_case for API
      const query = buildTypedQueryString({
        ...filterParams,
        companyId,
      });

      const commissions = await apiRequest<Commission[]>(
        `${API_ENDPOINTS.commissions.list}${query}`,
      );
      return commissions;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch commissions",
      );
    }
  },
);

export const fetchCommissionById = createAsyncThunk<
  Commission,
  number,
  { rejectValue: string }
>("commissions/fetchById", async (id, { rejectWithValue }) => {
  try {
    const commission = await apiRequest<Commission>(
      API_ENDPOINTS.commissions.get(id),
    );
    return commission;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch commission",
    );
  }
});

export const createCommission = createAsyncThunk<
  Commission,
  CommissionCreate,
  { rejectValue: string }
>("commissions/create", async (data, { rejectWithValue }) => {
  try {
    const commission = await apiRequest<Commission>(
      API_ENDPOINTS.commissions.create,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return commission;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create commission",
    );
  }
});

export const createCommissionsBulk = createAsyncThunk<
  Commission[],
  CommissionCreate[],
  { rejectValue: string }
>("commissions/createBulk", async (data, { rejectWithValue }) => {
  try {
    const response = await apiRequest<
      Commission[] | { commissions: Commission[] }
    >(API_ENDPOINTS.commissions.bulk, {
      method: "POST",
      body: JSON.stringify({ commissions: mapApiRequest(data) }),
    });

    // Backend may return array directly or wrapped in { commissions: [] }
    if (Array.isArray(response)) {
      return response;
    } else if (response && Array.isArray(response.commissions)) {
      return response.commissions;
    } else {
      console.error("[CommissionsSlice] Invalid response structure:", response);
      throw new Error("Invalid response from server");
    }
  } catch (error) {
    console.error("[CommissionsSlice] Bulk create error:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create commissions",
    );
  }
});

export const updateCommissionsBulk = createAsyncThunk<
  BulkCommissionUpdateResponse,
  BulkCommissionUpdate,
  { rejectValue: string }
>("commissions/updateBulk", async (data, { rejectWithValue }) => {
  try {
    const response = await apiRequest<BulkCommissionUpdateResponse>(
      API_ENDPOINTS.commissions.bulkUpdate,
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return response;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update commissions",
    );
  }
});

export const updateCommission = createAsyncThunk<
  Commission,
  { id: number; data: CommissionUpdate },
  { rejectValue: string }
>("commissions/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const commission = await apiRequest<Commission>(
      API_ENDPOINTS.commissions.update(id),
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return commission;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update commission",
    );
  }
});

export const deleteCommission = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>("commissions/delete", async (id, { rejectWithValue }) => {
  try {
    await apiRequest<void>(API_ENDPOINTS.commissions.delete(id), {
      method: "DELETE",
    });
    return id;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete commission",
    );
  }
});

// Slice
const commissionsSlice = createSlice({
  name: "commissions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<CommissionFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedCommission: (state) => {
      state.selectedCommission = null;
    },
    saveDraftEntries: (state, action: PayloadAction<DraftCommissionEntry[]>) => {
      state.draftEntries = action.payload;
    },
    clearDraftEntries: (state) => {
      state.draftEntries = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchCommissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        fetchCommissions.fulfilled,
        (
          state,
          action: PayloadAction<
            Commission[],
            string,
            { arg: CommissionFilters & { forceRefresh?: boolean } }
          >,
        ) => {
          state.isLoading = false;
          state.items = action.payload;
          state.totalAmount = action.payload.reduce(
            (sum, commission) => sum + Number(commission.amount),
            0,
          );
          state.lastFetched = Date.now();
          // Update filters to match what was fetched (excluding forceRefresh)
          const { forceRefresh, ...filterParams } = action.meta.arg;
          state.filters = filterParams;
        },
      )
      .addCase(fetchCommissions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchCommissionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCommissionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCommission = action.payload;
      })
      .addCase(fetchCommissionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createCommission.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCommission.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.totalAmount += Number(action.payload.amount);
      })
      .addCase(createCommission.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create Bulk
    builder
      .addCase(createCommissionsBulk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCommissionsBulk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = [...action.payload, ...state.items];
        const bulkTotal = action.payload.reduce(
          (sum, commission) => sum + Number(commission.amount),
          0,
        );
        state.totalAmount += bulkTotal;
      })
      .addCase(createCommissionsBulk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateCommission.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          const oldAmount = Number(state.items[index].amount);
          state.items[index] = action.payload;
          state.totalAmount =
            state.totalAmount - oldAmount + Number(action.payload.amount);
        }
        if (state.selectedCommission?.id === action.payload.id) {
          state.selectedCommission = action.payload;
        }
      })
      .addCase(updateCommission.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteCommission.fulfilled, (state, action) => {
        const deletedCommission = state.items.find(
          (item) => item.id === action.payload,
        );
        if (deletedCommission) {
          state.totalAmount -= Number(deletedCommission.amount);
        }
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedCommission?.id === action.payload) {
          state.selectedCommission = null;
        }
      })
      .addCase(deleteCommission.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Invalidate cache when SuperAdmin switches agencies
    builder
      .addCase(enterAgency, (state) => {
        state.lastFetched = null;
      })
      .addCase(exitAgency, (state) => {
        state.lastFetched = null;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearSelectedCommission,
  saveDraftEntries,
  clearDraftEntries,
} = commissionsSlice.actions;
export default commissionsSlice.reducer;
