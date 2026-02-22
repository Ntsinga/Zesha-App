import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import {
  fetchTransactions,
  createTransaction,
  createFloatPurchase,
  reverseTransaction,
  updateTransaction,
  clearError,
  setFilters,
  clearFilters,
} from "../../store/slices/transactionsSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum, TransactionTypeEnum } from "../../types";
import type {
  TransactionCreate,
  FloatPurchaseCreate,
  Transaction,
} from "../../types/transaction";

// ============= Form State Types =============

export interface TransactionFormState {
  accountId: number | null;
  transactionType: "DEPOSIT" | "WITHDRAW";
  amount: string;
  reference: string;
  notes: string;
  shift: ShiftEnum;
}

export interface FloatPurchaseFormState {
  sourceAccountId: number | null;
  destinationAccountId: number | null;
  amount: string;
  reference: string;
  notes: string;
  shift: ShiftEnum;
}

const initialTransactionForm: TransactionFormState = {
  accountId: null,
  transactionType: "DEPOSIT",
  amount: "",
  reference: "",
  notes: "",
  shift: "AM",
};

const initialFloatPurchaseForm: FloatPurchaseFormState = {
  sourceAccountId: null,
  destinationAccountId: null,
  amount: "",
  reference: "",
  notes: "",
  shift: "AM",
};

// ============= Hook =============

