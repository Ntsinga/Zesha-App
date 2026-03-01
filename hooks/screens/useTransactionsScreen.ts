import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchTransactions,
  createTransaction,
  createFloatPurchase,
  createCapitalInjection,
  confirmTransaction,
  reverseTransaction,
  updateTransaction,
  clearError,
  setFilters,
  clearFilters,
} from "../../store/slices/transactionsSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDateTime } from "../../utils/formatters";
import type { ShiftEnum, TransactionTypeEnum } from "../../types";
import type {
  TransactionCreate,
  FloatPurchaseCreate,
  CapitalInjectionCreate,
  Transaction,
} from "../../types/transaction";

// ============= Form State Types =============

export interface TransactionFormState {
  accountId: number | null;
  transactionType: "DEPOSIT" | "WITHDRAW";
  amount: string;
  reference: string;
  notes: string;
}

export interface FloatPurchaseFormState {
  sourceAccountId: number | null;
  destinationAccountId: number | null;
  amount: string;
  reference: string;
  notes: string;
  isConfirmed: boolean;
}

const initialTransactionForm: TransactionFormState = {
  accountId: null,
  transactionType: "DEPOSIT",
  amount: "",
  reference: "",
  notes: "",
};

const initialFloatPurchaseForm: FloatPurchaseFormState = {
  sourceAccountId: null,
  destinationAccountId: null,
  amount: "",
  reference: "",
  notes: "",
  isConfirmed: true,
};

export interface CapitalInjectionFormState {
  accountId: number | null;
  amount: string;
  reference: string;
  notes: string;
}

const initialCapitalInjectionForm: CapitalInjectionFormState = {
  accountId: null,
  amount: "",
  reference: "",
  notes: "",
};

// ============= Hook =============

