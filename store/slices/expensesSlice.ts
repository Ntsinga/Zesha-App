import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseFilters,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface ExpensesState {
  items: Expense[];
  selectedExpense: Expense | null;
  totalAmount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: ExpenseFilters;
}

const initialState: ExpensesState = {
  items: [],
  selectedExpense: null,
  totalAmount: 0,
  isLoading: false,
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
export const fetchExpenses = createAsyncThunk(
  "expenses/fetchAll",
  async (filters: ExpenseFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const expenses = await apiRequest<Expense[]>(
        `${API_ENDPOINTS.expenses.list}${query}`
      );
      return expenses;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch expenses"
      );
    }
  }
);

export const fetchExpenseById = createAsyncThunk(
  "expenses/fetchById",
  async (id: number, { rejectWithValue }) => {
    try {
      const expense = await apiRequest<Expense>(API_ENDPOINTS.expenses.get(id));
      return expense;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch expense"
      );
    }
  }
);

export const createExpense = createAsyncThunk(
  "expenses/create",
  async (data: ExpenseCreate, { rejectWithValue }) => {
    try {
      const expense = await apiRequest<Expense>(API_ENDPOINTS.expenses.create, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return expense;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create expense"
      );
    }
  }
);

export const updateExpense = createAsyncThunk(
  "expenses/update",
  async (
    { id, data }: { id: number; data: ExpenseUpdate },
    { rejectWithValue }
  ) => {
    try {
      const expense = await apiRequest<Expense>(
        API_ENDPOINTS.expenses.update(id),
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      return expense;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update expense"
      );
    }
  }
);

export const deleteExpense = createAsyncThunk(
  "expenses/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest<void>(API_ENDPOINTS.expenses.delete(id), {
        method: "DELETE",
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete expense"
      );
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
    setFilters: (state, action: PayloadAction<ExpenseFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedExpense: (state) => {
      state.selectedExpense = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchExpenses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.totalAmount = action.payload.reduce(
          (sum, expense) => sum + Number(expense.amount),
          0
        );
        state.lastFetched = Date.now();
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchExpenseById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenseById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedExpense = action.payload;
      })
      .addCase(fetchExpenseById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createExpense.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.totalAmount += Number(action.payload.amount);
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateExpense.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          const oldAmount = Number(state.items[index].amount);
          state.items[index] = action.payload;
          state.totalAmount =
            state.totalAmount - oldAmount + Number(action.payload.amount);
        }
        if (state.selectedExpense?.id === action.payload.id) {
          state.selectedExpense = action.payload;
        }
      })
      .addCase(updateExpense.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteExpense.fulfilled, (state, action) => {
        const deletedExpense = state.items.find(
          (item) => item.id === action.payload
        );
        if (deletedExpense) {
          state.totalAmount -= Number(deletedExpense.amount);
        }
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedExpense?.id === action.payload) {
          state.selectedExpense = null;
        }
      })
      .addCase(deleteExpense.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearFilters, clearSelectedExpense } =
  expensesSlice.actions;
export default expensesSlice.reducer;
