import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  CashCount,
  CashCountCreate,
  CashCountUpdate,
  CashCountFilters,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface CashCountState {
  items: CashCount[];
  selectedCashCount: CashCount | null;
  totalAmount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: CashCountFilters;
}

const initialState: CashCountState = {
  items: [],
  selectedCashCount: null,
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
export const fetchCashCounts = createAsyncThunk(
  "cashCount/fetchAll",
  async (filters: CashCountFilters = {}, { rejectWithValue }) => {
    try {
      const query = buildQueryString(filters);
      const cashCounts = await apiRequest<CashCount[]>(
        `${API_ENDPOINTS.cashCount.list}${query}`
      );
      return cashCounts;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch cash counts"
      );
    }
  }
);

export const fetchCashCountById = createAsyncThunk(
  "cashCount/fetchById",
  async (id: number, { rejectWithValue }) => {
    try {
      const cashCount = await apiRequest<CashCount>(
        API_ENDPOINTS.cashCount.get(id)
      );
      return cashCount;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch cash count"
      );
    }
  }
);

export const createCashCount = createAsyncThunk(
  "cashCount/create",
  async (data: CashCountCreate, { rejectWithValue }) => {
    try {
      const cashCount = await apiRequest<CashCount>(
        API_ENDPOINTS.cashCount.create,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      return cashCount;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create cash count"
      );
    }
  }
);

export const createManyCashCounts = createAsyncThunk(
  "cashCount/createMany",
  async (data: CashCountCreate[], { rejectWithValue }) => {
    try {
      const promises = data.map((item) =>
        apiRequest<CashCount>(API_ENDPOINTS.cashCount.create, {
          method: "POST",
          body: JSON.stringify(item),
        })
      );
      const cashCounts = await Promise.all(promises);
      return cashCounts;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create cash counts"
      );
    }
  }
);

export const updateCashCount = createAsyncThunk(
  "cashCount/update",
  async (
    { id, data }: { id: number; data: CashCountUpdate },
    { rejectWithValue }
  ) => {
    try {
      const cashCount = await apiRequest<CashCount>(
        API_ENDPOINTS.cashCount.update(id),
        {
          method: "PATCH",
          body: JSON.stringify(data),
        }
      );
      return cashCount;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update cash count"
      );
    }
  }
);

export const deleteCashCount = createAsyncThunk(
  "cashCount/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest<void>(API_ENDPOINTS.cashCount.delete(id), {
        method: "DELETE",
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete cash count"
      );
    }
  }
);

// Slice
const cashCountSlice = createSlice({
  name: "cashCount",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<CashCountFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedCashCount: (state) => {
      state.selectedCashCount = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchCashCounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCashCounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.totalAmount = action.payload.reduce(
          (sum, item) => sum + Number(item.amount),
          0
        );
        state.lastFetched = Date.now();
      })
      .addCase(fetchCashCounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchCashCountById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCashCountById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCashCount = action.payload;
      })
      .addCase(fetchCashCountById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create single
    builder
      .addCase(createCashCount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCashCount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.totalAmount += Number(action.payload.amount);
      })
      .addCase(createCashCount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create many
    builder
      .addCase(createManyCashCounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createManyCashCounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = [...action.payload, ...state.items];
        state.totalAmount += action.payload.reduce(
          (sum, item) => sum + Number(item.amount),
          0
        );
      })
      .addCase(createManyCashCounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateCashCount.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id
        );
        if (index !== -1) {
          const oldAmount = Number(state.items[index].amount);
          state.items[index] = action.payload;
          state.totalAmount =
            state.totalAmount - oldAmount + Number(action.payload.amount);
        }
        if (state.selectedCashCount?.id === action.payload.id) {
          state.selectedCashCount = action.payload;
        }
      })
      .addCase(updateCashCount.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteCashCount.fulfilled, (state, action) => {
        const deletedItem = state.items.find(
          (item) => item.id === action.payload
        );
        if (deletedItem) {
          state.totalAmount -= Number(deletedItem.amount);
        }
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedCashCount?.id === action.payload) {
          state.selectedCashCount = null;
        }
      })
      .addCase(deleteCashCount.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearFilters, clearSelectedCashCount } =
  cashCountSlice.actions;
export default cashCountSlice.reducer;
