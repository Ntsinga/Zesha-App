import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  Account,
  AccountTemplate,
  AccountTemplateCreate,
  AccountUpdate,
} from "@/types";
import { mapApiResponse, mapApiRequest } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";

export interface AccountTemplatesState {
  templates: AccountTemplate[];
  selectedTemplate: AccountTemplate | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: AccountTemplatesState = {
  templates: [],
  selectedTemplate: null,
  isLoading: false,
  error: null,
};

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options);
  return mapApiResponse<T>(data);
}

export const fetchAccountTemplates = createAsyncThunk<
  AccountTemplate[],
  void,
  { rejectValue: string }
>("accountTemplates/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await apiRequest<AccountTemplate[]>(
      API_ENDPOINTS.accounts.listTemplates,
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to fetch account templates",
    );
  }
});

export const fetchAccountTemplateById = createAsyncThunk<
  AccountTemplate,
  number,
  { rejectValue: string }
>("accountTemplates/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await apiRequest<AccountTemplate>(
      API_ENDPOINTS.accounts.getTemplate(id),
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch account template",
    );
  }
});

export const createAccountTemplate = createAsyncThunk<
  AccountTemplate,
  AccountTemplateCreate,
  { rejectValue: string }
>("accountTemplates/create", async (data, { rejectWithValue }) => {
  try {
    return await apiRequest<AccountTemplate>(
      API_ENDPOINTS.accounts.createTemplate,
      {
        method: "POST",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error
        ? error.message
        : "Failed to create account template",
    );
  }
});

export const updateAccountTemplate = createAsyncThunk<
  AccountTemplate,
  { id: number; data: AccountUpdate },
  { rejectValue: string }
>("accountTemplates/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    return await apiRequest<AccountTemplate>(
      API_ENDPOINTS.accounts.updateTemplate(id),
      {
        method: "PATCH",
        body: JSON.stringify(mapApiRequest(data)),
      },
    );
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update template",
    );
  }
});

export const inheritAccountTemplate = createAsyncThunk<
  Account,
  { templateId: number; name: string; companyId: number },
  { rejectValue: string }
>(
  "accountTemplates/inherit",
  async ({ templateId, name, companyId }, { rejectWithValue }) => {
    try {
      return await apiRequest<Account>(
        API_ENDPOINTS.accounts.inheritTemplate(templateId),
        {
          method: "POST",
          body: JSON.stringify(mapApiRequest({ name, companyId })),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : "Failed to inherit account template",
      );
    }
  },
);

const accountTemplatesSlice = createSlice({
  name: "accountTemplates",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSelectedTemplate: (state) => {
      state.selectedTemplate = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccountTemplates.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccountTemplates.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates = action.payload;
      })
      .addCase(fetchAccountTemplates.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchAccountTemplateById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAccountTemplateById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedTemplate = action.payload;
        const index = state.templates.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.templates[index] = action.payload;
        } else {
          state.templates.unshift(action.payload);
        }
      })
      .addCase(fetchAccountTemplateById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createAccountTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createAccountTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        state.templates.unshift(action.payload);
        state.selectedTemplate = action.payload;
      })
      .addCase(createAccountTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateAccountTemplate.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateAccountTemplate.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.templates.findIndex(
          (item) => item.id === action.payload.id,
        );
        if (index !== -1) {
          state.templates[index] = action.payload;
        }
        if (state.selectedTemplate?.id === action.payload.id) {
          state.selectedTemplate = action.payload;
        }
      })
      .addCase(updateAccountTemplate.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(inheritAccountTemplate.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSelectedTemplate } =
  accountTemplatesSlice.actions;
export default accountTemplatesSlice.reducer;