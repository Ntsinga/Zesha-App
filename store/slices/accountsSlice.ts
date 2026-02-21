import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type {
  Account,
  AccountCreate,
  AccountUpdate,
  AccountFilters,
  BulkAccountCreate,
  BulkAccountResponse,
} from "@/types";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type { RootState } from "../index";

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

// API helper - now uses secure authenticated requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options);
  return mapApiResponse<T>(data);
}

// Cache duration in milliseconds (2 minutes for accounts - they change less frequently)
const CACHE_DURATION = 2 * 60 * 1000;

// Async thunks
export const fetchAccounts = createAsyncThunk<
  Account[],
  AccountFilters & { forceRefresh?: boolean },
  { state: RootState; rejectValue: string }
>("accounts/fetchAll", async (filters = {}, { getState, rejectWithValue }) => {
  try {
    // Get companyId from auth state - use viewingAgencyId if superadmin viewing agency
    const state = getState();
    const companyId = state.auth.viewingAgencyId || state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    const { forceRefresh, ...filterParams } = filters;

    // Check cache - skip fetch if data is fresh
    const { lastFetched, items, filters: cachedFilters } = state.accounts;
    const isCacheValid =
      lastFetched && Date.now() - lastFetched < CACHE_DURATION;
    const isSameFilters =
      JSON.stringify(cachedFilters) === JSON.stringify(filterParams);

    if (!forceRefresh && isCacheValid && isSameFilters && items.length > 0) {
      return items;
    }

    const query = buildTypedQueryString({ ...filterParams, companyId });
    const accounts = await apiRequest<Account[]>(
      `${API_ENDPOINTS.accounts.list}${query}`,
    );
    return accounts;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch accounts",
    );
  }
});

export const fetchAccountById = createAsyncThunk<
  Account,
  number,
  { rejectValue: string }
>("accounts/fetchById", async (id, { rejectWithValue }) => {
  try {
    const account = await apiRequest<Account>(API_ENDPOINTS.accounts.get(id));
    return account;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch account",
    );
  }
});

export const createAccount = createAsyncThunk<
  Account,
  AccountCreate,
  { rejectValue: string }
>("accounts/create", async (data, { rejectWithValue }) => {
  try {
    const account = await apiRequest<Account>(API_ENDPOINTS.accounts.create, {
      method: "POST",
      body: JSON.stringify(mapApiRequest(data)),
    });
    return account;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create account",
    );
  }
});

export const updateAccount = createAsyncThunk<
  Account,
  { id: number; data: AccountUpdate },
  { state: RootState; rejectValue: string }
>("accounts/update", async ({ id, data }, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const companyId =
      data.companyId ||
      state.auth.viewingAgencyId ||
      state.auth.user?.companyId;

    if (!companyId) {
      return rejectWithValue("No companyId found. Please log in again.");
    }

    const query = buildTypedQueryString({ companyId });
    const account = await apiRequest<Account>(
      `${API_ENDPOINTS.accounts.update(id)}${query}`,
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return account;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update account",
    );
  }
});

export const deleteAccount = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>("accounts/delete", async (id, { rejectWithValue }) => {
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
});

export const createAccountsBulk = createAsyncThunk<
  BulkAccountResponse,
  BulkAccountCreate,
  { rejectValue: string }
>("accounts/createBulk", async (data, { rejectWithValue }) => {
  try {
    const response = await apiRequest<BulkAccountResponse>(
      API_ENDPOINTS.accounts.bulk,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
    return response;
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create accounts",
    );
  }
});

export const deactivateAccount = createAsyncThunk<
  Account,
  number,
  { rejectValue: string }
>("accounts/deactivate", async (id, { rejectWithValue }) => {
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
});

export const activateAccount = createAsyncThunk<
  Account,
  number,
  { rejectValue: string }
>("accounts/activate", async (id, { rejectWithValue }) => {
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
});

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
        // Store filters for cache comparison
        const { forceRefresh, ...filterParams } = action.meta.arg;
        state.filters = filterParams;
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
