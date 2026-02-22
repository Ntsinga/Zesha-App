import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { TransactionFilters, ShiftEnum } from "@/types";
import type {
  Transaction,
  TransactionCreate,
  FloatPurchaseCreate,
  FloatPurchaseRead,
  TransactionUpdate,
  AccountStatement,
  CompanyStatement,
  TransactionAnalyticsSummary,
  TransactionDailyAnalytics,
  BulkTransactionCreate,
  BulkTransactionResponse,
  AccountBalanceResponse,
} from "@/types/transaction";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import { isDeviceOffline } from "@/utils/offlineCheck";
import type { RootState } from "../index";

// ============= State =============

export interface TransactionsState {
  items: Transaction[];
  selectedTransaction: Transaction | null;
  accountStatement: AccountStatement | null;
  companyStatement: CompanyStatement | null;
  analytics: TransactionAnalyticsSummary | null;
  dailyAnalytics: TransactionDailyAnalytics[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: TransactionFilters;
}

const initialState: TransactionsState = {
  items: [],
  selectedTransaction: null,
  accountStatement: null,
  companyStatement: null,
  analytics: null,
  dailyAnalytics: [],
  isLoading: false,
  isCreating: false,
  error: null,
  lastFetched: null,
  filters: {},
};

// ============= API Helper =============

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<unknown>(endpoint, options);
  return mapApiResponse<T>(data);
}

// ============= Async Thunks =============

const CACHE_DURATION = 30_000; // 30 seconds

/**
 * Fetch transactions with filters
 */
export const fetchTransactions = createAsyncThunk<
  Transaction[],
  TransactionFilters | undefined,
  { state: RootState; rejectValue: string }
>(
  "transactions/fetchAll",
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      const offline = await isDeviceOffline();
      if (offline) {
        if (state.transactions.items.length > 0) {
          return state.transactions.items;
        }
        return rejectWithValue(
          "You're offline and no cached data is available.",
        );
      }

      // Check cache — only use cache if filters match the last query
      const { lastFetched, filters: lastFilters } = state.transactions;
      const mergedFilters = { ...filters, companyId };
      const filtersMatch =
        lastFetched &&
        JSON.stringify(lastFilters) === JSON.stringify(mergedFilters);
      if (filtersMatch && Date.now() - lastFetched < CACHE_DURATION) {
        return state.transactions.items;
      }

      const query = buildTypedQueryString({ ...filters, companyId });
      return await apiRequest<Transaction[]>(
        `${API_ENDPOINTS.transactions.list}${query}`,
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch transactions",
      );
    }
  },
);

/**
 * Fetch a single transaction by ID
 */
export const fetchTransactionById = createAsyncThunk<
  Transaction,
  number,
  { rejectValue: string }
>("transactions/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await apiRequest<Transaction>(API_ENDPOINTS.transactions.get(id));
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch transaction",
    );
  }
});

/**
 * Create a single DEPOSIT or WITHDRAW transaction
 */
export const createTransaction = createAsyncThunk<
  Transaction,
  TransactionCreate,
  { state: RootState; rejectValue: string }
>("transactions/create", async (data, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    return await apiRequest<Transaction>(API_ENDPOINTS.transactions.create, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mapApiRequest({ ...data, companyId })),
    });
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create transaction",
    );
  }
});

/**
 * Create a float purchase (linked pair of transactions)
 */
export const createFloatPurchase = createAsyncThunk<
  FloatPurchaseRead,
  FloatPurchaseCreate,
  { state: RootState; rejectValue: string }
>(
  "transactions/createFloatPurchase",
  async (data, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const companyId =
        state.auth.viewingAgencyId || state.auth.user?.companyId;

      if (!companyId) {
        return rejectWithValue("No companyId found. Please log in again.");
      }

      return await apiRequest<FloatPurchaseRead>(
        API_ENDPOINTS.transactions.floatPurchase,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapApiRequest({ ...data, companyId })),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create float purchase",
      );
    }
  },
);

/**
 * Bulk create transactions
 */
export const bulkCreateTransactions = createAsyncThunk<
  BulkTransactionResponse,
  BulkTransactionCreate,
  { rejectValue: string }
>("transactions/bulkCreate", async (data, { rejectWithValue }) => {
  try {
    return await apiRequest<BulkTransactionResponse>(
      API_ENDPOINTS.transactions.bulk,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to bulk create transactions",
    );
  }
});

/**
 * Update transaction (notes only — audit integrity)
 */
export const updateTransaction = createAsyncThunk<
  Transaction,
  { id: number; data: TransactionUpdate },
  { rejectValue: string }
>("transactions/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    return await apiRequest<Transaction>(
      API_ENDPOINTS.transactions.update(id),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update transaction",
    );
  }
});

/**
 * Reverse a transaction (creates an offsetting transaction)
 */
export const reverseTransaction = createAsyncThunk<
  Transaction,
  number,
  { rejectValue: string }
>("transactions/reverse", async (id, { rejectWithValue }) => {
  try {
    return await apiRequest<Transaction>(
      API_ENDPOINTS.transactions.reverse(id),
      { method: "POST" },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to reverse transaction",
    );
  }
});

/**
 * Fetch account balance (current balance from transactions)
 */
export const fetchAccountBalance = createAsyncThunk<
  AccountBalanceResponse,
  { accountId: number; companyId: number },
  { rejectValue: string }
>(
  "transactions/fetchAccountBalance",
  async ({ accountId, companyId }, { rejectWithValue }) => {
    try {
      const query = buildTypedQueryString({ companyId });
      return await apiRequest<AccountBalanceResponse>(
        `${API_ENDPOINTS.transactions.accountBalance(accountId)}${query}`,
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch account balance",
      );
    }
  },
);

