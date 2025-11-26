import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { AccountSummary } from "../../types";

// Types
export interface DashboardSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  lastUpdated: string;
}

export interface DashboardState {
  summary: DashboardSummary | null;
  accounts: AccountSummary[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: DashboardState = {
  summary: null,
  accounts: [],
  isLoading: false,
  error: null,
  lastFetched: null,
};

// Mock data for development
const mockSummary: DashboardSummary = {
  totalBalance: 125750.0,
  monthlyIncome: 45000.0,
  monthlyExpenses: 32500.0,
  savingsRate: 27.8,
  lastUpdated: new Date().toISOString(),
};

const mockAccounts: AccountSummary[] = [
  { name: "Main Account", balance: 85000, lastAmount: 5000 },
  { name: "Savings", balance: 35000, lastAmount: 2000 },
  { name: "Business", balance: 5750, lastAmount: -1500 },
];

// Async thunks
export const fetchDashboard = createAsyncThunk(
  "dashboard/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      return {
        summary: mockSummary,
        accounts: mockAccounts,
      };
    } catch (error) {
      return rejectWithValue("Failed to fetch dashboard data");
    }
  }
);

export const refreshDashboard = createAsyncThunk(
  "dashboard/refresh",
  async (_, { dispatch }) => {
    return dispatch(fetchDashboard()).unwrap();
  }
);

// Slice
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    updateAccount: (
      state,
      action: PayloadAction<{ name: string; balance: number }>
    ) => {
      const account = state.accounts.find(
        (a) => a.name === action.payload.name
      );
      if (account) {
        account.lastAmount = action.payload.balance - account.balance;
        account.balance = action.payload.balance;
      }
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
        state.summary = action.payload.summary;
        state.accounts = action.payload.accounts;
        state.lastFetched = Date.now();
        state.error = null;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, updateAccount } = dashboardSlice.actions;
export default dashboardSlice.reducer;
