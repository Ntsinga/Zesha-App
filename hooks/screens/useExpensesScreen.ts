import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../../store/slices/expensesSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { selectCompanyId } from "../../store/slices/authSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { Expense } from "../../types";

// Common expense categories
export const EXPENSE_CATEGORIES = [
  "Utilities",
  "Rent",
  "Salaries",
  "Transport",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Other",
  "Shortage",
];

/**
 * Shared hook for Expenses screen
 * Contains all business logic used by both web and native versions
 */
export function useExpensesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const companyId = useSelector(selectCompanyId);

  const {
    items: expenses,
    isLoading,
    totalAmount,
  } = useSelector((state: RootState) => state.expenses);

  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [category, setCategory] = useState("");

  // Filter state
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  // Load expenses on mount
  useEffect(() => {
    dispatch(fetchExpenses({}));
  }, [dispatch]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchExpenses({}));
    setRefreshing(false);
  }, [dispatch]);

  // Reset form
  const resetForm = useCallback(() => {
    setName("");
    setAmount("");
    setDescription("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setCategory("");
    setEditingExpense(null);
  }, []);

  // Open add modal
  const openAddModal = useCallback(() => {
    resetForm();
    setIsModalOpen(true);
  }, [resetForm]);

  // Open edit modal
  const openEditModal = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setName(expense.name);
    setAmount(expense.amount.toString());
    setDescription(expense.description || "");
    setExpenseDate(expense.expense_date);
    setCategory(expense.category || "");
    setIsModalOpen(true);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    resetForm();
  }, [resetForm]);

  // Validate form
  const validateForm = useCallback((): string | null => {
    if (!name.trim()) {
      return "Expense name is required.";
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return "Please enter a valid amount.";
    }
    return null;
  }, [name, amount]);

  // Submit form
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

    try {
      if (editingExpense) {
        await dispatch(
          updateExpense({
            id: editingExpense.id,
            data: {
              name: name.trim(),
              amount: amountNum,
              description: description.trim() || undefined,
              expense_date: expenseDate,
              category: category || undefined,
            },
          }),
        ).unwrap();
      } else {
        await dispatch(
          createExpense({
            company_id: companyId,
            name: name.trim(),
            amount: amountNum,
            description: description.trim() || undefined,
            expense_date: expenseDate,
            category: category || undefined,
          }),
        ).unwrap();
      }

      closeModal();
      dispatch(fetchExpenses({}));
      dispatch(fetchDashboard({}));
      return { success: true };
    } catch (error) {
      return { success: false, error: error as string };
    }
  }, [
    name,
    amount,
    description,
    expenseDate,
    category,
    companyId,
    editingExpense,
    dispatch,
    closeModal,
    validateForm,
  ]);

  // Delete expense
  const handleDelete = useCallback(
    async (id: number): Promise<{ success: boolean; error?: string }> => {
      try {
        await dispatch(deleteExpense(id)).unwrap();
        setDeleteConfirmId(null);
        dispatch(fetchExpenses({}));
        dispatch(fetchDashboard({}));
        return { success: true };
      } catch (error) {
        return { success: false, error: error as string };
      }
    },
    [dispatch],
  );

  // Filter expenses by category
  const filteredExpenses =
    filterCategory === "ALL"
      ? expenses
      : expenses.filter((e) => e.category === filterCategory);

  return {
    // State
    isLoading,
    refreshing,
    isModalOpen,
    editingExpense,
    deleteConfirmId,

    // Form state
    name,
    amount,
    description,
    expenseDate,
    category,

    // Filter
    filterCategory,
    setFilterCategory,

    // Data
    expenses: filteredExpenses,
    totalAmount,
    categories: EXPENSE_CATEGORIES,

    // Form setters
    setName,
    setAmount,
    setDescription,
    setExpenseDate,
    setCategory,
    setDeleteConfirmId,

    // Actions
    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,

    // Formatters
    formatCurrency,
  };
}
