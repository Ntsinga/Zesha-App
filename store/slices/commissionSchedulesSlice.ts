import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  CommissionSchedule,
  CommissionScheduleDetail,
  CommissionScheduleCreate,
  CommissionScheduleUpdate,
  CommissionScheduleFilters,
  CommissionTemplateCreate,
  CommissionRule,
  CommissionRuleCreate,
  CommissionRuleRevise,
  CommissionTier,
  CommissionTierCreate,
} from "@/types";
import { mapApiResponse, mapApiRequest, buildTypedQueryString } from "@/types";
import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import type { RootState } from "../index";

export interface CommissionSchedulesState {
  items: CommissionSchedule[];
  templates: CommissionScheduleDetail[];
  selectedSchedule: CommissionScheduleDetail | null;
  isLoading: boolean;
  isTemplatesLoading: boolean;
  isDetailLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: CommissionSchedulesState = {
  items: [],
  templates: [],
  selectedSchedule: null,
  isLoading: false,
  isTemplatesLoading: false,
  isDetailLoading: false,
  error: null,
  lastFetched: null,
};

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<any>(endpoint, options ?? {});
  return mapApiResponse<T>(data);
}

function getCompanyId(state: RootState): number | undefined {
  return state.auth.viewingAgencyId ?? state.auth.user?.companyId ?? undefined;
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchCommissionSchedules = createAsyncThunk<
  CommissionSchedule[],
  CommissionScheduleFilters & { forceRefresh?: boolean },
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/fetchAll",
  async (filters = { companyId: 0 }, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      const { forceRefresh: _forceRefresh, ...rest } = filters;
      const query = buildTypedQueryString({ ...rest, companyId });
      return await apiRequest<CommissionSchedule[]>(
        `${API_ENDPOINTS.commissionSchedules.list}${query}`,
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch schedules",
      );
    }
  },
);

export const fetchCommissionScheduleDetail = createAsyncThunk<
  CommissionScheduleDetail,
  number,
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/fetchDetail",
  async (id, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      return await apiRequest<CommissionScheduleDetail>(
        `${API_ENDPOINTS.commissionSchedules.get(id)}?company_id=${companyId}`,
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch schedule",
      );
    }
  },
);

export const createCommissionSchedule = createAsyncThunk<
  CommissionSchedule,
  CommissionScheduleCreate,
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/create",
  async (data, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      return await apiRequest<CommissionSchedule>(
        API_ENDPOINTS.commissionSchedules.create,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapApiRequest({ ...data, companyId })),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create schedule",
      );
    }
  },
);

export const updateCommissionSchedule = createAsyncThunk<
  CommissionSchedule,
  { id: number; data: CommissionScheduleUpdate },
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/update",
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      return await apiRequest<CommissionSchedule>(
        `${API_ENDPOINTS.commissionSchedules.update(id)}?company_id=${companyId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapApiRequest(data)),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update schedule",
      );
    }
  },
);

export const deleteCommissionSchedule = createAsyncThunk<
  number,
  number,
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/delete",
  async (id, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      await secureApiRequest(
        `${API_ENDPOINTS.commissionSchedules.delete(id)}?company_id=${companyId}`,
        { method: "DELETE" },
      );
      return id;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete schedule",
      );
    }
  },
);

// Fetch all system-wide templates (any authenticated user)
export const fetchCommissionTemplates = createAsyncThunk<
  CommissionScheduleDetail[],
  void,
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/fetchTemplates",
  async (_, { rejectWithValue }) => {
    try {
      return await apiRequest<CommissionScheduleDetail[]>(
        API_ENDPOINTS.commissionSchedules.listTemplates,
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch templates",
      );
    }
  },
);

// Create a system-wide template (Super Admin only)
export const createCommissionTemplate = createAsyncThunk<
  CommissionSchedule,
  CommissionTemplateCreate,
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/createTemplate",
  async (data, { rejectWithValue }) => {
    try {
      return await apiRequest<CommissionSchedule>(
        API_ENDPOINTS.commissionSchedules.createTemplate,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapApiRequest(data)),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create template",
      );
    }
  },
);

// Copy a template into the current company's own schedules
export const copyTemplateToCompany = createAsyncThunk<
  CommissionScheduleDetail,
  { templateId: number },
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/copyTemplate",
  async ({ templateId }, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");
      return await apiRequest<CommissionScheduleDetail>(
        `${API_ENDPOINTS.commissionSchedules.copyTemplate(templateId)}?company_id=${companyId}`,
        { method: "POST" },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to copy template",
      );
    }
  },
);

// Returns CommissionRule (CommissionRuleRead) — backend POST /rules → 201
export const addCommissionRule = createAsyncThunk<
  CommissionRule,
  { scheduleId: number; data: CommissionRuleCreate },
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/addRule",
  async ({ scheduleId, data }, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      // Pre-check: reject before API call if an active rule already exists
      const duplicate = getState().commissionSchedules.selectedSchedule?.rules.some(
        (r) =>
          r.isActive &&
          r.transactionType === data.transactionType &&
          r.transactionSubtype === data.transactionSubtype,
      );
      if (duplicate) {
        return rejectWithValue(
          "An active rule already exists for this transaction type and subtype. Use \"Revise\" to update it.",
        );
      }

      return await apiRequest<CommissionRule>(
        `${API_ENDPOINTS.commissionSchedules.addRule(scheduleId)}?company_id=${companyId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapApiRequest(data)),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to add rule",
      );
    }
  },
);

