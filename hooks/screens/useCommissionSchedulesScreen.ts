import { useState, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchCommissionSchedules,
  fetchCommissionScheduleDetail,
  createCommissionSchedule,
  updateCommissionSchedule,
  deleteCommissionSchedule,
  addCommissionRule,
  reviseCommissionRule,
  deactivateCommissionRule,
  replaceCommissionTiers,
  fetchCommissionTemplates,
  createCommissionTemplate,
  copyTemplateToCompany,
  clearSelectedSchedule,
} from "../../store/slices/commissionSchedulesSlice";
import {
  selectUserRole,
  selectEffectiveCompanyId,
} from "../../store/slices/authSlice";
import type { RootState } from "../../store";
import type {
  CommissionScheduleDetail,
  CommissionRule,
  CommissionRuleTypeEnum,
  TransactionTypeEnum,
  TransactionSubtypeEnum,
} from "../../types";

// ─── Tier form shape ──────────────────────────────────────────────────────────

export interface TierFormEntry {
  id: string;
  minAmount: string;
  maxAmount: string; // empty string = unlimited (null on submit)
  customerChargeAmount: string;
  agentCommissionAmount: string;
}

function emptyTier(): TierFormEntry {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    minAmount: "",
    maxAmount: "",
    customerChargeAmount: "",
    agentCommissionAmount: "",
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type SchedulesTab = "my-schedules" | "templates";

export function useCommissionSchedulesScreen() {
  const dispatch = useAppDispatch();
  const companyId = useAppSelector(selectEffectiveCompanyId);
  const userRole = useAppSelector(selectUserRole);
  const isSuperAdmin = userRole === "Super Administrator";

  const {
    items: schedules,
    templates,
    selectedSchedule,
    isLoading,
    isTemplatesLoading,
    isDetailLoading,
    error,
  } = useAppSelector((state: RootState) => state.commissionSchedules);

  // ── Tab ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<SchedulesTab>("my-schedules");

  // ── Messages ───────────────────────────────────────────────────────────────
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMsg = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    if (type === "success") setTimeout(() => setMessage(null), 3500);
  };

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isEditTiersOpen, setIsEditTiersOpen] = useState(false);
  const [isCopyConfirmOpen, setIsCopyConfirmOpen] = useState(false);
  const [templateToCopy, setTemplateToCopy] =
    useState<CommissionScheduleDetail | null>(null);
  const [ruleForTiers, setRuleForTiers] = useState<CommissionRule | null>(null);
  const [scheduleIdForRule, setScheduleIdForRule] = useState<number | null>(
    null,
  );

  // ── Submitting ─────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Create Schedule form ──────────────────────────────────────────────────
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleDesc, setScheduleDesc] = useState("");

  // ─── Create Template form ──────────────────────────────────────────────────
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");

  // ─── Add Rule form ─────────────────────────────────────────────────────────
  const [ruleTransactionType, setRuleTransactionType] =
    useState<TransactionTypeEnum>("DEPOSIT");
  const [ruleTransactionSubtype, setRuleTransactionSubtype] =
    useState<TransactionSubtypeEnum | null>(null);
  const [ruleType, setRuleType] = useState<CommissionRuleTypeEnum>("PERCENTAGE");
  const [ruleRate, setRuleRate] = useState("");
  const [ruleVolumeCap, setRuleVolumeCap] = useState("");
  const [ruleCommissionCap, setRuleCommissionCap] = useState("");
  const [ruleTiers, setRuleTiers] = useState<TierFormEntry[]>([emptyTier()]);

  // ─── Edit Tiers form ───────────────────────────────────────────────────────
  const [editTiers, setEditTiers] = useState<TierFormEntry[]>([emptyTier()]);

  // ─── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (companyId) {
      dispatch(fetchCommissionSchedules({ companyId }));
    }
    dispatch(fetchCommissionTemplates());
  }, [dispatch, companyId]);

  const onRefresh = useCallback(async () => {
    if (companyId) {
      await dispatch(fetchCommissionSchedules({ companyId, forceRefresh: true }));
    }
  }, [dispatch, companyId]);

  const selectSchedule = useCallback(
    async (id: number) => {
      await dispatch(fetchCommissionScheduleDetail(id));
    },
    [dispatch],
  );

  const clearSelection = useCallback(() => {
    dispatch(clearSelectedSchedule());
  }, [dispatch]);

  // ─── Create Schedule ───────────────────────────────────────────────────────
  const openCreateSchedule = () => {
    setScheduleName("");
    setScheduleDesc("");
    setIsCreateScheduleOpen(true);
  };

  const handleCreateSchedule = async () => {
    if (!scheduleName.trim()) {
      showMsg("error", "Schedule name is required.");
      return;
    }
    if (!companyId) {
      showMsg("error", "No company context found.");
      return;
    }
    setIsSubmitting(true);
    const result = await dispatch(
      createCommissionSchedule({
        companyId,
        name: scheduleName.trim(),
        description: scheduleDesc.trim() || null,
      }),
    );
    setIsSubmitting(false);
    if (createCommissionSchedule.fulfilled.match(result)) {
      setIsCreateScheduleOpen(false);
      showMsg("success", "Schedule created successfully.");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to create schedule.");
    }
  };

  // ─── Create Template (Super Admin) ────────────────────────────────────────
  const openCreateTemplate = () => {
    setTemplateName("");
    setTemplateDesc("");
    setIsCreateTemplateOpen(true);
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      showMsg("error", "Template name is required.");
      return;
    }
    setIsSubmitting(true);
    const result = await dispatch(
      createCommissionTemplate({
        name: templateName.trim(),
        description: templateDesc.trim() || null,
      }),
    );
    setIsSubmitting(false);
    if (createCommissionTemplate.fulfilled.match(result)) {
      setIsCreateTemplateOpen(false);
      showMsg("success", "Template created successfully.");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to create template.");
    }
  };

  // ─── Add Rule ─────────────────────────────────────────────────────────────
  const openAddRule = (scheduleId: number) => {
    setScheduleIdForRule(scheduleId);
    setRuleTransactionType("DEPOSIT");
    setRuleTransactionSubtype(null);
    setRuleType("PERCENTAGE");
    setRuleRate("");
    setRuleVolumeCap("");
    setRuleCommissionCap("");
    setRuleTiers([emptyTier()]);
    setIsAddRuleOpen(true);
  };

  const handleAddRule = async () => {
    if (!scheduleIdForRule) return;

    if (ruleType === "PERCENTAGE") {
      if (!ruleRate || isNaN(Number(ruleRate)) || Number(ruleRate) <= 0) {
        showMsg("error", "Enter a valid rate (e.g. 1.5 for 1.5%).");
        return;
      }
    } else {
      if (ruleTiers.length === 0) {
        showMsg("error", "At least one tier is required.");
        return;
      }
      for (const tier of ruleTiers) {
        if (!tier.minAmount || isNaN(Number(tier.minAmount))) {
          showMsg("error", "Each tier must have a valid minimum amount.");
          return;
        }
        if (!tier.customerChargeAmount || isNaN(Number(tier.customerChargeAmount))) {
          showMsg("error", "Each tier must have a valid customer charge.");
          return;
        }
        if (!tier.agentCommissionAmount || isNaN(Number(tier.agentCommissionAmount))) {
          showMsg("error", "Each tier must have a valid agent commission.");
          return;
        }
      }
    }

    const tiersPayload =
      ruleType === "TIERED_FLAT"
        ? ruleTiers.map((t, i) => ({
            minAmount: Number(t.minAmount),
            maxAmount: t.maxAmount ? Number(t.maxAmount) : null,
            customerChargeAmount: Number(t.customerChargeAmount),
            agentCommissionAmount: Number(t.agentCommissionAmount),
            sortOrder: i + 1,
          }))
        : undefined;

    setIsSubmitting(true);
    const result = await dispatch(
      addCommissionRule({
        scheduleId: scheduleIdForRule,
        data: {
          transactionType: ruleTransactionType,
          transactionSubtype: ruleTransactionSubtype,
          ruleType,
          rate: ruleType === "PERCENTAGE" ? Number(ruleRate) : null,
          volumeCap: ruleVolumeCap ? Number(ruleVolumeCap) : null,
          commissionCap: ruleCommissionCap ? Number(ruleCommissionCap) : null,
          tiers: tiersPayload,
        },
      }),
    );
    setIsSubmitting(false);
    if (addCommissionRule.fulfilled.match(result)) {
      setIsAddRuleOpen(false);
      showMsg("success", "Rule added successfully.");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to add rule.");
    }
  };

  // ─── Deactivate Rule ──────────────────────────────────────────────────────
  const handleDeactivateRule = async (ruleId: number) => {
    if (!selectedSchedule) return;
    setIsSubmitting(true);
    const result = await dispatch(
      deactivateCommissionRule({ scheduleId: selectedSchedule.id, ruleId }),
    );
    setIsSubmitting(false);
    if (deactivateCommissionRule.fulfilled.match(result)) {
      showMsg("success", "Rule deactivated.");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to deactivate rule.");
    }
  };

  // ─── Edit Tiers (Replace) ─────────────────────────────────────────────────
  const openEditTiers = (rule: CommissionRule) => {
    setRuleForTiers(rule);
    if (rule.tiers.length > 0) {
      setEditTiers(
        rule.tiers.map((t) => ({
          id: t.id.toString(),
          minAmount: String(t.minAmount),
          maxAmount: t.maxAmount != null ? String(t.maxAmount) : "",
          customerChargeAmount: String(t.customerChargeAmount),
          agentCommissionAmount: String(t.agentCommissionAmount),
        })),
      );
    } else {
      setEditTiers([emptyTier()]);
    }
    setIsEditTiersOpen(true);
  };

  const handleReplaceTiers = async () => {
    if (!ruleForTiers) return;
    for (const tier of editTiers) {
      if (!tier.minAmount || isNaN(Number(tier.minAmount))) {
        showMsg("error", "Each tier needs a valid minimum amount.");
        return;
      }
      if (!tier.customerChargeAmount || isNaN(Number(tier.customerChargeAmount))) {
        showMsg("error", "Each tier needs a valid customer charge.");
        return;
      }
      if (!tier.agentCommissionAmount || isNaN(Number(tier.agentCommissionAmount))) {
        showMsg("error", "Each tier needs a valid agent commission.");
        return;
      }
    }

    setIsSubmitting(true);
    const result = await dispatch(
      replaceCommissionTiers({
        ruleId: ruleForTiers.id,
        tiers: editTiers.map((t, i) => ({
          minAmount: Number(t.minAmount),
          maxAmount: t.maxAmount ? Number(t.maxAmount) : null,
          customerChargeAmount: Number(t.customerChargeAmount),
          agentCommissionAmount: Number(t.agentCommissionAmount),
          sortOrder: i + 1,
        })),
      }),
    );
    setIsSubmitting(false);
    if (replaceCommissionTiers.fulfilled.match(result)) {
      setIsEditTiersOpen(false);
      setRuleForTiers(null);
      showMsg("success", "Tiers updated successfully.");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to update tiers.");
    }
  };

  // ─── Delete Schedule ──────────────────────────────────────────────────────
  const handleDeleteSchedule = async (scheduleId: number) => {
    setIsSubmitting(true);
    const result = await dispatch(deleteCommissionSchedule(scheduleId));
    setIsSubmitting(false);
    if (deleteCommissionSchedule.fulfilled.match(result)) {
      dispatch(clearSelectedSchedule());
      showMsg("success", "Schedule deleted.");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to delete schedule.");
    }
  };

  // ─── Copy Template ────────────────────────────────────────────────────────
  const promptCopyTemplate = (template: CommissionScheduleDetail) => {
    setTemplateToCopy(template);
    setIsCopyConfirmOpen(true);
  };

  const handleCopyTemplate = async () => {
    if (!templateToCopy) return;
    setIsSubmitting(true);
    const result = await dispatch(
      copyTemplateToCompany({ templateId: templateToCopy.id }),
    );
    setIsSubmitting(false);
    setIsCopyConfirmOpen(false);
    setTemplateToCopy(null);
    if (copyTemplateToCompany.fulfilled.match(result)) {
      showMsg(
        "success",
        `Template copied as "${result.payload.name}". Find it in My Schedules.`,
      );
      setActiveTab("my-schedules");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to copy template.");
    }
  };

  // ─── Tier helpers ─────────────────────────────────────────────────────────
  const addTierRow = (
    setter: React.Dispatch<React.SetStateAction<TierFormEntry[]>>,
  ) => setter((prev) => [...prev, emptyTier()]);

  const removeTierRow = (
    setter: React.Dispatch<React.SetStateAction<TierFormEntry[]>>,
    id: string,
  ) => setter((prev) => prev.filter((t) => t.id !== id));

  const updateTierField = (
    setter: React.Dispatch<React.SetStateAction<TierFormEntry[]>>,
    id: string,
    field: keyof Omit<TierFormEntry, "id">,
    value: string,
  ) =>
    setter((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );

  return {
    // Data
    schedules,
    templates,
    selectedSchedule,
    isLoading,
    isTemplatesLoading,
    isDetailLoading,
    isSubmitting,
    error,
    message,
    isSuperAdmin,
    // Tab
    activeTab,
    setActiveTab,
    // Schedule selection
    selectSchedule,
    clearSelection,
    onRefresh,
    // --- Create schedule modal ---
    isCreateScheduleOpen,
    openCreateSchedule,
    closeCreateSchedule: () => setIsCreateScheduleOpen(false),
    scheduleName,
    setScheduleName,
    scheduleDesc,
    setScheduleDesc,
    handleCreateSchedule,
    // --- Create template modal ---
    isCreateTemplateOpen,
    openCreateTemplate,
    closeCreateTemplate: () => setIsCreateTemplateOpen(false),
    templateName,
    setTemplateName,
    templateDesc,
    setTemplateDesc,
    handleCreateTemplate,
    // --- Add rule modal ---
    isAddRuleOpen,
    openAddRule,
    closeAddRule: () => setIsAddRuleOpen(false),
    ruleTransactionType,
    setRuleTransactionType,
    ruleTransactionSubtype,
    setRuleTransactionSubtype,
    ruleType,
    setRuleType,
    ruleRate,
    setRuleRate,
    ruleVolumeCap,
    setRuleVolumeCap,
    ruleCommissionCap,
    setRuleCommissionCap,
    ruleTiers,
    setRuleTiers,
    handleAddRule,
    // --- Edit tiers modal ---
    isEditTiersOpen,
    ruleForTiers,
    openEditTiers,
    closeEditTiers: () => { setIsEditTiersOpen(false); setRuleForTiers(null); },
    editTiers,
    setEditTiers,
    handleReplaceTiers,
    // --- Copy template confirm ---
    isCopyConfirmOpen,
    templateToCopy,
    promptCopyTemplate,
    closeCopyConfirm: () => { setIsCopyConfirmOpen(false); setTemplateToCopy(null); },
    handleCopyTemplate,
    // --- Actions ---
    handleDeactivateRule,
    handleDeleteSchedule,
    // --- Tier helpers ---
    addTierRow,
    removeTierRow,
    updateTierField,
  };
}
