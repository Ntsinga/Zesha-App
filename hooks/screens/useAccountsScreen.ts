import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../../store/slices/accountsSlice";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
import type { AppDispatch, RootState } from "../../store";
import type { Account, AccountTypeEnum } from "../../types";

export const ACCOUNT_TYPES: { value: AccountTypeEnum; label: string }[] = [
  { value: "BANK", label: "Bank" },
  { value: "TELECOM", label: "Telecom" },
];

export function useAccountsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const companyId = useSelector(selectEffectiveCompanyId);
  const { items: accounts, isLoading } = useSelector(
    (state: RootState) => state.accounts,
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

  // Form state
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeEnum>("BANK");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    dispatch(fetchAccounts({}));
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
    setEditingAccount(null);
    setShowTypeDropdown(false);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setAccountType(account.accountType);
    setIsActive(account.isActive);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
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
    setAccountType,
    isActive,
    setIsActive,

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
