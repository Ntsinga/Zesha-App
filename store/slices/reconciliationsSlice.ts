import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Reconciliation,
  ReconciliationCreate,
  ReconciliationUpdate,
  ReconciliationFilters,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface ReconciliationsState {
  items: Reconciliation[];
  history: any[]; // History list for the history screen
  selectedReconciliation: Reconciliation | null;
  calculatedResult: any | null; // Result from calculate endpoint
  reconciliationDetails: any | null; // Details for review/detail screens
  isLoading: boolean;
  isCalculating: boolean;
  isFinalizing: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: ReconciliationFilters;
}

const initialState: ReconciliationsState = {
  items: [],
  history: [],
  selectedReconciliation: null,
  calculatedResult: null,
  reconciliationDetails: null,
  isLoading: false,
  isCalculating: false,
  isFinalizing: false,
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

// Fetch reconciliation history (for history list screen)
export const fetchReconciliationHistory = createAsyncThunk(
  "reconciliations/fetchHistory",
  async (
    params: {
      skip?: number;
      limit?: number;
      date_from?: string;
      date_to?: string;
      shift?: "AM" | "PM";
      finalized_only?: boolean;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const query = buildQueryString(params);
      const history = await apiRequest<any[]>(
        `${API_ENDPOINTS.reconciliations.history}${query}`
      );
      return history;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliation history"
      );
    }
  }
);

// Calculate reconciliation for a date/shift
export const calculateReconciliation = createAsyncThunk(
  "reconciliations/calculate",
  async (
    params: { date: string; shift: "AM" | "PM"; user_id?: number },
    { rejectWithValue }
  ) => {
    try {
      const query = params.user_id ? `?user_id=${params.user_id}` : "";
      const result = await apiRequest<any>(
        `${API_ENDPOINTS.reconciliations.calculate(
          params.date,
          params.shift
        )}${query}`,
        {
          method: "POST",
        }
      );
      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to calculate reconciliation"
      );
    }
  }
);

// Finalize reconciliation
export const finalizeReconciliation = createAsyncThunk(
  "reconciliations/finalize",
  async (
    params: {
      date: string;
      shift: "AM" | "PM";
      reconciled_by?: number;
      notes?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const body = {
        reconciled_by: params.reconciled_by,
        notes: params.notes,
      };
      const result = await apiRequest<any>(
        API_ENDPOINTS.reconciliations.finalize(params.date, params.shift),
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to finalize reconciliation"
      );
    }
  }
);

// Approve/reject reconciliation - supervisor/admin only
export const approveReconciliation = createAsyncThunk(
  "reconciliations/approve",
  async (
    params: {
      date: string;
      shift: "AM" | "PM";
      action: "APPROVED" | "REJECTED";
      approved_by: number;
      rejection_reason?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const body: {
        action: "APPROVED" | "REJECTED";
        approved_by: number;
        rejection_reason?: string;
      } = {
        action: params.action,
        approved_by: params.approved_by,
      };
      if (params.action === "REJECTED" && params.rejection_reason) {
        body.rejection_reason = params.rejection_reason;
      }
      const result = await apiRequest<any>(
        API_ENDPOINTS.reconciliations.approve(params.date, params.shift),
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
      return { ...result, action: params.action };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : `Failed to ${params.action.toLowerCase()} reconciliation`
      );
    }
  }
);

// Fetch reconciliation details (for review screen)
export const fetchReconciliationDetails = createAsyncThunk(
  "reconciliations/fetchDetails",
  async (params: { date: string; shift: "AM" | "PM" }, { rejectWithValue }) => {
    try {
      const details = await apiRequest<any>(
        API_ENDPOINTS.reconciliations.details(params.date, params.shift)
      );
      return details;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliation details"
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
    clearCalculatedResult: (state) => {
      state.calculatedResult = null;
    },
    clearReconciliationDetails: (state) => {
      state.reconciliationDetails = null;
    },
    clearHistory: (state) => {
      state.history = [];
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

    // Fetch history
    builder
      .addCase(fetchReconciliationHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReconciliationHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.history = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchReconciliationHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Calculate reconciliation
    builder
      .addCase(calculateReconciliation.pending, (state) => {
        state.isCalculating = true;
        state.error = null;
      })
      .addCase(calculateReconciliation.fulfilled, (state, action) => {
        state.isCalculating = false;
        state.calculatedResult = action.payload;
      })
      .addCase(calculateReconciliation.rejected, (state, action) => {
        state.isCalculating = false;
        state.error = action.payload as string;
      });

    // Finalize reconciliation
    builder
      .addCase(finalizeReconciliation.pending, (state) => {
        state.isFinalizing = true;
        state.error = null;
      })
      .addCase(finalizeReconciliation.fulfilled, (state, action) => {
        state.isFinalizing = false;
        // Update calculatedResult if exists
        if (state.calculatedResult) {
          state.calculatedResult = {
            ...state.calculatedResult,
            data: {
              ...state.calculatedResult.data,
              is_finalized: true,
            },
          };
        }
        // Update reconciliationDetails if exists
        if (state.reconciliationDetails?.reconciliation) {
          state.reconciliationDetails.reconciliation.is_finalized = true;
        }
      })
      .addCase(finalizeReconciliation.rejected, (state, action) => {
        state.isFinalizing = false;
        state.error = action.payload as string;
      });

    // Approve/reject reconciliation
    builder
      .addCase(approveReconciliation.pending, (state) => {
        state.isFinalizing = true;
        state.error = null;
      })
      .addCase(approveReconciliation.fulfilled, (state, action) => {
        state.isFinalizing = false;
        // Update reconciliationDetails if exists
        if (state.reconciliationDetails?.reconciliation) {
          if (action.payload.action === "APPROVED") {
            state.reconciliationDetails.reconciliation.is_approved = true;
            state.reconciliationDetails.reconciliation.approval_status = "APPROVED";
          } else {
            state.reconciliationDetails.reconciliation.is_finalized = false;
            state.reconciliationDetails.reconciliation.approval_status = "REJECTED";
          }
        }
      })
      .addCase(approveReconciliation.rejected, (state, action) => {
        state.isFinalizing = false;
        state.error = action.payload as string;
      });

    // Fetch details
    builder
      .addCase(fetchReconciliationDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchReconciliationDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.reconciliationDetails = action.payload;
      })
      .addCase(fetchReconciliationDetails.rejected, (state, action) => {
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
  clearCalculatedResult,
  clearReconciliationDetails,
  clearHistory,
} = reconciliationsSlice.actions;
export default reconciliationsSlice.reducer;
