import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { ExpenseCategory, ExpenseCategoryCreate } from "@/types";
import { mapApiResponse, mapApiRequest } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type { RootState } from "../index";

export interface ExpenseCategoriesState {
  items: ExpenseCategory[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ExpenseCategoriesState = {
  items: [],
  isLoading: false,
  error: null,
};

export const fetchExpenseCategories = createAsyncThunk<
  ExpenseCategory[],
  { companyId: number },
  { state: RootState; rejectValue: string }
>("expenseCategories/fetchAll", async ({ companyId }, { rejectWithValue }) => {
  try {
    const data = await secureApiRequest<unknown>(
      API_ENDPOINTS.expenseCategories.list(companyId),
    );
    return mapApiResponse<ExpenseCategory[]>(data);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch categories",
    );
  }
});

export const createExpenseCategory = createAsyncThunk<
  ExpenseCategory,
  ExpenseCategoryCreate,
  { rejectValue: string }
>("expenseCategories/create", async (payload, { rejectWithValue }) => {
  try {
    const data = await secureApiRequest<unknown>(
      API_ENDPOINTS.expenseCategories.create,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapApiRequest(payload)),
      },
    );
    return mapApiResponse<ExpenseCategory>(data);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create category",
    );
  }
});

export const deleteExpenseCategory = createAsyncThunk<
  number,
  { id: number; companyId: number },
  { rejectValue: string }
>(
  "expenseCategories/delete",
  async ({ id, companyId }, { rejectWithValue }) => {
    try {
      await secureApiRequest<unknown>(
        API_ENDPOINTS.expenseCategories.delete(id, companyId),
        { method: "DELETE" },
      );
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete category",
      );
    }
  },
);

const expenseCategoriesSlice = createSlice({
  name: "expenseCategories",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpenseCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExpenseCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchExpenseCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Unknown error";
      })
      .addCase(createExpenseCategory.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.items.sort((a, b) => a.name.localeCompare(b.name));
      })
      .addCase(deleteExpenseCategory.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload);
      });
  },
});

export default expenseCategoriesSlice.reducer;
