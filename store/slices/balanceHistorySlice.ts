import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { BalanceHistoryEntry } from "../../types";

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

// Mock data for development
const mockBalanceHistory: BalanceHistoryEntry[] = [
  {
    id: "1",
    date: "2024-11-25",
    totalCash: 125750,
    amount: 5000,
    capital: 100000,
    status: "Balanced",
  },
  {
    id: "2",
    date: "2024-11-24",
    totalCash: 120750,
    amount: 3500,
    capital: 100000,
    status: "Balanced",
  },
  {
    id: "3",
    date: "2024-11-23",
    totalCash: 117250,
    amount: -2000,
    capital: 100000,
    status: "Pending",
  },
  {
    id: "4",
    date: "2024-11-22",
    totalCash: 119250,
    amount: 1500,
    capital: 100000,
    status: "Balanced",
  },
  {
    id: "5",
    date: "2024-11-21",
    totalCash: 117750,
    amount: -500,
    capital: 100000,
    status: "Discrepancy",
  },
];

// Async thunks
export const fetchBalanceHistory = createAsyncThunk(
  "balanceHistory/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 600));
      return mockBalanceHistory;
    } catch (error) {
      return rejectWithValue("Failed to fetch balance history");
    }
  }
);

export const addBalanceEntry = createAsyncThunk(
  "balanceHistory/addEntry",
  async (data: Omit<BalanceHistoryEntry, "id">, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newEntry: BalanceHistoryEntry = {
        ...data,
        id: Date.now().toString(),
      };

      return newEntry;
    } catch (error) {
      return rejectWithValue("Failed to add balance entry");
    }
  }
);

export const updateBalanceEntry = createAsyncThunk(
  "balanceHistory/updateEntry",
  async (data: BalanceHistoryEntry, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    } catch (error) {
      return rejectWithValue("Failed to update balance entry");
    }
  }
);

export const deleteBalanceEntry = createAsyncThunk(
  "balanceHistory/deleteEntry",
  async (id: string, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    } catch (error) {
      return rejectWithValue("Failed to delete balance entry");
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
    // Fetch
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

    // Add entry
    builder
      .addCase(addBalanceEntry.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addBalanceEntry.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries.unshift(action.payload);
      })
      .addCase(addBalanceEntry.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update entry
    builder.addCase(updateBalanceEntry.fulfilled, (state, action) => {
      const index = state.entries.findIndex(
        (entry) => entry.id === action.payload.id
      );
      if (index !== -1) {
        state.entries[index] = action.payload;
      }
    });

    // Delete entry
    builder.addCase(deleteBalanceEntry.fulfilled, (state, action) => {
      state.entries = state.entries.filter(
        (entry) => entry.id !== action.payload
      );
    });
  },
});

export const { clearError } = balanceHistorySlice.actions;
export default balanceHistorySlice.reducer;
