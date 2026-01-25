import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { CompanyInfo, CompanyInfoCreate, CompanyInfoUpdate } from "../../types";
import { mapApiResponse } from "../../types";
import { API_ENDPOINTS, buildQueryString } from "../../config/api";
import { secureApiRequest } from "../../services/secureApi";

// Types
export interface CompanyInfoState {
  items: CompanyInfo[];
  selectedCompany: CompanyInfo | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CompanyInfoState = {
  items: [],
  selectedCompany: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};

// API helper - now uses secure authenticated requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options);
  return mapApiResponse<T>(data);
}

// Async thunks
export const fetchCompanyInfoList = createAsyncThunk(
  "companyInfo/fetchAll",
  async (
    params: { skip?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const query = buildQueryString(params);
      const companies = await apiRequest<CompanyInfo[]>(
        `${API_ENDPOINTS.companyInfo.list}${query}`,
      );
      return companies;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch company info",
      );
    }
  },
);

export const fetchCompanyInfoById = createAsyncThunk(
  "companyInfo/fetchById",
  async (id: number, { rejectWithValue }) => {
    try {
      const company = await apiRequest<CompanyInfo>(
        API_ENDPOINTS.companyInfo.get(id),
      );
      return company;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch company info",
      );
    }
  },
);

export const createCompanyInfo = createAsyncThunk(
  "companyInfo/create",
  async (data: CompanyInfoCreate, { rejectWithValue }) => {
    try {
      const company = await apiRequest<CompanyInfo>(
        API_ENDPOINTS.companyInfo.create,
        {
          method: "POST",
          body: JSON.stringify(data),
        },
      );
      return company;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to create company info",
      );
    }
  },
);

export const updateCompanyInfo = createAsyncThunk(
  "companyInfo/update",
  async (
    { id, data }: { id: number; data: CompanyInfoUpdate },
    { rejectWithValue },
  ) => {
    try {
      const company = await apiRequest<CompanyInfo>(
        API_ENDPOINTS.companyInfo.update(id),
        {
          method: "PATCH",
          body: JSON.stringify(data),
        },
      );
      return company;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to update company info",
      );
    }
  },
);

export const deleteCompanyInfo = createAsyncThunk(
  "companyInfo/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      await apiRequest<void>(API_ENDPOINTS.companyInfo.delete(id), {
        method: "DELETE",
      });
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to delete company info",
      );
    }
  },
);

// Slice
const companyInfoSlice = createSlice({
  name: "companyInfo",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedCompany: (state) => {
      state.selectedCompany = null;
    },
    setSelectedCompany: (state, action: PayloadAction<CompanyInfo>) => {
      state.selectedCompany = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch all
    builder
      .addCase(fetchCompanyInfoList.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanyInfoList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchCompanyInfoList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch by ID
    builder
      .addCase(fetchCompanyInfoById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanyInfoById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedCompany = action.payload;
      })
      .addCase(fetchCompanyInfoById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create
    builder
      .addCase(createCompanyInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCompanyInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createCompanyInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update
    builder
      .addCase(updateCompanyInfo.fulfilled, (state, action) => {
        const index = state.items.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedCompany?.id === action.payload.id) {
          state.selectedCompany = action.payload;
        }
      })
      .addCase(updateCompanyInfo.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Delete
    builder
      .addCase(deleteCompanyInfo.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        if (state.selectedCompany?.id === action.payload) {
          state.selectedCompany = null;
        }
      })
      .addCase(deleteCompanyInfo.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedCompany, setSelectedCompany } =
  companyInfoSlice.actions;
export default companyInfoSlice.reducer;
