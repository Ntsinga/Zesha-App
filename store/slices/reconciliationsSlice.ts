import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Reconciliation,
  ReconciliationCreate,
  ReconciliationUpdate,
  ReconciliationFilters,
  ReconciliationSummary,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface ReconciliationsState {
  items: Reconciliation[];
  selectedReconciliation: Reconciliation | null;
  summary: ReconciliationSummary | null;
  isLoading: boolean;
  isPerforming: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: ReconciliationFilters;
}

const initialState: ReconciliationsState = {
  items: [],
  selectedReconciliation: null,
  summary: null,
  isLoading: false,
  isPerforming: false,
  error: null,
  lastFetched: null,
  filters: {},
};

// API helper
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
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
export const fetchReconciliations = createAsyncThunk(
  "reconciliations/fetchAll",
  async (filters: ReconciliationFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const reconciliations = await apiRequest<Reconciliation[]>(
        `${API_ENDPOINTS.reconciliations.list}${query}`
      );
      return reconciliations;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliations"
      );
    }
  }
);

export const fetchReconciliationById = createAsyncThunk(
  "reconciliations/fetchById",
  async (id: number, { rejectWithValue }) => {
    try {
      const reconciliation = await apiRequest<Reconciliation>(
        API_ENDPOINTS.reconciliations.get(id)
      );
      return reconciliation;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliation"
      );
    }
  }
);

export const createReconciliation = createAsyncThunk(
  "reconciliations/create",
  async (data: ReconciliationCreate, { rejectWithValue }) => {
    try {
      const reconciliation = await apiRequest<Reconciliation>(
        API_ENDPOINTS.reconciliations.create,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      return reconciliation;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create reconciliation"
      );
    }
  }
);

export const updateReconciliation = createAsyncThunk(
  "reconciliations/update",
  async (
    { id, data }: { id: number; data: ReconciliationUpdate },
    { rejectWithValue }
  ) => {
    try {
      const reconciliation = await apiRequest<Reconciliation>(
        API_ENDPOINTS.reconciliations.update(id),
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      return reconciliation;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to update reconciliation"
      );
    }
  }
);

export const deleteReconciliation = createAsyncThunk(
  "reconciliations/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest<void>(API_ENDPOINTS.reconciliations.delete(id), {
        method: "DELETE",
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to delete reconciliation"
      );
    }
  }
);

// Special reconciliation endpoints
export const performReconciliation = createAsyncThunk(
  "reconciliations/perform",
  async (
    params: { shift: "AM" | "PM"; date?: string },
    { rejectWithValue }
  ) => {
    try {
      const query = buildQueryString(params);
      const reconciliation = await apiRequest<Reconciliation>(
        `${API_ENDPOINTS.reconciliations.perform}${query}`,
        {
          method: "POST",
        }
      );
      return reconciliation;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to perform reconciliation"
      );
    }
  }
);

export const fetchReconciliationSummary = createAsyncThunk(
  "reconciliations/fetchSummary",
  async (
    params: { date_from?: string; date_to?: string } = {},
    { rejectWithValue }
  ) => {
    try {
      const query = buildQueryString(params);
      const summary = await apiRequest<ReconciliationSummary>(
        `${API_ENDPOINTS.reconciliations.summary}${query}`
      );
      return summary;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliation summary"
      );
    }
  }
);

// Slice
const reconciliationsSlice = createSlice({
  name: "reconciliations",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<ReconciliationFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedReconciliation: (state) => {
      state.selectedReconciliation = null;
    },
    clearSummary: (state) => {
      state.summary = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchReconciliations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReconciliations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchReconciliations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchReconciliationById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReconciliationById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedReconciliation = action.payload;
      })
      .addCase(fetchReconciliationById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createReconciliation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createReconciliation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createReconciliation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateReconciliation.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedReconciliation?.id === action.payload.id) {
          state.selectedReconciliation = action.payload;
        }
      })
      .addCase(updateReconciliation.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteReconciliation.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedReconciliation?.id === action.payload) {
          state.selectedReconciliation = null;
        }
      })
      .addCase(deleteReconciliation.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Perform reconciliation
    builder
      .addCase(performReconciliation.pending, (state) => {
        state.isPerforming = true;
        state.error = null;
      })
      .addCase(performReconciliation.fulfilled, (state, action) => {
        state.isPerforming = false;
        state.items.unshift(action.payload);
        state.selectedReconciliation = action.payload;
      })
      .addCase(performReconciliation.rejected, (state, action) => {
        state.isPerforming = false;
        state.error = action.payload as string;
      });

    // Fetch summary
    builder
      .addCase(fetchReconciliationSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReconciliationSummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchReconciliationSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearSelectedReconciliation,
  clearSummary,
} = reconciliationsSlice.actions;
export default reconciliationsSlice.reducer;