export function useTransactionsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  // ---- Filter state ----
  const [filterType, setFilterType] = useState<TransactionTypeEnum | "ALL">(
    "ALL",
  );
  const [filterShift, setFilterShift] = useState<ShiftEnum | "ALL">("ALL");
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [filterDateTo, setFilterDateTo] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // ---- Modal state ----
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showFloatPurchase, setShowFloatPurchase] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [transactionToReverse, setTransactionToReverse] =
    useState<Transaction | null>(null);

  // ---- Form state ----
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(
    initialTransactionForm,
  );
  const [floatPurchaseForm, setFloatPurchaseForm] =
    useState<FloatPurchaseFormState>(initialFloatPurchaseForm);

  // ---- Redux state ----
  const {
    items: transactions,
    isLoading,
    isCreating,
    error,
  } = useSelector((state: RootState) => state.transactions);
  const { items: accounts } = useSelector((state: RootState) => state.accounts);
  const { user: backendUser } = useSelector((state: RootState) => state.auth);
  const companyId = useSelector(
    (state: RootState) =>
      state.auth.viewingAgencyId || state.auth.user?.companyId,
  );

  const lastFetchedCompanyId = useRef<number | null>(null);

  // ---- Auto-detect shift ----
  useEffect(() => {
    const currentHour = new Date().getHours();
    const detectedShift: ShiftEnum = currentHour < 12 ? "AM" : "PM";
    setTransactionForm((prev) => ({ ...prev, shift: detectedShift }));
    setFloatPurchaseForm((prev) => ({ ...prev, shift: detectedShift }));
  }, []);

  // ---- Fetch data on mount ----
  useEffect(() => {
    if (!companyId) return;
    if (lastFetchedCompanyId.current === companyId) return;
    lastFetchedCompanyId.current = companyId;

    dispatch(fetchAccounts({ companyId, isActive: true }));
  }, [dispatch, companyId]);

  // ---- Fetch transactions when filters change ----
  useEffect(() => {
    if (!companyId) return;

    const filters: Record<string, unknown> = {
      companyId,
      startDate: filterDateFrom,
      endDate: filterDateTo,
    };

    if (filterType !== "ALL") {
      filters.transactionType = filterType;
    }
    if (filterShift !== "ALL") {
      filters.shift = filterShift;
    }
    if (filterAccountId) {
      filters.accountId = filterAccountId;
    }

    dispatch(fetchTransactions(filters as any));
  }, [
    dispatch,
    companyId,
    filterType,
    filterShift,
    filterAccountId,
    filterDateFrom,
    filterDateTo,
  ]);

  // ---- Filtered & sorted transactions ----
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) =>
        new Date(b.transactionTime).getTime() -
        new Date(a.transactionTime).getTime(),
    );
  }, [transactions]);

  // ---- Summary metrics ----
  const metrics = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let depositCount = 0;
    let withdrawCount = 0;
    let floatCount = 0;

    transactions.forEach((t) => {
      switch (t.transactionType) {
        case "DEPOSIT":
          totalDeposits += t.amount;
          depositCount++;
          break;
        case "WITHDRAW":
          totalWithdrawals += t.amount;
          withdrawCount++;
          break;
        case "FLOAT_PURCHASE":
          floatCount++;
          break;
      }
    });

    return {
      totalDeposits,
      totalWithdrawals,
      netMovement: totalDeposits - totalWithdrawals,
      transactionCount: transactions.length,
      depositCount,
      withdrawCount,
      floatCount,
    };
  }, [transactions]);

  // ---- Active accounts for selects ----
  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.isActive);
  }, [accounts]);

  // ---- Handlers ----

  const handleCreateTransaction = useCallback(async () => {
    if (!transactionForm.accountId || !transactionForm.amount || !companyId) {
      return;
    }

    const data: TransactionCreate = {
      companyId,
      accountId: transactionForm.accountId,
      transactionType: transactionForm.transactionType,
      amount: parseFloat(transactionForm.amount),
      transactionTime: new Date().toISOString(),
      shift: transactionForm.shift,
      reference: transactionForm.reference || undefined,
      notes: transactionForm.notes || undefined,
    };

    try {
      await dispatch(createTransaction(data)).unwrap();
      setShowAddTransaction(false);
      setTransactionForm(initialTransactionForm);
      // Re-fetch to get updated list
      dispatch(
        fetchTransactions({
          companyId,
          startDate: filterDateFrom,
          endDate: filterDateTo,
        }),
      );
    } catch {
      // Error handled by Redux state
    }
  }, [dispatch, companyId, transactionForm, filterDateFrom, filterDateTo]);

  const handleCreateFloatPurchase = useCallback(async () => {
    if (
      !floatPurchaseForm.sourceAccountId ||
      !floatPurchaseForm.destinationAccountId ||
      !floatPurchaseForm.amount ||
      !companyId
    ) {
      return;
    }

    const data: FloatPurchaseCreate = {
      companyId,
      sourceAccountId: floatPurchaseForm.sourceAccountId,
      destinationAccountId: floatPurchaseForm.destinationAccountId,
      amount: parseFloat(floatPurchaseForm.amount),
      transactionTime: new Date().toISOString(),
      shift: floatPurchaseForm.shift,
      reference: floatPurchaseForm.reference || undefined,
      notes: floatPurchaseForm.notes || undefined,
    };

    try {
      await dispatch(createFloatPurchase(data)).unwrap();
      setShowFloatPurchase(false);
      setFloatPurchaseForm(initialFloatPurchaseForm);
      dispatch(
        fetchTransactions({
          companyId,
          startDate: filterDateFrom,
          endDate: filterDateTo,
        }),
      );
    } catch {
      // Error handled by Redux state
    }
  }, [dispatch, companyId, floatPurchaseForm, filterDateFrom, filterDateTo]);

  const handleReverse = useCallback(async (transaction: Transaction) => {
    setTransactionToReverse(transaction);
    setShowReverseConfirm(true);
  }, []);

  const confirmReverse = useCallback(async () => {
    if (!transactionToReverse || !companyId) return;

    try {
      await dispatch(reverseTransaction(transactionToReverse.id)).unwrap();
      setShowReverseConfirm(false);
      setTransactionToReverse(null);
      dispatch(
        fetchTransactions({
          companyId,
          startDate: filterDateFrom,
          endDate: filterDateTo,
        }),
      );
    } catch {
      // Error handled by Redux state
    }
  }, [dispatch, companyId, transactionToReverse, filterDateFrom, filterDateTo]);

  const handleRefresh = useCallback(() => {
    if (!companyId) return;
    dispatch(
      fetchTransactions({
        companyId,
        startDate: filterDateFrom,
        endDate: filterDateTo,
      }),
    );
  }, [dispatch, companyId, filterDateFrom, filterDateTo]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleResetFilters = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setFilterType("ALL");
    setFilterShift("ALL");
    setFilterAccountId(null);
    setFilterDateFrom(today);
    setFilterDateTo(today);
    dispatch(clearFilters());
  }, [dispatch]);

  // ---- Formatting helpers ----
  const getTransactionTypeLabel = useCallback(
    (type: TransactionTypeEnum): string => {
      switch (type) {
        case "DEPOSIT":
          return "Deposit";
        case "WITHDRAW":
          return "Withdraw";
        case "FLOAT_PURCHASE":
          return "Float Purchase";
        default:
          return type;
      }
    },
    [],
  );

  const getTransactionTypeColor = useCallback(
    (type: TransactionTypeEnum): string => {
      switch (type) {
        case "DEPOSIT":
          return "green";
        case "WITHDRAW":
          return "red";
        case "FLOAT_PURCHASE":
          return "blue";
        default:
          return "gray";
      }
    },
    [],
  );

  const formatDateTime = useCallback((isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString("en-ZA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return {
    // Data
    transactions: sortedTransactions,
    accounts: activeAccounts,
    metrics,
    companyId,

    // Loading states
    isLoading,
    isCreating,
    error,

    // Filters
    filterType,
    setFilterType,
    filterShift,
    setFilterShift,
    filterAccountId,
    setFilterAccountId,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,

    // Modal state
    showAddTransaction,
    setShowAddTransaction,
    showFloatPurchase,
    setShowFloatPurchase,
    showReverseConfirm,
    setShowReverseConfirm,
    transactionToReverse,

    // Form state
    transactionForm,
    setTransactionForm,
    floatPurchaseForm,
    setFloatPurchaseForm,

    // Handlers
    handleCreateTransaction,
    handleCreateFloatPurchase,
    handleReverse,
    confirmReverse,
    handleRefresh,
    handleClearError,
    handleResetFilters,

    // Formatters
    formatCurrency,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    formatDateTime,
  };
}
