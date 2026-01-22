import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Account,
  AccountCreate,
  AccountUpdate,
  AccountFilters,
  BulkAccountCreate,
  BulkAccountResponse,
} from "../../types";
import {
  API_BASE_URL,
  API_ENDPOINTS,
  buildQueryString,
} from "../../config/api";

// Types
export interface AccountsState {
  items: Account[];
  selectedAccount: Account | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  filters: AccountFilters;
}

const initialState: AccountsState = {
  items: [],
  selectedAccount: null,
  isLoading: false,
  error: null,
  lastFetched: null,
  filters: {},
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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Async thunks
export const fetchAccounts = createAsyncThunk(
  "accounts/fetchAll",
  async (filters: AccountFilters = {}, { getState, rejectWithValue }) => {
    try {
      // Get company_id from auth state
      const state = getState() as any;
      const companyId = state.auth?.user?.company_id;

      if (!companyId) {
        return rejectWithValue("No company_id found. Please log in again.");
      }

      // Add company_id to filters
      const filtersWithCompany = {
        ...filters,
        company_id: companyId,
      };

      const query = buildQueryString(filtersWithCompany);
      const accounts = await apiRequest<Account[]>(
        `${API_ENDPOINTS.accounts.list}${query}`,
      );
      return accounts;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch accounts",
      );
    }
  },
);

export const fetchAccountById = createAsyncThunk(
  "accounts/fetchById",
  async (id: number, { rejectWithValue }) => {
    try {
      const account = await apiRequest<Account>(API_ENDPOINTS.accounts.get(id));
      return account;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch account",
      );
    }
  },
);

export const createAccount = createAsyncThunk(
  "accounts/create",
  async (data: AccountCreate, { rejectWithValue }) => {
    try {
      const account = await apiRequest<Account>(API_ENDPOINTS.accounts.create, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return account;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create account",
      );
    }
  },
);

export const updateAccount = createAsyncThunk(
  "accounts/update",
  async (
    { id, data }: { id: number; data: AccountUpdate },
    { rejectWithValue },
  ) => {
    try {
      const account = await apiRequest<Account>(
        API_ENDPOINTS.accounts.update(id),
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      return account;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update account",
      );
    }
  },
);

export const deleteAccount = createAsyncThunk(
  "accounts/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest<void>(API_ENDPOINTS.accounts.delete(id), {
        method: "DELETE",
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete account",
      );
    }
  },
);

export const createAccountsBulk = createAsyncThunk(
  "accounts/createBulk",
  async (data: BulkAccountCreate, { rejectWithValue }) => {
    try {
      const response = await apiRequest<BulkAccountResponse>(
        API_ENDPOINTS.accounts.bulk,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create accounts",
      );
    }
  },
);

export const deactivateAccount = createAsyncThunk(
  "accounts/deactivate",
  async (id: number, { rejectWithValue }) => {
    try {
      const account = await apiRequest<Account>(
        API_ENDPOINTS.accounts.deactivate(id),
        {
          method: "POST",
        },
      );
      return account;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to deactivate account",
      );
    }
  },
);

export const activateAccount = createAsyncThunk(
  "accounts/activate",
  async (id: number, { rejectWithValue }) => {
    try {
      const account = await apiRequest<Account>(
        API_ENDPOINTS.accounts.activate(id),
        {
          method: "POST",
        },
      );
      return account;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to activate account",
      );
    }
  },
);

// Slice
const accountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<AccountFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedAccount: (state) => {
      state.selectedAccount = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchAccountById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccountById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedAccount = action.payload;
      })
      .addCase(fetchAccountById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createAccount.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount = action.payload;
        }
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedAccount?.id === action.payload) {
          state.selectedAccount = null;
        }
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Bulk Create
    builder
      .addCase(createAccountsBulk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccountsBulk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = [...action.payload.created, ...state.items];
      })
      .addCase(createAccountsBulk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Deactivate
    builder
      .addCase(deactivateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount = action.payload;
        }
      })
      .addCase(deactivateAccount.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Activate
    builder
      .addCase(activateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedAccount?.id === action.payload.id) {
          state.selectedAccount = action.payload;
        }
      })
      .addCase(activateAccount.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearFilters, clearSelectedAccount } =
  accountsSlice.actions;
export default accountsSlice.reducer;
