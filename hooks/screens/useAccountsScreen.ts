import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  fetchAccountTemplates,
  inheritAccountTemplate,
} from "../../store/slices/accountsSlice";
import { fetchCommissionSchedules } from "../../store/slices/commissionSchedulesSlice";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";
import type {
  Account,
  AccountTypeEnum,
  CommissionModelEnum,
} from "../../types";

export const ACCOUNT_TYPES: { value: AccountTypeEnum; label: string }[] = [
  { value: "BANK", label: "Bank" },
  { value: "TELECOM", label: "Telecom" },
];

export function useAccountsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const companyId = useSelector(selectEffectiveCompanyId);
  const { items: accounts, isLoading, templates, isTemplatesLoading } = useSelector(
    (state: RootState) => state.accounts,
  );
  const { items: commissionSchedules } = useSelector(
    (state: RootState) => state.commissionSchedules,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [filterType, setFilterType] = useState<AccountTypeEnum | "ALL">("ALL");
  const [filterActive, setFilterActive] = useState<boolean | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 3-flow creation mode
  type CreationMode = "new" | "template" | "clone" | null;
  const [creationMode, setCreationMode] = useState<CreationMode>(null);
  const [cloneSource, setCloneSource] = useState<Account | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeEnum>("BANK");
  const [isActive, setIsActive] = useState(true);
  const [initialBalance, setInitialBalance] = useState<string>("");
  const [commissionScheduleId, setCommissionScheduleId] = useState<
    number | null
  >(null);
  const [commissionModel, setCommissionModel] =
    useState<CommissionModelEnum>("EXPECTED_ONLY");

  // Auto-sync commission model when account type changes
  const handleSetAccountType = (type: AccountTypeEnum) => {
    setAccountType(type);
    if (type === "BANK") {
      setCommissionModel("EXPECTED_ONLY");
    } else if (commissionModel === "EXPECTED_ONLY") {
      // Default telecom accounts to CUMULATIVE
      setCommissionModel("CUMULATIVE");
    }
  };

  useEffect(() => {
    dispatch(fetchAccounts({}));
  }, [dispatch]);

  // Load schedules on mount (used by web schedule selector)
  useEffect(() => {
    if (companyId) {
      dispatch(fetchCommissionSchedules({ companyId }));
    }
  }, [dispatch, companyId]);

  // Load templates on mount for the template flow
  useEffect(() => {
    dispatch(fetchAccountTemplates());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchAccounts({}));
    setRefreshing(false);
  };

  const resetForm = () => {
    setName("");
    setAccountType("BANK");
    setIsActive(true);
    setInitialBalance("");
    setCommissionScheduleId(null);
    setCommissionModel("EXPECTED_ONLY");
    setEditingAccount(null);
    setShowTypeDropdown(false);
    setCreationMode(null);
    setCloneSource(null);
  };

  const openAddModal = () => {
    resetForm();
    setCreationMode(null); // step 1 chooser
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setAccountType(account.accountType);
    setIsActive(account.isActive);
    setCommissionScheduleId(account.commissionScheduleId ?? null);
    setCommissionModel(account.commissionModel ?? "EXPECTED_ONLY");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Choose creation flow
  const chooseCreationMode = (mode: "new" | "template" | "clone") => {
    setCreationMode(mode);
    if (mode === "clone" && accounts.length > 0) {
      // Pre-select first account as clone source for convenience
      setCloneSource(accounts[0]);
    }
  };

  // Inherit a template — creates a company account linked to the template's schedule
  const handleInheritTemplate = async (
    template: Account,
    overrideName?: string,
  ): Promise<{ success: boolean; message: string }> => {
    if (!companyId) {
      return { success: false, message: "Company not found. Please log in again." };
    }
    const accountName = overrideName?.trim() || template.name;
    if (!accountName) {
      return { success: false, message: "Account name is required" };
    }
    setIsSubmitting(true);
    try {
      await dispatch(
        inheritAccountTemplate({ templateId: template.id, name: accountName, companyId }),
      ).unwrap();
      await dispatch(fetchAccounts({ forceRefresh: true })).unwrap();
      closeModal();
      return { success: true, message: "Account created from template" };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to inherit template",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select a clone source — pre-fills schedule from that account
  const selectCloneSource = (source: Account) => {
    setCloneSource(source);
    setAccountType(source.accountType);
    setCommissionScheduleId(source.commissionScheduleId ?? null);
    setCommissionModel(source.commissionModel ?? "EXPECTED_ONLY");
  };

  const handleSubmit = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (!name.trim()) {
      return { success: false, message: "Account name is required" };
    }

    if (!companyId) {
      return {
        success: false,
        message: "Company not found. Please log in again.",
      };
    }

    setIsSubmitting(true);
    try {
      if (editingAccount) {
        await dispatch(
          updateAccount({
            id: editingAccount.id,
            data: {
              name: name.trim(),
              accountType: accountType,
              isActive: isActive,
              companyId: companyId,
              commissionScheduleId: commissionScheduleId ?? undefined,
              commissionModel,
            },
          }),
        ).unwrap();

        // Force refresh accounts after update
        await dispatch(fetchAccounts({ forceRefresh: true })).unwrap();
        closeModal();
        return { success: true, message: "Account updated successfully" };
      } else {
        await dispatch(
          createAccount({
            companyId: companyId,
            name: name.trim(),
            accountType: accountType,
            isActive: isActive,
            ...(initialBalance
              ? { initialBalance: parseFloat(initialBalance) }
              : {}),
            commissionScheduleId: commissionScheduleId ?? undefined,
            commissionModel,
          }),
        ).unwrap();

        // Force refresh accounts after creation
        await dispatch(fetchAccounts({ forceRefresh: true })).unwrap();
        closeModal();
        return { success: true, message: "Account created successfully" };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to save account",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (account: Account) => {
    setAccountToDelete(account);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (!accountToDelete) {
      return { success: false, message: "No account selected" };
    }

    try {
      await dispatch(deleteAccount(accountToDelete.id)).unwrap();
      setShowDeleteConfirm(false);
      setAccountToDelete(null);
      return { success: true, message: "Account deleted successfully" };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to delete account",
      };
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setAccountToDelete(null);
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((account) => {
    // Filter by type
    if (filterType !== "ALL" && account.accountType !== filterType) {
      return false;
    }

    // Filter by active status
    if (filterActive !== "ALL" && account.isActive !== filterActive) {
      return false;
    }

    // Filter by search query
    if (
      searchQuery &&
      !account.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Get stats
  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.isActive).length,
    inactive: accounts.filter((a) => !a.isActive).length,
    bank: accounts.filter((a) => a.accountType === "BANK").length,
    telecom: accounts.filter((a) => a.accountType === "TELECOM").length,
  };

  return {
    // State
    accounts: filteredAccounts,
    allAccounts: accounts,
    isLoading,
    refreshing,
    isSubmitting,
    isModalOpen,
    editingAccount,
    showTypeDropdown,
    setShowTypeDropdown,
    showDeleteConfirm,
    accountToDelete,

    // 3-flow creation
    creationMode,
    setCreationMode,
    chooseCreationMode,
    cloneSource,
    selectCloneSource,
    templates,
    isTemplatesLoading,
    handleInheritTemplate,

    // Filters
    filterType,
    setFilterType,
    filterActive,
    setFilterActive,
    searchQuery,
    setSearchQuery,

    // Form state
    name,
    setName,
    accountType,
    setAccountType: handleSetAccountType,
    isActive,
    setIsActive,
    initialBalance,
    setInitialBalance,
    commissionScheduleId,
    setCommissionScheduleId,
    commissionModel,
    setCommissionModel,

    // Commission schedule options (for web selector)
    commissionSchedules,

    // Stats
    stats,

    // Actions
    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    confirmDelete,
    handleDelete,
    cancelDelete,
  };
}
