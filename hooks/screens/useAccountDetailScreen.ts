import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Dispatch,
  SetStateAction,
} from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchAccountById,
  updateAccount,
  updateAccountTemplate,
  fetchAccounts,
} from "../../store/slices/accountsSlice";
import {
  fetchCommissionSchedules,
  fetchCommissionScheduleDetail,
  fetchCommissionTemplates,
  createCommissionSchedule,
  createCommissionTemplate,
  addCommissionRule,
  addCommissionTemplateRule,
  deactivateCommissionRule,
  deactivateCommissionTemplateRule,
  replaceCommissionTiers,
  replaceCommissionTemplateTiers,
  clearSelectedSchedule,
  setSelectedSchedule,
} from "../../store/slices/commissionSchedulesSlice";
import {
  selectUserRole,
  selectEffectiveCompanyId,
} from "../../store/slices/authSlice";
import type { RootState } from "../../store";
import type {
  AccountTypeEnum,
  CommissionModelEnum,
  CommissionRule,
  CommissionRuleTypeEnum,
  CommissionScheduleDetail,
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

export function emptyTier(): TierFormEntry {
  return {
    id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
    minAmount: "",
    maxAmount: "",
    customerChargeAmount: "",
    agentCommissionAmount: "",
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAccountDetailScreen(accountId: number, isTemplate = false) {
  const dispatch = useAppDispatch();
  const companyId = useAppSelector(selectEffectiveCompanyId);
  const userRole = useAppSelector(selectUserRole);
  const isSuperAdmin = userRole === "Super Administrator";
  const isAdmin = userRole === "Administrator" || isSuperAdmin;

  // ── Account data ───────────────────────────────────────────────────────────
  const account = useAppSelector((state: RootState) => {
    if (isTemplate) {
      return (
        state.accounts.templates.find((a) => a.id === accountId) ??
        state.accounts.selectedAccount
      );
    }
    return (
      state.accounts.items.find((a) => a.id === accountId) ??
      state.accounts.selectedAccount
    );
  });
  const isAccountLoading = useAppSelector(
    (state: RootState) => state.accounts.isLoading,
  );

  // ── Commission schedule data ───────────────────────────────────────────────
  const schedule = useAppSelector(
    (state: RootState) => state.commissionSchedules.selectedSchedule,
  );
  const isScheduleLoading = useAppSelector(
    (state: RootState) => state.commissionSchedules.isDetailLoading,
  );
  // For templates, use the template schedules list; otherwise use company schedules
  const allSchedules = useAppSelector((state: RootState) =>
    isTemplate
      ? state.commissionSchedules.templates
      : state.commissionSchedules.items,
  );
  const isSchedulesLoading = useAppSelector((state: RootState) =>
    isTemplate
      ? state.commissionSchedules.isTemplatesLoading
      : state.commissionSchedules.isLoading,
  );

  // ── Load data on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    // Templates have no company_id so GET /accounts/{id} would 422 — the
    // account is already in state.accounts.templates from the list page.
    if (!isTemplate) {
      dispatch(fetchAccountById(accountId));
    }
    if (isTemplate) {
      dispatch(fetchCommissionTemplates());
    } else if (companyId) {
      dispatch(fetchCommissionSchedules({ companyId }));
    }
  }, [dispatch, accountId, companyId, isTemplate]);

  // Load/clear schedule detail when account's commissionScheduleId changes
  const prevScheduleIdRef = useRef<number | null | undefined>(undefined);
  useEffect(() => {
    if (account === null || account === undefined) return;
    const sid = account.commissionScheduleId ?? null;
    if (sid === prevScheduleIdRef.current) return;
    prevScheduleIdRef.current = sid;
    if (sid) {
      if (isTemplate) {
        // For templates, find the schedule from the already-loaded templates list
        // (template schedules have company_id = null, fetchCommissionScheduleDetail would fail)
        const found = allSchedules.find((s) => s.id === sid);
        if (found && "rules" in found) {
          dispatch(setSelectedSchedule(found as CommissionScheduleDetail));
        } else {
          // Not yet loaded — fetch it (will work once backend accepts no company_id)
          dispatch(fetchCommissionScheduleDetail(sid));
        }
      } else {
        dispatch(fetchCommissionScheduleDetail(sid));
      }
    } else {
      dispatch(clearSelectedSchedule());
    }
  }, [
    dispatch,
    account?.commissionScheduleId,
    account,
    isTemplate,
    allSchedules,
  ]);

  // ── Account form state ─────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeEnum>("BANK");
  const [commissionModel, setCommissionModel] =
    useState<CommissionModelEnum>("EXPECTED_ONLY");
  const [isActive, setIsActive] = useState(true);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Sync form fields when account first loads (only on ID change)
  const syncedAccountIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (account && account.id !== syncedAccountIdRef.current) {
      syncedAccountIdRef.current = account.id;
      setName(account.name);
      setAccountType(account.accountType);
      setCommissionModel(account.commissionModel ?? "EXPECTED_ONLY");
      setIsActive(account.isActive);
    }
  }, [account]);

  const handleSaveAccount = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (!name.trim()) {
      return { success: false, message: "Account name is required" };
    }
    if (!isTemplate && !companyId) {
      return { success: false, message: "Company not found" };
    }
    setIsSavingAccount(true);
    setAccountError(null);
    try {
      if (isTemplate) {
        await dispatch(
          updateAccountTemplate({
            id: accountId,
            data: { name: name.trim(), accountType, commissionModel, isActive },
          }),
        ).unwrap();
      } else {
        await dispatch(
          updateAccount({
            id: accountId,
            data: {
              name: name.trim(),
              accountType,
              commissionModel,
              isActive,
              companyId: companyId!,
            },
          }),
        ).unwrap();
        dispatch(fetchAccountById(accountId));
      }
      return { success: true, message: "Account saved successfully" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save account";
      setAccountError(msg);
      return { success: false, message: msg };
    } finally {
      setIsSavingAccount(false);
    }
  };

  // ── Messages ───────────────────────────────────────────────────────────────
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showMsg = useCallback((type: "success" | "error", text: string) => {
    setMessage({ type, text });
    if (type === "success") setTimeout(() => setMessage(null), 3500);
  }, []);

  // ── Commission: Assign existing schedule ───────────────────────────────────
  const handleAssignSchedule = async (
    scheduleId: number | null,
  ): Promise<void> => {
    if (!isTemplate && !companyId) return;
    const updateAction = isTemplate
      ? updateAccountTemplate({
          id: accountId,
          data: { commissionScheduleId: scheduleId },
        })
      : updateAccount({
          id: accountId,
          data: { commissionScheduleId: scheduleId, companyId: companyId! },
        });
    const result = await dispatch(updateAction);
    const fulfilled = isTemplate
      ? updateAccountTemplate.fulfilled.match(result)
      : updateAccount.fulfilled.match(result);
    if (fulfilled) {
      if (!isTemplate) dispatch(fetchAccountById(accountId));
      if (scheduleId) {
        if (isTemplate) {
          const found = allSchedules.find((s) => s.id === scheduleId);
          if (found && "rules" in found) {
            dispatch(setSelectedSchedule(found as CommissionScheduleDetail));
          } else {
            dispatch(fetchCommissionScheduleDetail(scheduleId));
          }
        } else {
          dispatch(fetchCommissionScheduleDetail(scheduleId));
        }
        prevScheduleIdRef.current = scheduleId;
      } else {
        dispatch(clearSelectedSchedule());
        prevScheduleIdRef.current = null;
      }
      showMsg(
        "success",
        scheduleId
          ? "Commission structure assigned."
          : "Commission structure removed.",
      );
    } else {
      showMsg("error", "Failed to update commission structure.");
    }
  };

  // ── Commission: Create new schedule and link to this account ──────────────
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState("");
  const [newScheduleDesc, setNewScheduleDesc] = useState("");
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [createScheduleError, setCreateScheduleError] = useState<string | null>(
    null,
  );

  const openCreateSchedule = useCallback(() => {
    setNewScheduleName("");
    setNewScheduleDesc("");
    setCreateScheduleError(null);
    setIsCreateScheduleOpen(true);
  }, []);

  const handleCreateAndLinkSchedule = async (): Promise<void> => {
    if (!newScheduleName.trim()) {
      setCreateScheduleError("Structure name is required.");
      return;
    }
    if (!isTemplate && !companyId) {
      setCreateScheduleError("Company not found.");
      return;
    }
    setIsCreatingSchedule(true);
    setCreateScheduleError(null);
    try {
      // 1) Create the schedule
      let createResult: CommissionScheduleDetail | { id: number };
      if (isTemplate) {
        createResult = await dispatch(
          createCommissionTemplate({
            name: newScheduleName.trim(),
            description: newScheduleDesc.trim() || null,
          }),
        ).unwrap();
      } else {
        createResult = await dispatch(
          createCommissionSchedule({
            companyId: companyId!,
            name: newScheduleName.trim(),
            description: newScheduleDesc.trim() || null,
          }),
        ).unwrap();
      }

      // 2) Link it to the account
      if (isTemplate) {
        await dispatch(
          updateAccountTemplate({
            id: accountId,
            data: { commissionScheduleId: createResult.id },
          }),
        ).unwrap();
        // Refresh template schedules so it appears in allSchedules
        dispatch(fetchCommissionTemplates());
        prevScheduleIdRef.current = createResult.id;
      } else {
        await dispatch(
          updateAccount({
            id: accountId,
            data: {
              commissionScheduleId: createResult.id,
              companyId: companyId!,
            },
          }),
        ).unwrap();
        dispatch(fetchAccountById(accountId));
      }

      // 3) Load the full schedule detail (with rules)
      if (isTemplate) {
        // Template schedules have no company_id — set directly (newly created has no rules yet)
        dispatch(
          setSelectedSchedule({
            ...(createResult as CommissionScheduleDetail),
            rules: [],
          } as CommissionScheduleDetail),
        );
      } else {
        await dispatch(fetchCommissionScheduleDetail(createResult.id));
      }

      setIsCreateScheduleOpen(false);
      setNewScheduleName("");
      setNewScheduleDesc("");
      showMsg("success", "Commission structure created and linked.");
    } catch (err) {
      setCreateScheduleError(
        err instanceof Error ? err.message : "Failed to create structure.",
      );
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  // ── Add Rule ──────────────────────────────────────────────────────────────
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [addRuleError, setAddRuleError] = useState<string | null>(null);
  const [ruleTransactionType, setRuleTransactionType] =
    useState<TransactionTypeEnum>("DEPOSIT");
  const [ruleTransactionSubtype, setRuleTransactionSubtype] =
    useState<TransactionSubtypeEnum | null>(null);
  const [ruleType, setRuleType] =
    useState<CommissionRuleTypeEnum>("PERCENTAGE");
  const [ruleRate, setRuleRate] = useState("");
  const [ruleVolumeCap, setRuleVolumeCap] = useState("");
  const [ruleCommissionCap, setRuleCommissionCap] = useState("");
  const [ruleTiers, setRuleTiers] = useState<TierFormEntry[]>([emptyTier()]);

  const openAddRule = useCallback(() => {
    setRuleTransactionType("DEPOSIT");
    setRuleTransactionSubtype(null);
    setRuleType("PERCENTAGE");
    setRuleRate("");
    setRuleVolumeCap("");
    setRuleCommissionCap("");
    setRuleTiers([emptyTier()]);
    setAddRuleError(null);
    setIsAddRuleOpen(true);
  }, []);

  const handleAddRule = async (): Promise<void> => {
    if (isSubmittingRef.current || !schedule) return;
    setAddRuleError(null);

    if (ruleType === "PERCENTAGE") {
      if (!ruleRate || isNaN(Number(ruleRate)) || Number(ruleRate) <= 0) {
        setAddRuleError("Enter a valid rate (e.g. 1.5 for 1.5%).");
        return;
      }
    } else {
      if (ruleTiers.length === 0) {
        setAddRuleError("At least one tier is required.");
        return;
      }
      for (const tier of ruleTiers) {
        if (!tier.minAmount || isNaN(Number(tier.minAmount))) {
          setAddRuleError("Each tier must have a valid minimum amount.");
          return;
        }
        if (
          tier.customerChargeAmount !== "" &&
          isNaN(Number(tier.customerChargeAmount))
        ) {
          setAddRuleError("Customer charge must be a valid number.");
          return;
        }
        if (
          !tier.agentCommissionAmount ||
          isNaN(Number(tier.agentCommissionAmount))
        ) {
          setAddRuleError("Each tier must have a valid agent commission.");
          return;
        }
      }
    }

    const tiersPayload =
      ruleType === "TIERED_FLAT"
        ? ruleTiers.map((t, i) => ({
            minAmount: Number(t.minAmount),
            maxAmount: t.maxAmount ? Number(t.maxAmount) : null,
            customerChargeAmount:
              t.customerChargeAmount !== ""
                ? Number(t.customerChargeAmount)
                : null,
            agentCommissionAmount: Number(t.agentCommissionAmount),
            sortOrder: i + 1,
          }))
        : undefined;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    const rulePayload = {
      scheduleId: schedule.id,
      data: {
        transactionType: ruleTransactionType,
        transactionSubtype: ruleTransactionSubtype,
        ruleType,
        rate: ruleType === "PERCENTAGE" ? Number(ruleRate) : null,
        volumeCap: ruleVolumeCap ? Number(ruleVolumeCap) : null,
        commissionCap: ruleCommissionCap ? Number(ruleCommissionCap) : null,
        tiers: tiersPayload,
      },
    };
    const result = await dispatch(
      isTemplate
        ? addCommissionTemplateRule(rulePayload)
        : addCommissionRule(rulePayload),
    );
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    const ok = isTemplate
      ? addCommissionTemplateRule.fulfilled.match(result)
      : addCommissionRule.fulfilled.match(result);
    if (ok) {
      setIsAddRuleOpen(false);
      setAddRuleError(null);
      showMsg("success", "Rule added.");
    } else {
      setAddRuleError((result.payload as string) ?? "Failed to add rule.");
    }
  };

  // ── Deactivate Rule ────────────────────────────────────────────────────────
  const handleDeactivateRule = async (ruleId: number): Promise<void> => {
    if (!schedule) return;
    setIsSubmitting(true);
    const deactivatePayload = { scheduleId: schedule.id, ruleId };
    const result = await dispatch(
      isTemplate
        ? deactivateCommissionTemplateRule(deactivatePayload)
        : deactivateCommissionRule(deactivatePayload),
    );
    setIsSubmitting(false);
    const ok = isTemplate
      ? deactivateCommissionTemplateRule.fulfilled.match(result)
      : deactivateCommissionRule.fulfilled.match(result);
    if (ok) {
      showMsg("success", "Rule deactivated.");
    } else {
      showMsg(
        "error",
        (result.payload as string) ?? "Failed to deactivate rule.",
      );
    }
  };

  // ── Edit Tiers ─────────────────────────────────────────────────────────────
  const [isEditTiersOpen, setIsEditTiersOpen] = useState(false);
  const [ruleForTiers, setRuleForTiers] = useState<CommissionRule | null>(null);
  const [editTiers, setEditTiers] = useState<TierFormEntry[]>([emptyTier()]);

  const openEditTiers = useCallback((rule: CommissionRule) => {
    setRuleForTiers(rule);
    if (rule.tiers.length > 0) {
      setEditTiers(
        rule.tiers.map((t) => ({
          id: t.id.toString(),
          minAmount: String(t.minAmount),
          maxAmount: t.maxAmount != null ? String(t.maxAmount) : "",
          customerChargeAmount:
            t.customerChargeAmount != null
              ? String(t.customerChargeAmount)
              : "",
          agentCommissionAmount: String(t.agentCommissionAmount),
        })),
      );
    } else {
      setEditTiers([emptyTier()]);
    }
    setIsEditTiersOpen(true);
  }, []);

  const handleReplaceTiers = async (): Promise<void> => {
    if (!ruleForTiers) return;
    for (const tier of editTiers) {
      if (!tier.minAmount || isNaN(Number(tier.minAmount))) {
        showMsg("error", "Each tier needs a valid minimum amount.");
        return;
      }
      if (
        tier.customerChargeAmount !== "" &&
        isNaN(Number(tier.customerChargeAmount))
      ) {
        showMsg("error", "Customer charge must be a valid number.");
        return;
      }
      if (
        !tier.agentCommissionAmount ||
        isNaN(Number(tier.agentCommissionAmount))
      ) {
        showMsg("error", "Each tier needs a valid agent commission.");
        return;
      }
    }
    setIsSubmitting(true);
    const tiersPayloadReplace = {
      ruleId: ruleForTiers.id,
      tiers: editTiers.map((t, i) => ({
        minAmount: Number(t.minAmount),
        maxAmount: t.maxAmount ? Number(t.maxAmount) : null,
        customerChargeAmount:
          t.customerChargeAmount !== "" ? Number(t.customerChargeAmount) : null,
        agentCommissionAmount: Number(t.agentCommissionAmount),
        sortOrder: i + 1,
      })),
    };
    const result = await dispatch(
      isTemplate
        ? replaceCommissionTemplateTiers(tiersPayloadReplace)
        : replaceCommissionTiers(tiersPayloadReplace),
    );
    setIsSubmitting(false);
    const ok = isTemplate
      ? replaceCommissionTemplateTiers.fulfilled.match(result)
      : replaceCommissionTiers.fulfilled.match(result);
    if (ok) {
      setIsEditTiersOpen(false);
      setRuleForTiers(null);
      showMsg("success", "Tiers updated.");
    } else {
      showMsg("error", (result.payload as string) ?? "Failed to update tiers.");
    }
  };

  // ── Tier helpers ───────────────────────────────────────────────────────────
  const addTierRow = (setter: Dispatch<SetStateAction<TierFormEntry[]>>) =>
    setter((prev) => [...prev, emptyTier()]);

  const removeTierRow = (
    setter: Dispatch<SetStateAction<TierFormEntry[]>>,
    id: string,
  ) => setter((prev) => prev.filter((t) => t.id !== id));

  const updateTierField = (
    setter: Dispatch<SetStateAction<TierFormEntry[]>>,
    id: string,
    field: keyof Omit<TierFormEntry, "id">,
    value: string,
  ) =>
    setter((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)),
    );

  return {
    // Account data
    account,
    isAccountLoading,
    isAdmin,
    isSuperAdmin,
    // Account form
    name,
    setName,
    accountType,
    setAccountType,
    commissionModel,
    setCommissionModel,
    isActive,
    setIsActive,
    isSavingAccount,
    accountError,
    handleSaveAccount,
    // Commission schedule data
    schedule,
    isScheduleLoading,
    allSchedules,
    isSchedulesLoading,
    // Commission assign
    handleAssignSchedule,
    // Commission create + link
    isCreateScheduleOpen,
    openCreateSchedule,
    closeCreateSchedule: () => setIsCreateScheduleOpen(false),
    newScheduleName,
    setNewScheduleName,
    newScheduleDesc,
    setNewScheduleDesc,
    isCreatingSchedule,
    createScheduleError,
    handleCreateAndLinkSchedule,
    // Add rule
    isAddRuleOpen,
    openAddRule,
    closeAddRule: () => {
      setIsAddRuleOpen(false);
      setAddRuleError(null);
    },
    addRuleError,
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
    // Deactivate rule
    handleDeactivateRule,
    // Edit tiers
    isEditTiersOpen,
    ruleForTiers,
    openEditTiers,
    closeEditTiers: () => {
      setIsEditTiersOpen(false);
      setRuleForTiers(null);
    },
    editTiers,
    setEditTiers,
    handleReplaceTiers,
    // Tier helpers
    addTierRow,
    removeTierRow,
    updateTierField,
    // Messages
    message,
    isSubmitting,
  };
}
