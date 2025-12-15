import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { BalanceHistoryEntry, ReconciliationHistory } from "../../types";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api";

// Types
export interface BalanceHistoryState {
  entries: BalanceHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: BalanceHistoryState = {
  entries: [],
  isLoading: false,
  error: null,
  lastFetched: null,
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

// Helper function to transform ReconciliationHistory to BalanceHistoryEntry
function transformReconciliationHistory(
  data: ReconciliationHistory[]
): BalanceHistoryEntry[] {
  return data.map((item) => ({
    id: item.id.toString(),
    date: item.date,
    shift: item.shift,
    totalFloat: item.total_float,
    totalCash: item.total_cash,
    totalCommissions: item.total_commissions,
    expectedClosing: item.expected_closing,
    actualClosing: item.actual_closing,
    variance: item.variance,
    status: item.status,
    isFinalized: item.is_finalized,
    reconciledBy: item.reconciled_by,
    reconciledAt: item.reconciled_at,
  }));
}

// Async thunks
export const fetchBalanceHistory = createAsyncThunk(
  "balanceHistory/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // Fetch reconciliation history from the API
      const data = await apiRequest<ReconciliationHistory[]>(
        API_ENDPOINTS.reconciliations.history
      );

      // Transform to BalanceHistoryEntry format
      const history = transformReconciliationHistory(data);

      return history;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch balance history"
      );
    }
  }
);

// Slice
const balanceHistorySlice = createSlice({
  name: "balanceHistory",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalanceHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBalanceHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchBalanceHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = balanceHistorySlice.actions;
export default balanceHistorySlice.reducer;
