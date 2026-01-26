import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  Reconciliation,
  ReconciliationCreate,
  ReconciliationUpdate,
  ReconciliationFilters,
  ReconciliationHistory,
  ReconciliationDetail,
  ReconciliationCalculateParams,
  ReconciliationFinalizeParams,
  ReconciliationApproveParams,
  ReconciliationDetailsParams,
  ReconciliationCalculationResult,
  ApprovalStatusEnum,
  ShiftEnum,
} from "@/types";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type { RootState } from "../index";

// Types
export interface ReconciliationsState {
  items: Reconciliation[];
  history: ReconciliationHistory[];
  selectedReconciliation: Reconciliation | null;
  calculatedResult: ReconciliationCalculationResult | null;
  reconciliationDetails: ReconciliationDetail | null;
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

// API helper - now uses secure authenticated requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options);
  return mapApiResponse<T>(data);
}

// Async thunks
export const fetchReconciliations = createAsyncThunk<
  Reconciliation[],
  ReconciliationFilters,
  { state: RootState; rejectValue: string }
>(
  "reconciliations/fetchAll",
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      // Get companyId from auth state
      const state = getState();
      const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const query = buildTypedQueryString({ ...filters, companyId });
      const reconciliations = await apiRequest<Reconciliation[]>(
        `${API_ENDPOINTS.reconciliations.list}${query}`,
      );
      return reconciliations;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliations",
      );
    }
  },
);

export const fetchReconciliationById = createAsyncThunk<
  Reconciliation,
  number,
  { rejectValue: string }
>("reconciliations/fetchById", async (id, { rejectWithValue }) => {
  try {
    const reconciliation = await apiRequest<Reconciliation>(
      API_ENDPOINTS.reconciliations.get(id),
    );
    return reconciliation;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch reconciliation",
    );
  }
});

export const createReconciliation = createAsyncThunk<
  Reconciliation,
  ReconciliationCreate,
  { rejectValue: string }
>("reconciliations/create", async (data, { rejectWithValue }) => {
  try {
    const reconciliation = await apiRequest<Reconciliation>(
      API_ENDPOINTS.reconciliations.create,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return reconciliation;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to create reconciliation",
    );
  }
});

export const updateReconciliation = createAsyncThunk<
  Reconciliation,
  { id: number; data: ReconciliationUpdate },
  { rejectValue: string }
>("reconciliations/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const reconciliation = await apiRequest<Reconciliation>(
      API_ENDPOINTS.reconciliations.update(id),
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return reconciliation;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to update reconciliation",
    );
  }
});

export const deleteReconciliation = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>("reconciliations/delete", async (id, { rejectWithValue }) => {
  try {
    await apiRequest<void>(API_ENDPOINTS.reconciliations.delete(id), {
      method: "DELETE",
    });
    return id;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to delete reconciliation",
    );
  }
});

// Fetch reconciliation history (for history list screen)
export interface ReconciliationHistoryParams {
  skip?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  shift?: ShiftEnum;
  finalizedOnly?: boolean;
}

export const fetchReconciliationHistory = createAsyncThunk<
  ReconciliationHistory[],
  ReconciliationHistoryParams,
  { state: RootState; rejectValue: string }
>(
  "reconciliations/fetchHistory",
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      // Get companyId from auth state
      const state = getState();
      const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const query = buildTypedQueryString({ ...params, companyId });
      const history = await apiRequest<ReconciliationHistory[]>(
        `${API_ENDPOINTS.reconciliations.history}${query}`,
      );
      return history;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliation history",
      );
    }
  },
);

// Calculate reconciliation for a date/shift
export const calculateReconciliation = createAsyncThunk<
  ReconciliationCalculationResult,
  ReconciliationCalculateParams,
  { state: RootState; rejectValue: string }
>(
  "reconciliations/calculate",
  async (params, { getState, rejectWithValue }) => {
    try {
      // Get companyId from auth state
      const state = getState();
      const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const queryParams: Record<string, string | number> = { companyId };
      if (params.userId) {
        queryParams.userId = params.userId;
      }
      const query = buildTypedQueryString(queryParams);
      const result = await apiRequest<ReconciliationCalculationResult>(
        `${API_ENDPOINTS.reconciliations.calculate(
          params.date,
          params.shift,
        )}${query}`,
        {
          method: "POST",
        },
      );
      return result;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to calculate reconciliation",
      );
    }
  },
);

