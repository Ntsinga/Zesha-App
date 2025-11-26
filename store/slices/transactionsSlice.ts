import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Transaction, TransactionType, TransactionCategory } from "../../types";

// Types
export interface TransactionFilters {
  type?: TransactionType;
  category?: TransactionCategory;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface TransactionsState {
  items: Transaction[];
  filteredItems: Transaction[];
  filters: TransactionFilters;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: TransactionsState = {
  items: [],
  filteredItems: [],
  filters: {},
  isLoading: false,
  error: null,
  lastFetched: null,
};

// Mock data for development
const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: "2024-11-25",
    description: "Grocery Shopping",
    category: "Food & Dining",
    amount: 1250.0,
    type: "expense",
    hasReceipt: true,
    account: "Main Account",
  },
  {
    id: "2",
    date: "2024-11-24",
    description: "Salary Deposit",
    category: "Other",
    amount: 45000.0,
    type: "income",
    hasReceipt: false,
    account: "Main Account",
  },
  {
    id: "3",
    date: "2024-11-23",
    description: "Uber Ride",
    category: "Transportation",
    amount: 350.0,
    type: "expense",
    hasReceipt: true,
    account: "Main Account",
  },
  {
    id: "4",
    date: "2024-11-22",
    description: "Netflix Subscription",
    category: "Entertainment",
    amount: 199.0,
    type: "expense",
    hasReceipt: false,
    account: "Main Account",
  },
  {
    id: "5",
    date: "2024-11-21",
    description: "Freelance Payment",
    category: "Other",
    amount: 8500.0,
    type: "income",
    hasReceipt: true,
    account: "Business",
  },
];

// Helper function to apply filters
function applyFilters(
  items: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return items.filter((item) => {
    if (filters.type && item.type !== filters.type) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.startDate && item.date < filters.startDate) return false;
    if (filters.endDate && item.date > filters.endDate) return false;
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      return (
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }
    return true;
  });
}

// Async thunks
export const fetchTransactions = createAsyncThunk(
  "transactions/fetch",
  async (_, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 600));
      return mockTransactions;
    } catch (error) {
      return rejectWithValue("Failed to fetch transactions");
    }
  }
);

export const createTransaction = createAsyncThunk(
  "transactions/create",
  async (data: Omit<Transaction, "id">, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newTransaction: Transaction = {
        ...data,
        id: Date.now().toString(),
      };

      return newTransaction;
    } catch (error) {
      return rejectWithValue("Failed to create transaction");
    }
  }
);

export const updateTransaction = createAsyncThunk(
  "transactions/update",
  async (data: Transaction, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    } catch (error) {
      return rejectWithValue("Failed to update transaction");
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  "transactions/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    } catch (error) {
      return rejectWithValue("Failed to delete transaction");
    }
  }
);

// Slice
const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<TransactionFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.filteredItems = applyFilters(state.items, state.filters);
    },
    clearFilters: (state) => {
      state.filters = {};
      state.filteredItems = state.items;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.filteredItems = applyFilters(action.payload, state.filters);
        state.lastFetched = Date.now();
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createTransaction.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
        state.filteredItems = applyFilters(state.items, state.filters);
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder.addCase(updateTransaction.fulfilled, (state, action) => {
      const index = state.items.findIndex(
        (item) => item.id === action.payload.id
      );
      if (index !== -1) {
        state.items[index] = action.payload;
        state.filteredItems = applyFilters(state.items, state.filters);
      }
    });

    // Delete
    builder.addCase(deleteTransaction.fulfilled, (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
      state.filteredItems = applyFilters(state.items, state.filters);
    });
  },
});

export const { clearError, setFilters, clearFilters } =
  transactionsSlice.actions;
export default transactionsSlice.reducer;
