import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  AccountSummary,
  CompanySnapshot,
  DashboardSummary,
  ShiftEnum,
  Balance,
  CompanyInfo,
  CommissionBreakdown,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface DashboardState {
  companyInfo: CompanyInfo | null;
  summary: DashboardSummary | null;
  accounts: AccountSummary[];
  currentShift: ShiftEnum;
  snapshotDate: string;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

// Get current shift based on time of day (AM before 12:00, PM after)
const getCurrentShift = (): ShiftEnum => {
  const hour = new Date().getHours();
  return hour < 12 ? "AM" : "PM";
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0];
};

const initialState: DashboardState = {
  companyInfo: null,
  summary: null,
  accounts: [],
  currentShift: getCurrentShift(),
  snapshotDate: getTodayDate(),
  isLoading: false,
  error: null,
  lastFetched: null,
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

  return response.json();
}

// Thunk params interface
interface FetchDashboardParams {
  companyId?: number;
  date?: string;
  shift?: ShiftEnum;
  source?: "whatsapp" | "mobile_app";
}

// Async thunks
export const fetchDashboard = createAsyncThunk(
  "dashboard/fetch",
  async (params: FetchDashboardParams = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { dashboard: DashboardState };
      const companyId = params.companyId || 1; // Default to company ID 1

      // IMPORTANT: Always default to TODAY if no date is explicitly provided
      // This prevents using stale persisted dates from Redux state
      const snapshotDate = params.date || getTodayDate();
      const shift = params.shift || getCurrentShift();

      // Build query string
      const queryParams: Record<string, string> = {
        snapshot_date: snapshotDate,
        shift: shift,
      };
      if (params.source) {
        queryParams.source = params.source;
      }

      const query = buildQueryString(queryParams);
      const snapshotEndpoint = `${API_ENDPOINTS.companyInfo.snapshot(
        companyId,
      )}${query}`;

      // Fetch snapshot data
      const snapshot = await apiRequest<CompanySnapshot>(snapshotEndpoint);

      // Fetch today's balances for the account list
      const balanceQuery = buildQueryString({
        date_from: snapshotDate,
        date_to: snapshotDate,
        shift: shift,
        company_id: companyId,
      });
      const balances = await apiRequest<Balance[]>(
        `${API_ENDPOINTS.balances.list}${balanceQuery}`,
      );

      // Transform balances to AccountSummary format
      const accounts: AccountSummary[] = balances.map((b) => {
        console.log("[DashboardSlice] Processing balance:", b);
        return {
          account_id: b.account_id,
          account_name: b.account?.name || `Account ${b.account_id}`,
          balance: b.amount,
          shift: b.shift,
          imageUrl: b.image_url,
        };
      });

      // Build summary from snapshot (including commission data)
      const summary: DashboardSummary = {
        totalWorkingCapital: snapshot.company.total_working_capital,
        outstandingBalance: snapshot.company.outstanding_balance,
        totalFloat: snapshot.total_float,
        totalCash: snapshot.total_cash,
        grandTotal: snapshot.grand_total,
        expectedGrandTotal: snapshot.expected_grand_total,
        totalExpenses: snapshot.total_expenses,
        capitalVariance: snapshot.capital_variance,
        // Commission data from backend
        totalCommission: snapshot.total_commission || 0,
        dailyCommission: snapshot.daily_commission || 0,
        commissionBreakdown: snapshot.commission_breakdown || [],
      };

      return {
        companyInfo: snapshot.company,
        summary,
        accounts,
        snapshotDate,
        shift,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard data",
      );
    }
  },
);

export const refreshDashboard = createAsyncThunk(
  "dashboard/refresh",
  async (_, { dispatch }) => {
    return dispatch(fetchDashboard({})).unwrap();
  },
);

// Slice
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setShift: (state, action: PayloadAction<ShiftEnum>) => {
      state.currentShift = action.payload;
    },
    setSnapshotDate: (state, action: PayloadAction<string>) => {
      state.snapshotDate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.isLoading = false;
        state.companyInfo = action.payload.companyInfo;
        state.summary = action.payload.summary;
        state.accounts = action.payload.accounts;
        state.snapshotDate = action.payload.snapshotDate;
        state.currentShift = action.payload.shift;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setShift, setSnapshotDate } = dashboardSlice.actions;
export default dashboardSlice.reducer;
