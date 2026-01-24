import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  AccountSummary,
  CompanySnapshot,
  DashboardSummary,
  ShiftEnum,
  Balance,
  CompanyInfo,
  CommissionBreakdown,
} from "@/types";
import { mapApiResponse, buildTypedQueryString } from "@/types";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import type { RootState } from "../index";

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

  const data = await response.json();
  return mapApiResponse<T>(data);
}

// Thunk params interface
interface FetchDashboardParams {
  companyId?: number;
  date?: string;
  shift?: ShiftEnum;
  source?: "whatsapp" | "mobile_app";
  forceRefresh?: boolean;
}

// Thunk return type
interface FetchDashboardResult {
  companyInfo: CompanyInfo;
  summary: DashboardSummary;
  accounts: AccountSummary[];
  snapshotDate: string;
  shift: ShiftEnum;
}

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30 * 1000;

// Async thunks
export const fetchDashboard = createAsyncThunk<
  FetchDashboardResult,
  FetchDashboardParams,
  { state: RootState; rejectValue: string }
>("dashboard/fetch", async (params = {}, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = params.companyId || state.auth.user?.companyId || 1;

    // IMPORTANT: Always default to TODAY if no date is explicitly provided
    // This prevents using stale persisted dates from Redux state
    const snapshotDate = params.date || getTodayDate();
    const shift = params.shift || getCurrentShift();

    // Check cache - skip fetch if data is fresh and same params (unless forced)
    if (!params.forceRefresh) {
      const {
        lastFetched,
        snapshotDate: cachedDate,
        currentShift: cachedShift,
      } = state.dashboard;
      const isSameParams = cachedDate === snapshotDate && cachedShift === shift;
      const isCacheValid =
        lastFetched && Date.now() - lastFetched < CACHE_DURATION;

      if (isSameParams && isCacheValid && state.dashboard.summary) {
        console.log(
          "[Dashboard] Using cached data, age:",
          Date.now() - lastFetched,
          "ms",
        );
        return {
          companyInfo: state.dashboard.companyInfo!,
          summary: state.dashboard.summary!,
          accounts: state.dashboard.accounts,
          snapshotDate: cachedDate,
          shift: cachedShift,
        };
      }
    }

    // Build query string
    const queryParams: Record<string, string> = {
      snapshotDate: snapshotDate,
      shift: shift,
    };
    if (params.source) {
      queryParams.source = params.source;
    }

    const query = buildTypedQueryString(queryParams);
    const snapshotEndpoint = `${API_ENDPOINTS.companyInfo.snapshot(
      companyId,
    )}${query}`;

    // Build balance query
    const balanceQuery = buildTypedQueryString({
      dateFrom: snapshotDate,
      dateTo: snapshotDate,
      shift: shift,
      companyId: companyId,
    });

    // Fetch snapshot and balances in PARALLEL for better performance
    console.log("[Dashboard] Fetching data in parallel...");
    const [snapshot, balances] = await Promise.all([
      apiRequest<CompanySnapshot>(snapshotEndpoint),
      apiRequest<Balance[]>(`${API_ENDPOINTS.balances.list}${balanceQuery}`),
    ]);
    console.log("[Dashboard] Parallel fetch complete");

    // Transform balances to AccountSummary format
    const accounts: AccountSummary[] = balances.map((b) => {
      console.log("[DashboardSlice] Processing balance:", b);
      return {
        accountId: b.accountId,
        accountName: b.account?.name || `Account ${b.accountId}`,
        balance: b.amount,
        shift: b.shift,
        imageUrl: b.imageUrl,
      };
    });

    // Build summary from snapshot (including commission data)
    const summary: DashboardSummary = {
      totalWorkingCapital: snapshot.company.totalWorkingCapital,
      outstandingBalance: snapshot.company.outstandingBalance,
      totalFloat: snapshot.totalFloat,
      totalCash: snapshot.totalCash,
      grandTotal: snapshot.grandTotal,
      expectedGrandTotal: snapshot.expectedGrandTotal,
      totalExpenses: snapshot.totalExpenses,
      capitalVariance: snapshot.capitalVariance,
      // Commission data from backend
      totalCommission: snapshot.totalCommission || 0,
      dailyCommission: snapshot.dailyCommission || 0,
      commissionBreakdown: snapshot.commissionBreakdown || [],
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
      error instanceof Error ? error.message : "Failed to fetch dashboard data",
    );
  }
});

export const refreshDashboard = createAsyncThunk<
  FetchDashboardResult,
  void,
  { state: RootState; rejectValue: string }
>("dashboard/refresh", async (_, { dispatch }) => {
  return dispatch(fetchDashboard({})).unwrap();
});

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