// Finalize reconciliation
export const finalizeReconciliation = createAsyncThunk<
  Reconciliation,
  ReconciliationFinalizeParams,
  { state: RootState; rejectValue: string }
>("reconciliations/finalize", async (params, { getState, rejectWithValue }) => {
  try {
    // Get companyId from auth state
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    const query = buildTypedQueryString({ companyId });
    const body = {
      reconciledBy: params.reconciledBy,
      notes: params.notes,
    };
    const result = await apiRequest<Reconciliation>(
      `${API_ENDPOINTS.reconciliations.finalize(params.date, params.shift)}${query}`,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(body)),
      },
    );
    return result;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to finalize reconciliation",
    );
  }
});

// Approve/reject reconciliation - supervisor/admin only
export interface ApproveReconciliationParams {
  date: string;
  shift: ShiftEnum;
  action: "APPROVED" | "REJECTED";
  approvedBy: number;
  rejectionReason?: string;
}

export interface ApproveReconciliationResult extends Reconciliation {
  action: "APPROVED" | "REJECTED";
}

export const approveReconciliation = createAsyncThunk<
  ApproveReconciliationResult,
  ApproveReconciliationParams,
  { state: RootState; rejectValue: string }
>("reconciliations/approve", async (params, { getState, rejectWithValue }) => {
  try {
    // Get companyId from auth state
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    const query = buildTypedQueryString({ companyId });
    const body: {
      action: "APPROVED" | "REJECTED";
      approvedBy: number;
      rejectionReason?: string;
    } = {
      action: params.action,
      approvedBy: params.approvedBy,
    };
    if (params.action === "REJECTED" && params.rejectionReason) {
      body.rejectionReason = params.rejectionReason;
    }
    const result = await apiRequest<Reconciliation>(
      `${API_ENDPOINTS.reconciliations.approve(params.date, params.shift)}${query}`,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(body)),
      },
    );
    return { ...result, action: params.action } as ApproveReconciliationResult;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : `Failed to ${params.action.toLowerCase()} reconciliation`,
    );
  }
});

// Fetch reconciliation details (for review screen)
export const fetchReconciliationDetails = createAsyncThunk<
  ReconciliationDetail,
  ReconciliationDetailsParams,
  { state: RootState; rejectValue: string }
>(
  "reconciliations/fetchDetails",
  async (params, { getState, rejectWithValue }) => {
    try {
      // Get companyId from auth state
      const state = getState();
      const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const query = buildTypedQueryString({ companyId });
      const details = await apiRequest<ReconciliationDetail>(
        `${API_ENDPOINTS.reconciliations.details(params.date, params.shift)}${query}`,
      );
      return details;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch reconciliation details",
      );
    }
  },
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
          (item) => item.id === action.payload.id,
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
        // Update reconciliationDetails if exists
        if (state.reconciliationDetails?.reconciliation) {
          state.reconciliationDetails.reconciliation.isFinalized = true;
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
            state.reconciliationDetails.reconciliation.approvalStatus =
              "APPROVED";
          } else {
            state.reconciliationDetails.reconciliation.isFinalized = false;
            state.reconciliationDetails.reconciliation.approvalStatus =
              "REJECTED";
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

// Selectors
// Transform reconciliation history into UI-friendly balance history format
export const selectBalanceHistory = (state: {
  reconciliations: ReconciliationsState;
}) => {
  // Defensive check to prevent errors during state initialization
  if (
    !state ||
    !state.reconciliations ||
    !state.reconciliations.history ||
    !Array.isArray(state.reconciliations.history)
  ) {
    return [];
  }

  return state.reconciliations.history.map((item) => ({
    id: item.id?.toString() || "",
    date: item.date,
    shift: item.shift,
    totalFloat: item.totalFloat,
    totalCash: item.totalCash,
    totalCommissions: item.totalCommissions,
    expectedClosing: item.expectedClosing,
    actualClosing: item.actualClosing,
    variance: item.variance,
    status: item.status,
    isFinalized: item.isFinalized,
    reconciledBy: item.reconciledBy,
    reconciledAt: item.reconciledAt,
  }));
};

export default reconciliationsSlice.reducer;