/**
 * Fetch account statement with opening/closing balances
 */
export const fetchAccountStatement = createAsyncThunk<
  AccountStatement,
  {
    accountId: number;
    companyId: number;
    startDate?: string;
    endDate?: string;
    shift?: ShiftEnum;
  },
  { rejectValue: string }
>(
  "transactions/fetchAccountStatement",
  async ({ accountId, companyId, ...filters }, { rejectWithValue }) => {
    try {
      const query = buildTypedQueryString({ companyId, ...filters });
      return await apiRequest<AccountStatement>(
        `${API_ENDPOINTS.transactions.accountStatement(accountId)}${query}`,
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to fetch account statement",
      );
    }
  },
);

/**
 * Fetch company-wide statement
 */
export const fetchCompanyStatement = createAsyncThunk<
  CompanyStatement,
  {
    companyId: number;
    startDate?: string;
    endDate?: string;
    shift?: ShiftEnum;
  },
  { state: RootState; rejectValue: string }
>("transactions/fetchCompanyStatement", async (params, { rejectWithValue }) => {
  try {
    const query = buildTypedQueryString(params);
    return await apiRequest<CompanyStatement>(
      `${API_ENDPOINTS.transactions.companyStatement}${query}`,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch company statement",
    );
  }
});

/**
 * Fetch transaction analytics summary
 */
export const fetchTransactionAnalytics = createAsyncThunk<
  TransactionAnalyticsSummary,
  {
    companyId: number;
    startDate?: string;
    endDate?: string;
    shift?: ShiftEnum;
  },
  { rejectValue: string }
>("transactions/fetchAnalytics", async (params, { rejectWithValue }) => {
  try {
    const query = buildTypedQueryString(params);
    return await apiRequest<TransactionAnalyticsSummary>(
      `${API_ENDPOINTS.transactions.analyticsSummary}${query}`,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch transaction analytics",
    );
  }
});

/**
 * Fetch daily analytics for charts
 */
export const fetchDailyAnalytics = createAsyncThunk<
  TransactionDailyAnalytics[],
  {
    companyId: number;
    startDate?: string;
    endDate?: string;
    shift?: ShiftEnum;
  },
  { rejectValue: string }
>("transactions/fetchDailyAnalytics", async (params, { rejectWithValue }) => {
  try {
    const query = buildTypedQueryString(params);
    return await apiRequest<TransactionDailyAnalytics[]>(
      `${API_ENDPOINTS.transactions.analyticsDaily}${query}`,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch daily analytics",
    );
  }
});

// ============= Slice =============

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<TransactionFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedTransaction: (state) => {
      state.selectedTransaction = null;
    },
    clearAccountStatement: (state) => {
      state.accountStatement = null;
    },
    clearCompanyStatement: (state) => {
      state.companyStatement = null;
    },
    clearAnalytics: (state) => {
      state.analytics = null;
      state.dailyAnalytics = [];
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
        // Store the filters that produced this result for cache comparison
        if (action.meta.arg) {
          state.filters = action.meta.arg;
        }
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ---- Fetch By ID ----
    builder
      .addCase(fetchTransactionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedTransaction = action.payload;
      })
      .addCase(fetchTransactionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ---- Create ----
    builder
      .addCase(createTransaction.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.isCreating = false;
        state.items.unshift(action.payload);
        state.lastFetched = null; // Invalidate cache
      })
      .addCase(createTransaction.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    // ---- Float Purchase ----
    builder
      .addCase(createFloatPurchase.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createFloatPurchase.fulfilled, (state, action) => {
        state.isCreating = false;
        state.items.unshift(action.payload.sourceTransaction);
        state.items.unshift(action.payload.destinationTransaction);
        state.lastFetched = null;
      })
      .addCase(createFloatPurchase.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    // ---- Bulk Create ----
    builder
      .addCase(bulkCreateTransactions.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(bulkCreateTransactions.fulfilled, (state, action) => {
        state.isCreating = false;
        state.items = [...action.payload.created, ...state.items];
        state.lastFetched = null;
      })
      .addCase(bulkCreateTransactions.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    // ---- Update ----
    builder
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedTransaction?.id === action.payload.id) {
          state.selectedTransaction = action.payload;
        }
      })
      .addCase(updateTransaction.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // ---- Reverse ----
    builder
      .addCase(reverseTransaction.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(reverseTransaction.fulfilled, (state, action) => {
        state.isCreating = false;
        state.items.unshift(action.payload);
        state.lastFetched = null;
      })
      .addCase(reverseTransaction.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      });

    // ---- Account Statement ----
    builder
      .addCase(fetchAccountStatement.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccountStatement.fulfilled, (state, action) => {
        state.isLoading = false;
        state.accountStatement = action.payload;
      })
      .addCase(fetchAccountStatement.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ---- Company Statement ----
    builder
      .addCase(fetchCompanyStatement.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanyStatement.fulfilled, (state, action) => {
        state.isLoading = false;
        state.companyStatement = action.payload;
      })
      .addCase(fetchCompanyStatement.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ---- Analytics ----
    builder
      .addCase(fetchTransactionAnalytics.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTransactionAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchTransactionAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // ---- Daily Analytics ----
    builder
      .addCase(fetchDailyAnalytics.fulfilled, (state, action) => {
        state.dailyAnalytics = action.payload;
      })
      .addCase(fetchDailyAnalytics.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  clearSelectedTransaction,
  clearAccountStatement,
  clearCompanyStatement,
  clearAnalytics,
} = transactionsSlice.actions;

export default transactionsSlice.reducer;
