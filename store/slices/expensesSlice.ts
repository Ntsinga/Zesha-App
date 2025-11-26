import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Types
export interface Expense {
  id: string;
  category: string;
  amount: number;
  percentage: number;
  color: string;
  icon?: string;
}

export interface ExpensesState {
  items: Expense[];
  totalExpenses: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  selectedPeriod: "week" | "month" | "year";
}

const initialState: ExpensesState = {
  items: [],
  totalExpenses: 0,
  isLoading: false,
  error: null,
  lastFetched: null,
  selectedPeriod: "month",
};

// Mock data for development
const mockExpenses: Expense[] = [
  {
    id: "1",
    category: "Food & Dining",
    amount: 8500,
    percentage: 26,
    color: "#EF4444",
  },
  {
    id: "2",
    category: "Transportation",
    amount: 4200,
    percentage: 13,
    color: "#F97316",
  },
  {
    id: "3",
    category: "Entertainment",
    amount: 3500,
    percentage: 11,
    color: "#EAB308",
  },
  {
    id: "4",
    category: "Shopping",
    amount: 6800,
    percentage: 21,
    color: "#22C55E",
  },
  {
    id: "5",
    category: "Bills & Utilities",
    amount: 5500,
    percentage: 17,
    color: "#3B82F6",
  },
  {
    id: "6",
    category: "Healthcare",
    amount: 2000,
    percentage: 6,
    color: "#8B5CF6",
  },
  { id: "7", category: "Other", amount: 2000, percentage: 6, color: "#6B7280" },
];

// Async thunks
export const fetchExpenses = createAsyncThunk(
  "expenses/fetch",
  async (period: "week" | "month" | "year" = "month", { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 600));

      const totalExpenses = mockExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );

      return { expenses: mockExpenses, totalExpenses };
    } catch (error) {
      return rejectWithValue("Failed to fetch expenses");
    }
  }
);

// Slice
const expensesSlice = createSlice({
  name: "expenses",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setPeriod: (state, action: PayloadAction<"week" | "month" | "year">) => {
      state.selectedPeriod = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.expenses;
        state.totalExpenses = action.payload.totalExpenses;
        state.lastFetched = Date.now();
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setPeriod } = expensesSlice.actions;
export default expensesSlice.reducer;
