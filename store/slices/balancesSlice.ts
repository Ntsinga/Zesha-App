import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Balance,
  BalanceCreate,
  BalanceUpdate,
  BalanceFilters,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface BalancesState {
  items: Balance[];
  selectedBalance: Balance | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: BalanceFilters;
}

const initialState: BalancesState = {
  items: [],
  selectedBalance: null,
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
export const fetchBalances = createAsyncThunk(
  "balances/fetchAll",
  async (filters: BalanceFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const balances = await apiRequest<Balance[]>(
        `${API_ENDPOINTS.balances.list}${query}`
      );
      return balances;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch balances"
      );
    }
  }
);

export const fetchBalanceById = createAsyncThunk(
  "balances/fetchById",
  async (id: number, { rejectWithValue }) => {
    try {
      const balance = await apiRequest<Balance>(API_ENDPOINTS.balances.get(id));
      return balance;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch balance"
      );
    }
  }
);

export const createBalance = createAsyncThunk(
  "balances/create",
  async (data: BalanceCreate, { rejectWithValue }) => {
    try {
      const balance = await apiRequest<Balance>(API_ENDPOINTS.balances.create, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return balance;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create balance"
      );
    }
  }
);

export const updateBalance = createAsyncThunk(
  "balances/update",
  async (
    { id, data }: { id: number; data: BalanceUpdate },
    { rejectWithValue }
  ) => {
    try {
      const balance = await apiRequest<Balance>(
        API_ENDPOINTS.balances.update(id),
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      return balance;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update balance"
      );
    }
  }
);

export const deleteBalance = createAsyncThunk(
  "balances/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest<void>(API_ENDPOINTS.balances.delete(id), {
        method: "DELETE",
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete balance"
      );
    }
  }
);

// Slice
const balancesSlice = createSlice({
  name: "balances",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<BalanceFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedBalance: (state) => {
      state.selectedBalance = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchBalances.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBalances.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchBalances.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchBalanceById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBalanceById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedBalance = action.payload;
      })
      .addCase(fetchBalanceById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createBalance.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateBalance.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedBalance?.id === action.payload.id) {
          state.selectedBalance = action.payload;
        }
      })
      .addCase(updateBalance.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteBalance.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedBalance?.id === action.payload) {
          state.selectedBalance = null;
        }
      })
      .addCase(deleteBalance.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearFilters, clearSelectedBalance } =
  balancesSlice.actions;
export default balancesSlice.reducer;