export function useTransactionsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { formatCurrency } = useCurrencyFormatter();

  // ---- Filter state ----
  const [filterType, setFilterType] = useState<TransactionTypeEnum | "ALL">(
    "ALL",
  );
  const [filterShift, setFilterShift] = useState<ShiftEnum | "ALL">("ALL");
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [filterDateTo, setFilterDateTo] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  // ---- Submit error (shown inline inside modals) ----
  const [submitError, setSubmitError] = useState<string | null>(null);
  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  // ---- Modal state ----
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showFloatPurchase, setShowFloatPurchase] = useState(false);
  const [showCapitalInjection, setShowCapitalInjection] = useState(false);
  const [showReverseConfirm, setShowReverseConfirm] = useState(false);
  const [transactionToReverse, setTransactionToReverse] =
    useState<Transaction | null>(null);

  // ---- Form state ----
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(
    initialTransactionForm,
  );
  const [floatPurchaseForm, setFloatPurchaseForm] =
    useState<FloatPurchaseFormState>(initialFloatPurchaseForm);
  const [capitalInjectionForm, setCapitalInjectionForm] =
    useState<CapitalInjectionFormState>(initialCapitalInjectionForm);

  // ---- Redux state ----
  const {
    items: transactions,
    isLoading,
    isCreating,
    error,
  } = useAppSelector((state) => state.transactions);
  const { items: accounts } = useAppSelector((state) => state.accounts);
  const { user: backendUser } = useAppSelector((state) => state.auth);
  const companyId = useAppSelector(
    (state) => state.auth.viewingAgencyId || state.auth.user?.companyId,
  );

  const lastFetchedCompanyId = useRef<number | null>(null);

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
      endDate: filterDateTo + "T23:59:59",
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
    let totalExpectedCommission = 0;

    transactions.forEach((t) => {
      // Accumulate commission from loaded expected_commission
      if (t.expectedCommission) {
        totalExpectedCommission += t.expectedCommission.commissionAmount;
      }

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
      totalExpectedCommission,
    };
  }, [transactions]);

  // ---- Active accounts for selects ----
  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.isActive);
  }, [accounts]);

  // ---- Commission preview for transaction form ----
  const transactionCommissionPreview = useMemo(() => {
    if (!transactionForm.accountId || !transactionForm.amount) return null;
    const amt = parseFloat(transactionForm.amount);
    if (isNaN(amt) || amt <= 0) return null;

    const account = activeAccounts.find(
      (a) => a.id === transactionForm.accountId,
    );
    if (!account) return null;

    const rate =
      transactionForm.transactionType === "DEPOSIT"
        ? account.commissionDepositPercentage
        : account.commissionWithdrawPercentage;

    if (rate == null || rate === 0) return null;

    return {
      rate,
      amount: (amt * rate) / 100,
    };
  }, [
    transactionForm.accountId,
    transactionForm.amount,
    transactionForm.transactionType,
    activeAccounts,
  ]);

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
      reference: transactionForm.reference || undefined,
      notes: transactionForm.notes || undefined,
    };

    setSubmitError(null);
    try {
      await dispatch(createTransaction(data)).unwrap();
      setShowAddTransaction(false);
      setTransactionForm(initialTransactionForm);
      dispatch(
        fetchTransactions({
          companyId,
          startDate: filterDateFrom,
          endDate: filterDateTo + "T23:59:59",
        }),
      );
    } catch (err) {
      setSubmitError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to create transaction.",
      );
      dispatch(clearError());
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
      reference: floatPurchaseForm.reference || undefined,
      notes: floatPurchaseForm.notes || undefined,
      isConfirmed: floatPurchaseForm.isConfirmed,
    };

    setSubmitError(null);
    try {
      await dispatch(createFloatPurchase(data)).unwrap();
      setShowFloatPurchase(false);
      setFloatPurchaseForm(initialFloatPurchaseForm);
      dispatch(
        fetchTransactions({
          companyId,
          startDate: filterDateFrom,
          endDate: filterDateTo + "T23:59:59",
        }),
      );
    } catch (err) {
      setSubmitError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to create float purchase.",
      );
      dispatch(clearError());
    }
  }, [dispatch, companyId, floatPurchaseForm, filterDateFrom, filterDateTo]);

  const handleCreateCapitalInjection = useCallback(async () => {
    if (
      !capitalInjectionForm.accountId ||
      !capitalInjectionForm.amount ||
      !companyId
    ) {
      return;
    }

    const data: CapitalInjectionCreate = {
      companyId,
      accountId: capitalInjectionForm.accountId,
      amount: parseFloat(capitalInjectionForm.amount),
      transactionTime: new Date().toISOString(),
      reference: capitalInjectionForm.reference || undefined,
      notes: capitalInjectionForm.notes || undefined,
    };

    setSubmitError(null);
    try {
      await dispatch(createCapitalInjection(data)).unwrap();
      setShowCapitalInjection(false);
      setCapitalInjectionForm(initialCapitalInjectionForm);
      dispatch(
        fetchTransactions({
          companyId,
          startDate: filterDateFrom,
          endDate: filterDateTo + "T23:59:59",
        }),
      );
      dispatch(fetchDashboard({ forceRefresh: true }));
    } catch (err) {
      setSubmitError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to record capital injection.",
      );
      dispatch(clearError());
    }
  }, [dispatch, companyId, capitalInjectionForm, filterDateFrom, filterDateTo]);

  const handleReverse = useCallback(async (transaction: Transaction) => {
    setTransactionToReverse(transaction);
    setShowReverseConfirm(true);
  }, []);

  const handleConfirmTransaction = useCallback(
    async (transactionId: number) => {
      try {
        await dispatch(confirmTransaction(transactionId)).unwrap();
      } catch {
        // Error handled by Redux state
      }
    },
    [dispatch],
  );

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
          endDate: filterDateTo + "T23:59:59",
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
        endDate: filterDateTo + "T23:59:59",
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
        case "CAPITAL_INJECTION":
          return "Capital Injection";
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
        case "CAPITAL_INJECTION":
          return "teal";
        default:
          return "gray";
      }
    },
    [],
  );

  return {
    // Data
    transactions: sortedTransactions,
    accounts: activeAccounts,
    metrics,
    companyId,
    transactionCommissionPreview,

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
    showCapitalInjection,
    setShowCapitalInjection,
    showReverseConfirm,
    setShowReverseConfirm,
    transactionToReverse,

    // Form state
    transactionForm,
    setTransactionForm,
    floatPurchaseForm,
    setFloatPurchaseForm,
    capitalInjectionForm,
    setCapitalInjectionForm,

    // Submit error (inline modal feedback)
    submitError,
    clearSubmitError,

    // Handlers
    handleCreateTransaction,
    handleCreateFloatPurchase,
    handleCreateCapitalInjection,
    handleReverse,
    handleConfirmTransaction,
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
