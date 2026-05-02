import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useNetworkContext } from "@/hooks/useNetworkStatus";
import { queueOfflineMutation } from "@/utils/offlineQueue";
import { selectEffectiveCompanyId } from "@/store/slices/authSlice";

import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  clearExpense,
} from "../../store/slices/expensesSlice";
import {
  fetchExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory,
} from "../../store/slices/expenseCategoriesSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { Expense, ExpenseFundingSource, ExpenseStatus } from "../../types";

export const EXPENSE_FUNDING_SOURCES: Array<{
  value: ExpenseFundingSource;
  label: string;
}> = [
  { value: "CAPITAL", label: "Capital" },
  { value: "COMMISSIONS", label: "Commissions" },
  { value: "EXTERNAL_INCOME", label: "External Income" },
];

const getCurrentMonthValue = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getMonthRange = (monthValue: string): { start: string; end: string } => {
  const [year, month] = monthValue.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}T23:59:59`;
  return { start, end };
};

const normalizeDateInput = (value: string): string => value.slice(0, 10);

export function useExpensesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const companyId = useSelector(selectEffectiveCompanyId);
  const { isConnected } = useNetworkContext();

  const { items: expenses, isLoading } = useSelector(
    (state: RootState) => state.expenses,
  );

  const { items: categories, isLoading: categoriesLoading } = useSelector(
    (state: RootState) => state.expenseCategories,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [clearConfirmId, setClearConfirmId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [category, setCategory] = useState("");
  const [fundingSource, setFundingSource] =
    useState<ExpenseFundingSource>("CAPITAL");

  const [selectedMonth, setSelectedMonth] =
    useState<string>(getCurrentMonthValue);
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<ExpenseStatus | "ALL">(
    "ALL",
  );
  const [filterSource, setFilterSource] = useState<
    ExpenseFundingSource | "ALL"
  >("ALL");

  const monthRange = useMemo(
    () => getMonthRange(selectedMonth),
    [selectedMonth],
  );

  const refreshExpenses = useCallback(
    async (forceRefresh = false) => {
      await dispatch(
        fetchExpenses({
          dateFrom: monthRange.start,
          dateTo: monthRange.end,
          forceRefresh,
        }),
      );
    },
    [dispatch, monthRange.end, monthRange.start],
  );

  useEffect(() => {
    if (companyId) {
      refreshExpenses();
      dispatch(fetchExpenseCategories({ companyId }));
    }
  }, [companyId, refreshExpenses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshExpenses(true);
    setRefreshing(false);
  }, [refreshExpenses]);

  const resetForm = useCallback(() => {
    setName("");
    setAmount("");
    setDescription("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setCategory("");
    setFundingSource("CAPITAL");
    setEditingExpense(null);
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  const openEditModal = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setName(expense.name);
    setAmount(expense.amount.toString());
    setDescription(expense.description || "");
    setExpenseDate(normalizeDateInput(expense.expenseDate));
    setCategory(expense.category || "");
    setFundingSource(expense.fundingSource);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  const validateForm = useCallback((): string | null => {
    if (!name.trim()) {
      return "Expense name is required.";
    }
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      return "Please enter a valid amount.";
    }
    if (!fundingSource) {
      return "Please select a funding source.";
    }
    return null;
  }, [amount, fundingSource, name]);

  const handleSubmit = useCallback(async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    const validationError = validateForm();
    if (validationError) {
      return { success: false, error: validationError };
    }

    if (!companyId) {
      return {
        success: false,
        error: "Company not found. Please log in again.",
      };
    }

    const amountNum = parseFloat(amount);

    if (!isConnected) {
      if (editingExpense) {
        return {
          success: false,
          error: "Editing expenses requires an internet connection.",
        };
      }

      try {
        await queueOfflineMutation({
          entityType: "expense",
          method: "POST",
          endpoint: "/expenses/",
          payload: {
            companyId,
            name: name.trim(),
            amount: amountNum,
            description: description.trim() || undefined,
            expenseDate,
            category: category || undefined,
            fundingSource,
          },
        });
        closeModal();
        return { success: true };
      } catch {
        return {
          success: false,
          error: "Failed to queue expense for offline sync.",
        };
      }
    }

    try {
      if (editingExpense) {
        await dispatch(
          updateExpense({
            id: editingExpense.id,
            data: {
              name: name.trim(),
              amount: amountNum,
              description: description.trim() || undefined,
              expenseDate,
              category: category || undefined,
              fundingSource,
            },
          }),
        ).unwrap();
      } else {
        await dispatch(
          createExpense({
            companyId,
            name: name.trim(),
            amount: amountNum,
            description: description.trim() || undefined,
            expenseDate,
            category: category || undefined,
            fundingSource,
          }),
        ).unwrap();
      }

      closeModal();
      await refreshExpenses(true);
      dispatch(fetchDashboard({ forceRefresh: true }));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as string };
    }
  }, [
    amount,
    category,
    closeModal,
    companyId,
    description,
    dispatch,
    editingExpense,
    expenseDate,
    fundingSource,
    isConnected,
    name,
    refreshExpenses,
    validateForm,
  ]);

  const handleDelete = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      try {
        await dispatch(deleteExpense(id)).unwrap();
        setDeleteConfirmId(null);
        await refreshExpenses(true);
        dispatch(fetchDashboard({ forceRefresh: true }));
        return { success: true };
      } catch (error) {
        const errorMessage =
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "Failed to delete expense";
        return { success: false, error: errorMessage };
      }
    },
    [dispatch, refreshExpenses],
  );

  const handleClear = useCallback(
    async (
      id: number,
      clearedNotes?: string,
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        await dispatch(clearExpense({ id, data: { clearedNotes } })).unwrap();
        setClearConfirmId(null);
        await refreshExpenses(true);
        dispatch(fetchDashboard({ forceRefresh: true }));
        return { success: true };
      } catch (error) {
        const errorMessage =
          typeof error === "string"
            ? error
            : error instanceof Error
              ? error.message
              : "Failed to clear expense";
        return { success: false, error: errorMessage };
      }
    },
    [dispatch, refreshExpenses],
  );

  const addCategory = useCallback(
    async (name: string): Promise<{ success: boolean; error?: string }> => {
      if (!companyId) return { success: false, error: "Company not found" };
      try {
        await dispatch(
          createExpenseCategory({ companyId, name: name.trim() }),
        ).unwrap();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to add category",
        };
      }
    },
    [companyId, dispatch],
  );

  const removeCategory = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      if (!companyId) return { success: false, error: "Company not found" };
      try {
        await dispatch(deleteExpenseCategory({ id, companyId })).unwrap();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete category",
        };
      }
    },
    [companyId, dispatch],
  );

  const filteredExpenses = expenses
    .filter((expense) =>
      filterCategory === "ALL" ? true : expense.category === filterCategory,
    )
    .filter((expense) =>
      filterStatus === "ALL" ? true : expense.status === filterStatus,
    )
    .filter((expense) =>
      filterSource === "ALL" ? true : expense.fundingSource === filterSource,
    );

  const totalAmount = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const pendingTotal = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "PENDING")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const clearedTotal = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "CLEARED")
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const topExpense = useMemo(() => {
    if (expenses.length === 0) {
      return null;
    }
    return expenses.reduce((maxExpense, expense) =>
      expense.amount > maxExpense.amount ? expense : maxExpense,
    );
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      const categoryName = expense.category || "Other";
      totals.set(
        categoryName,
        (totals.get(categoryName) ?? 0) + expense.amount,
      );
    }
    return Array.from(totals.entries())
      .map(([categoryName, total]) => ({ category: categoryName, total }))
      .sort((left, right) => right.total - left.total)
      .slice(0, 4);
  }, [expenses]);

  const capitalTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.fundingSource === "CAPITAL")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const capitalPendingTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.fundingSource === "CAPITAL" && e.status === "PENDING")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const commissionsTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.fundingSource === "COMMISSIONS")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const externalIncomeTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.fundingSource === "EXTERNAL_INCOME")
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const recurringTotal = useMemo(
    () =>
      expenses
        .filter((e) => e.recurringExpenseId !== null)
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses],
  );

  const totalCount = expenses.length;

  return {
    isLoading,
    refreshing,
    isModalOpen,
    editingExpense,
    deleteConfirmId,
    clearConfirmId,

    name,
    amount,
    description,
    expenseDate,
    category,
    fundingSource,

    selectedMonth,
    setSelectedMonth,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,

    expenses: filteredExpenses,
    totalAmount,
    totalCount,
    pendingTotal,
    clearedTotal,
    topExpense,
    categoryTotals,
    capitalTotal,
    capitalPendingTotal,
    commissionsTotal,
    externalIncomeTotal,
    recurringTotal,
    filterSource,
    setFilterSource,
    categories,
    categoriesLoading,
    fundingSources: EXPENSE_FUNDING_SOURCES,

    setName,
    setAmount,
    setDescription,
    setExpenseDate,
    setCategory,
    setFundingSource,
    setDeleteConfirmId,
    setClearConfirmId,

    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleClear,
    addCategory,
    removeCategory,

    formatCurrency,
  };
}
