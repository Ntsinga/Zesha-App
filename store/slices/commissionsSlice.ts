import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Commission,
  CommissionCreate,
  CommissionUpdate,
  CommissionFilters,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface CommissionsState {
  items: Commission[];
  selectedCommission: Commission | null;
  totalAmount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: CommissionFilters;
}

const initialState: CommissionsState = {
  items: [],
  selectedCommission: null,
  totalAmount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
  filters: {},
};

// API helper
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Async thunks
export const fetchCommissions = createAsyncThunk(
  "commissions/fetchAll",
  async (filters: CommissionFilters = {}, { getState, rejectWithValue }) => {
    try {
      // Get company_id from auth state
      const state = getState() as any;
      const companyId = state.auth?.user?.company_id;

      if (!companyId) {
        return rejectWithValue("No company_id found. Please log in again.");
      }

      // Add company_id to filters
      const filtersWithCompany = {
        ...filters,
        company_id: companyId,
      };

      const query = buildQueryString(filtersWithCompany);
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

export const fetchCommissionById = createAsyncThunk(
  "commissions/fetchById",
  async (id: number, { rejectWithValue }) => {
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
  },
);

export const createCommission = createAsyncThunk(
  "commissions/create",
  async (data: CommissionCreate, { rejectWithValue }) => {
    try {
      const commission = await apiRequest<Commission>(
        API_ENDPOINTS.commissions.create,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return commission;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create commission",
      );
    }
  },
);

export const createCommissionsBulk = createAsyncThunk(
  "commissions/createBulk",
  async (data: CommissionCreate[], { rejectWithValue }) => {
    try {
      console.log(
        "[CommissionsSlice] Bulk create payload:",
        JSON.stringify({ commissions: data }, null, 2),
      );
      const response = await apiRequest<{ commissions: Commission[] }>(
        API_ENDPOINTS.commissions.bulk,
        {
          method: "POST",
          body: JSON.stringify({ commissions: data }),
        },
      );
      console.log("[CommissionsSlice] Bulk create response:", response);

      if (!response || !response.commissions) {
        console.error(
          "[CommissionsSlice] Invalid response structure:",
          response,
        );
        throw new Error("Invalid response from server");
      }

      return response.commissions;
    } catch (error) {
      console.error("[CommissionsSlice] Bulk create error:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create commissions",
      );
    }
  },
);

export const updateCommission = createAsyncThunk(
  "commissions/update",
  async (
    { id, data }: { id: number; data: CommissionUpdate },
    { rejectWithValue },
  ) => {
    try {
      const commission = await apiRequest<Commission>(
        API_ENDPOINTS.commissions.update(id),
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      return commission;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update commission",
      );
    }
  },
);

export const deleteCommission = createAsyncThunk(
  "commissions/delete",
  async (id: number, { rejectWithValue }) => {
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
  },
);

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
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchCommissions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCommissions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.totalAmount = action.payload.reduce(
          (sum, commission) => sum + Number(commission.amount),
          0,
        );
        state.lastFetched = Date.now();
      })
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
  },
});

export const { clearError, setFilters, clearFilters, clearSelectedCommission } =
  commissionsSlice.actions;
export default commissionsSlice.reducer;
