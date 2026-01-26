import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseFilters,
} from "@/types";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type { RootState } from "../index";

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

// API helper - now uses secure authenticated requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options);
  return mapApiResponse<T>(data);
}

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30 * 1000;

// Async thunks
export const fetchExpenses = createAsyncThunk<
  Expense[],
  ExpenseFilters & { forceRefresh?: boolean },
  { state: RootState; rejectValue: string }
>("expenses/fetchAll", async (filters = {}, { getState, rejectWithValue }) => {
  try {
    // Get companyId from auth state - use viewingAgencyId if superadmin viewing agency
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    const { forceRefresh, ...filterParams } = filters;

    // Check cache - skip fetch if data is fresh
    const { lastFetched, items, filters: cachedFilters } = state.expenses;
    const isCacheValid =
      lastFetched && Date.now() - lastFetched < CACHE_DURATION;
    const isSameFilters =
      JSON.stringify(cachedFilters) === JSON.stringify(filterParams);

    if (!forceRefresh && isCacheValid && isSameFilters && items.length > 0) {
      console.log(
        "[Expenses] Using cached data, age:",
        Date.now() - lastFetched,
        "ms",
      );
      return items;
    }

    // Build query with camelCase filters, convert to snake_case for API
    const query = buildTypedQueryString({
      ...filterParams,
      companyId,
    });

    const expenses = await apiRequest<Expense[]>(
      `${API_ENDPOINTS.expenses.list}${query}`,
    );
    return expenses;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch expenses",
    );
  }
});

export const fetchExpenseById = createAsyncThunk<
  Expense,
  number,
  { rejectValue: string }
>("expenses/fetchById", async (id, { rejectWithValue }) => {
  try {
    const expense = await apiRequest<Expense>(API_ENDPOINTS.expenses.get(id));
    return expense;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch expense",
    );
  }
});

export const createExpense = createAsyncThunk<
  Expense,
  ExpenseCreate,
  { rejectValue: string }
>("expenses/create", async (data, { rejectWithValue }) => {
  try {
    const expense = await apiRequest<Expense>(API_ENDPOINTS.expenses.create, {
      method: "POST",
      body: JSON.stringify(mapApiRequest(data)),
    });
    return expense;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create expense",
    );
  }
});

export const updateExpense = createAsyncThunk<
  Expense,
  { id: number; data: ExpenseUpdate },
  { state: RootState; rejectValue: string }
>("expenses/update", async ({ id, data }, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    const expense = await apiRequest<Expense>(
      API_ENDPOINTS.expenses.update(id, companyId),
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return expense;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update expense",
    );
  }
});

export const deleteExpense = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: string }
>("expenses/delete", async (id, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    await apiRequest<void>(API_ENDPOINTS.expenses.delete(id, companyId), {
      method: "DELETE",
    });
    return id;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete expense",
    );
  }
});

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
          0,
        );
        state.lastFetched = Date.now();
        // Store filters for cache comparison
        const { forceRefresh, ...filterParams } = action.meta.arg;
        state.filters = filterParams;
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
          (item) => item.id === action.payload.id,
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
          (item) => item.id === action.payload,
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