// Returns the new CommissionRule — backend PUT /revise → 201
export const reviseCommissionRule = createAsyncThunk<
  CommissionRule,
  { scheduleId: number; ruleId: number; data: CommissionRuleRevise },
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/reviseRule",
  async ({ scheduleId, ruleId, data }, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      // Inject immutable transactionType/transactionSubtype from state — backend
      // enforces these cannot change during revision.
      const existingRule = getState().commissionSchedules.selectedSchedule?.rules.find(
        (r) => r.id === ruleId,
      );
      if (!existingRule) {
        return rejectWithValue(
          "Rule not found — load the schedule detail before revising.",
        );
      }
      if (!existingRule.isActive) {
        return rejectWithValue("Cannot revise an already-inactive rule.");
      }

      const fullPayload = {
        ...data,
        transactionType: existingRule.transactionType,
        transactionSubtype: existingRule.transactionSubtype,
      };

      return await apiRequest<CommissionRule>(
        `${API_ENDPOINTS.commissionSchedules.reviseRule(scheduleId, ruleId)}?company_id=${companyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mapApiRequest(fullPayload)),
        },
      );
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to revise rule",
      );
    }
  },
);

// Returns void — backend DELETE /rules/{rule_id} → 204
export const deactivateCommissionRule = createAsyncThunk<
  { scheduleId: number; ruleId: number },
  { scheduleId: number; ruleId: number },
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/deactivateRule",
  async ({ scheduleId, ruleId }, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      await secureApiRequest(
        `${API_ENDPOINTS.commissionSchedules.deactivateRule(scheduleId, ruleId)}?company_id=${companyId}`,
        { method: "DELETE" },
      );
      return { scheduleId, ruleId };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to deactivate rule",
      );
    }
  },
);

// Returns CommissionTier[] — backend PUT /rules/{rule_id}/tiers → 200
export const replaceCommissionTiers = createAsyncThunk<
  { ruleId: number; tiers: CommissionTier[] },
  { ruleId: number; tiers: CommissionTierCreate[] },
  { state: RootState; rejectValue: string }
>(
  "commissionSchedules/replaceTiers",
  async ({ ruleId, tiers }, { getState, rejectWithValue }) => {
    try {
      const companyId = getCompanyId(getState());
      if (!companyId) return rejectWithValue("No companyId found.");

      // Pre-check: guard against inactive or non-TIERED_FLAT rules
      const rule = getState().commissionSchedules.selectedSchedule?.rules.find(
        (r) => r.id === ruleId,
      );
      if (rule && !rule.isActive) {
        return rejectWithValue("Cannot replace tiers on an inactive rule.");
      }
      if (rule && rule.ruleType !== "TIERED_FLAT") {
        return rejectWithValue("Tiers can only be set on TIERED_FLAT rules.");
      }

      const result = await apiRequest<CommissionTier[]>(
        `${API_ENDPOINTS.commissionSchedules.replaceTiers(ruleId)}?company_id=${companyId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tiers.map((t) => mapApiRequest(t))),
        },
      );
      return { ruleId, tiers: result };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to replace tiers",
      );
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const commissionSchedulesSlice = createSlice({
  name: "commissionSchedules",
  initialState,
  reducers: {
    clearSelectedSchedule(state) {
      state.selectedSchedule = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── fetchAll ──
    builder
      .addCase(fetchCommissionSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCommissionSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchCommissionSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? "Failed to fetch schedules";
      });

    // ── fetchDetail ──
    builder
      .addCase(fetchCommissionScheduleDetail.pending, (state) => {
        state.isDetailLoading = true;
        state.error = null;
      })
      .addCase(fetchCommissionScheduleDetail.fulfilled, (state, action) => {
        state.isDetailLoading = false;
        state.selectedSchedule = action.payload;
      })
      .addCase(fetchCommissionScheduleDetail.rejected, (state, action) => {
        state.isDetailLoading = false;
        state.error = action.payload ?? "Failed to fetch schedule";
      });

    // ── create ──
    builder
      .addCase(createCommissionSchedule.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(createCommissionSchedule.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to create schedule";
      });

    // ── update ──
    builder
      .addCase(updateCommissionSchedule.fulfilled, (state, action) => {
        const idx = state.items.findIndex((s) => s.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedSchedule?.id === action.payload.id) {
          state.selectedSchedule = { ...state.selectedSchedule, ...action.payload };
        }
      })
      .addCase(updateCommissionSchedule.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to update schedule";
      });

    // ── delete ──
    builder
      .addCase(deleteCommissionSchedule.fulfilled, (state, action) => {
        state.items = state.items.filter((s) => s.id !== action.payload);
        if (state.selectedSchedule?.id === action.payload) {
          state.selectedSchedule = null;
        }
      })
      .addCase(deleteCommissionSchedule.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to delete schedule";
      });

    // ── fetchTemplates ──
    builder
      .addCase(fetchCommissionTemplates.pending, (state) => {
        state.isTemplatesLoading = true;
        state.error = null;
      })
      .addCase(fetchCommissionTemplates.fulfilled, (state, action) => {
        state.isTemplatesLoading = false;
        state.templates = action.payload;
      })
      .addCase(fetchCommissionTemplates.rejected, (state, action) => {
        state.isTemplatesLoading = false;
        state.error = action.payload ?? "Failed to fetch templates";
      });

    // ── createTemplate ──
    builder
      .addCase(createCommissionTemplate.fulfilled, (state, action) => {
        state.templates.push({ ...action.payload, rules: [] });
      })
      .addCase(createCommissionTemplate.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to create template";
      });

    // ── copyTemplateToCompany: add copied schedule to company items ──
    builder
      .addCase(copyTemplateToCompany.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(copyTemplateToCompany.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to copy template";
      });

    // ── addRule: append new rule to selectedSchedule.rules ──
    builder
      .addCase(addCommissionRule.fulfilled, (state, action) => {
        state.selectedSchedule?.rules.push(action.payload);
      })
      .addCase(addCommissionRule.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to add rule";
      });

    // ── reviseRule: deactivate old rule in-place, push new rule ──
    builder
      .addCase(reviseCommissionRule.fulfilled, (state, action) => {
        if (!state.selectedSchedule) return;
        const { ruleId } = action.meta.arg;
        const oldIdx = state.selectedSchedule.rules.findIndex(
          (r) => r.id === ruleId,
        );
        if (oldIdx !== -1) {
          state.selectedSchedule.rules[oldIdx] = {
            ...state.selectedSchedule.rules[oldIdx],
            isActive: false,
          };
        }
        state.selectedSchedule.rules.push(action.payload);
      })
      .addCase(reviseCommissionRule.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to revise rule";
      });

    // ── deactivateRule: mark rule inactive ──
    builder
      .addCase(deactivateCommissionRule.fulfilled, (state, action) => {
        if (!state.selectedSchedule) return;
        const { ruleId } = action.payload;
        const idx = state.selectedSchedule.rules.findIndex(
          (r) => r.id === ruleId,
        );
        if (idx !== -1) {
          state.selectedSchedule.rules[idx] = {
            ...state.selectedSchedule.rules[idx],
            isActive: false,
          };
        }
      })
      .addCase(deactivateCommissionRule.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to deactivate rule";
      });

    // ── replaceTiers: swap tiers on the matching rule ──
    builder
      .addCase(replaceCommissionTiers.fulfilled, (state, action) => {
        if (!state.selectedSchedule) return;
        const { ruleId, tiers } = action.payload;
        const ruleIdx = state.selectedSchedule.rules.findIndex(
          (r) => r.id === ruleId,
        );
        if (ruleIdx !== -1) {
          state.selectedSchedule.rules[ruleIdx] = {
            ...state.selectedSchedule.rules[ruleIdx],
            tiers,
          };
        }
      })
      .addCase(replaceCommissionTiers.rejected, (state, action) => {
        state.error = action.payload ?? "Failed to replace tiers";
      });
  },
});

export const { clearSelectedSchedule, clearError } =
  commissionSchedulesSlice.actions;

export default commissionSchedulesSlice.reducer;
