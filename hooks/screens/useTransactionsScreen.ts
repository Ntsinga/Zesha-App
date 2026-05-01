import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchTransactions,
  fetchTransactionAnalytics,
  createTransaction,
  createFloatPurchase,
  createCapitalInjection,
  createCashCapitalInjection,
  confirmTransaction,
  reverseTransaction,
  updateTransaction,
  previewStatementImport,
  importStatementTransactions,
  clearError,
  setFilters,
  clearFilters,
  clearStatementPreview,
  clearStatementImportResult,
} from "../../store/slices/transactionsSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { fetchCommissionTotals } from "../../store/slices/expectedCommissionsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDateTime } from "../../utils/formatters";
import { generateIdempotencyKey } from "../../utils/idempotency";
import type {
  ShiftEnum,
  TransactionTypeEnum,
  FloatSourceEnum,
  StatementProvider,
} from "../../types";
import type {
  TransactionCreate,
  FloatPurchaseCreate,
  CapitalInjectionCreate,
  CashCapitalInjectionCreate,
  Transaction,
  StatementPreviewResponse,
  StatementImportResponse,
  StatementParsedRow,
  StatementReviewDesignation,
  StatementReviewOverride,
  StatementOverlapStatus,
} from "../../types/transaction";

function getStatementRowKey(
  rowIndex: number,
  providerReference: string,
): string {
  return `${rowIndex}:${providerReference}`;
}

function isStatementRowOverlapBlocked(
  overlapStatus?: StatementOverlapStatus,
): boolean {
  return (
    overlapStatus === "EXACT_MATCH" ||
    overlapStatus === "POSSIBLE_MATCH" ||
    overlapStatus === "REFERENCE_CONFLICT" ||
    overlapStatus === "AMBIGUOUS_FLOAT_MATCH"
  );
}

function getLocalDateString(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  floatSource: FloatSourceEnum | null;
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
  floatSource: null,
  reference: "",
  notes: "",
  isConfirmed: true,
};

export interface CapitalInjectionFormState {
  injectionType: "FLOAT" | "CASH";
  accountId: number | null;
  amount: string;
  reference: string;
  notes: string;
}

const initialCapitalInjectionForm: CapitalInjectionFormState = {
  injectionType: "FLOAT",
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
  const [filterDateFrom, setFilterDateFrom] =
    useState<string>(getLocalDateString);
  const [filterDateTo, setFilterDateTo] = useState<string>(getLocalDateString);

  // ---- Submit error (shown inline inside modals) ----
  const [submitError, setSubmitError] = useState<string | null>(null);
  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  // ---- Modal state ----
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showFloatPurchase, setShowFloatPurchase] = useState(false);
  const [showCapitalInjection, setShowCapitalInjection] = useState(false);
  const [showStatementImport, setShowStatementImport] = useState(false);
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
  const [statementAccountId, setStatementAccountId] = useState<number | null>(
    null,
  );
  const [statementProvider, setStatementProvider] = useState<
    StatementProvider | "AUTO"
  >("AUTO");
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [statementReviewDesignations, setStatementReviewDesignations] =
    useState<Record<string, StatementReviewDesignation>>({});

  // ---- Redux state ----
  const {
    items: transactions,
    analytics,
    statementPreview,
    statementImportResult,
    isLoading,
    isCreating,
    isPreviewingStatement,
    isImportingStatement,
    error,
  } = useAppSelector((state) => state.transactions);
  const { totals: commissionTotals } = useAppSelector(
    (state) => state.expectedCommissions,
  );
  const { items: accounts } = useAppSelector((state) => state.accounts);
  const { user: backendUser } = useAppSelector((state) => state.auth);
  const companyId = useAppSelector(
    (state) => state.auth.viewingAgencyId || state.auth.user?.companyId,
  );

  const lastFetchedCompanyId = useRef<number | null>(null);
  const transactionRequestKeyRef = useRef<string | null>(null);
  const floatPurchaseRequestKeyRef = useRef<string | null>(null);
  const capitalInjectionRequestKeyRef = useRef<string | null>(null);

  // ---- Fetch data on mount ----
  useEffect(() => {
    if (!companyId) return;
    if (lastFetchedCompanyId.current === companyId) return;
    lastFetchedCompanyId.current = companyId;

    dispatch(fetchAccounts({ companyId, isActive: true }));
  }, [dispatch, companyId]);

  // ---- Filtered & sorted transactions ----
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort(
      (a, b) =>
        new Date(b.transactionTime).getTime() -
        new Date(a.transactionTime).getTime(),
    );
  }, [transactions]);

  const transactionCountsByAccount = useMemo(() => {
    const counts = new Map<number, number>();

    sortedTransactions.forEach((transaction) => {
      counts.set(
        transaction.accountId,
        (counts.get(transaction.accountId) ?? 0) + 1,
      );
    });

    return counts;
  }, [sortedTransactions]);

  const topTransactionAccount = useMemo<{
    accountId: number;
    accountName: string;
    transactionCount: number;
  } | null>(() => {
    if (analytics?.byAccount?.length) {
      const topAccount = [...analytics.byAccount].sort(
        (left, right) => right.transactionCount - left.transactionCount,
      )[0];

      return topAccount
        ? {
            accountId: topAccount.accountId,
            accountName: topAccount.accountName,
            transactionCount: topAccount.transactionCount,
          }
        : null;
    }

    let topAccountId: number | null = null;
    let topCount = 0;

    transactionCountsByAccount.forEach((count, accountId) => {
      if (count > topCount) {
        topAccountId = accountId;
        topCount = count;
      }
    });

    if (topAccountId === null) return null;

    const matchingAccount = accounts.find(
      (account) => account.id === topAccountId,
    );

    return {
      accountId: topAccountId,
      accountName: matchingAccount?.name ?? `Account ${topAccountId}`,
      transactionCount: topCount,
    };
  }, [accounts, analytics, transactionCountsByAccount]);

  // ---- Summary metrics ----
  const metrics = useMemo(() => {
    const fallbackCommissionTotals = transactions.reduce(
      (accumulator, transaction) => {
        const amount = transaction.expectedCommission?.commissionAmount ?? 0;

        if (transaction.transactionType === "DEPOSIT") {
          accumulator.deposit += amount;
        } else if (transaction.transactionType === "WITHDRAW") {
          accumulator.withdraw += amount;
        }

        accumulator.total += amount;
        return accumulator;
      },
      { total: 0, deposit: 0, withdraw: 0 },
    );

    const selectedExpectedCommissionTotal = (() => {
      if (filterType === "DEPOSIT") {
        return (
          commissionTotals?.depositCommission ??
          fallbackCommissionTotals.deposit
        );
      }
      if (filterType === "WITHDRAW") {
        return (
          commissionTotals?.withdrawCommission ??
          fallbackCommissionTotals.withdraw
        );
      }
      if (
        filterType === "FLOAT_PURCHASE" ||
        filterType === "CAPITAL_INJECTION"
      ) {
        return 0;
      }
      return (
        commissionTotals?.totalExpectedCommission ??
        fallbackCommissionTotals.total
      );
    })();

    if (analytics) {
      return {
        totalDeposits: analytics.totals.deposits,
        totalWithdrawals: analytics.totals.withdrawals,
        netMovement: analytics.totals.netFlow,
        transactionCount: analytics.counts.total,
        depositCount: analytics.counts.deposits,
        withdrawCount: analytics.counts.withdrawals,
        floatCount: analytics.counts.floatPurchases,
        totalExpectedCommission: selectedExpectedCommissionTotal,
      };
    }

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
      totalExpectedCommission: selectedExpectedCommissionTotal,
    };
  }, [analytics, commissionTotals, transactions, filterType]);

  // ---- Active accounts for selects ----
  const activeAccounts = useMemo(() => {
    return [...accounts]
      .filter((a) => a.isActive)
      .sort((left, right) => {
        const countDelta =
          (transactionCountsByAccount.get(right.id) ?? 0) -
          (transactionCountsByAccount.get(left.id) ?? 0);

        if (countDelta !== 0) return countDelta;
        return left.name.localeCompare(right.name);
      });
  }, [accounts, transactionCountsByAccount]);

  useEffect(() => {
    transactionRequestKeyRef.current = null;
  }, [
    transactionForm.accountId,
    transactionForm.transactionType,
    transactionForm.amount,
    transactionForm.reference,
    transactionForm.notes,
  ]);

  useEffect(() => {
    floatPurchaseRequestKeyRef.current = null;
  }, [
    floatPurchaseForm.sourceAccountId,
    floatPurchaseForm.destinationAccountId,
    floatPurchaseForm.amount,
    floatPurchaseForm.floatSource,
    floatPurchaseForm.reference,
    floatPurchaseForm.notes,
    floatPurchaseForm.isConfirmed,
  ]);

  useEffect(() => {
    capitalInjectionRequestKeyRef.current = null;
  }, [
    capitalInjectionForm.injectionType,
    capitalInjectionForm.accountId,
    capitalInjectionForm.amount,
    capitalInjectionForm.reference,
    capitalInjectionForm.notes,
  ]);

  useEffect(() => {
    if (!showAddTransaction) {
      transactionRequestKeyRef.current = null;
    }
  }, [showAddTransaction]);

  useEffect(() => {
    if (!showFloatPurchase) {
      floatPurchaseRequestKeyRef.current = null;
    }
  }, [showFloatPurchase]);

  useEffect(() => {
    if (!showCapitalInjection) {
      capitalInjectionRequestKeyRef.current = null;
    }
  }, [showCapitalInjection]);

  // ---- Commission preview for transaction form ----
  const transactionCommissionPreview = useMemo(() => {
    if (!transactionForm.accountId || !transactionForm.amount) return null;
    const amt = parseFloat(transactionForm.amount);
    if (isNaN(amt) || amt <= 0) return null;

    const account = activeAccounts.find(
      (a) => a.id === transactionForm.accountId,
    );
    if (!account) return null;

    const depositRate =
      "commissionDepositPercentage" in account &&
      typeof account.commissionDepositPercentage === "number"
        ? account.commissionDepositPercentage
        : null;
    const withdrawRate =
      "commissionWithdrawPercentage" in account &&
      typeof account.commissionWithdrawPercentage === "number"
        ? account.commissionWithdrawPercentage
        : null;
    const rate =
      transactionForm.transactionType === "DEPOSIT"
        ? depositRate
        : withdrawRate;

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

  const buildTransactionFilters = useCallback(() => {
    if (!companyId) return null;

    return {
      companyId,
      startDate: filterDateFrom,
      endDate: filterDateTo + "T23:59:59",
      limit: 500,
      ...(filterType !== "ALL" ? { transactionType: filterType } : {}),
      ...(filterShift !== "ALL" ? { shift: filterShift } : {}),
      ...(filterAccountId ? { accountId: filterAccountId } : {}),
    };
  }, [
    companyId,
    filterDateFrom,
    filterDateTo,
    filterType,
    filterShift,
    filterAccountId,
  ]);

  const buildAnalyticsFilters = useCallback(() => {
    if (!companyId) return null;

    return {
      companyId,
      startDate: filterDateFrom,
      endDate: `${filterDateTo}T23:59:59`,
      ...(filterShift !== "ALL" ? { shift: filterShift } : {}),
      ...(filterAccountId ? { accountId: filterAccountId } : {}),
      ...(filterType !== "ALL" ? { transactionType: filterType } : {}),
    };
  }, [
    companyId,
    filterDateFrom,
    filterDateTo,
    filterShift,
    filterAccountId,
    filterType,
  ]);

  const buildCommissionTotalsFilters = useCallback(() => {
    if (!companyId) return null;

    return {
      startDate: filterDateFrom,
      endDate: filterDateTo,
      ...(filterAccountId ? { accountId: filterAccountId } : {}),
      ...(filterShift !== "ALL" ? { shift: filterShift } : {}),
    };
  }, [companyId, filterDateFrom, filterDateTo, filterAccountId, filterShift]);

  const refreshCurrentRange = useCallback(() => {
    const transactionFilters = buildTransactionFilters();
    const analyticsFilters = buildAnalyticsFilters();
    const commissionFilters = buildCommissionTotalsFilters();

    if (!transactionFilters || !analyticsFilters || !commissionFilters) return;

    dispatch(fetchTransactions(transactionFilters));
    dispatch(fetchTransactionAnalytics(analyticsFilters));
    dispatch(fetchCommissionTotals(commissionFilters));
  }, [
    dispatch,
    buildTransactionFilters,
    buildAnalyticsFilters,
    buildCommissionTotalsFilters,
  ]);

  // ---- Fetch transactions when filters change ----
  useEffect(() => {
    const transactionFilters = buildTransactionFilters();
    const analyticsFilters = buildAnalyticsFilters();
    const commissionFilters = buildCommissionTotalsFilters();

    if (!transactionFilters || !analyticsFilters || !commissionFilters) return;

    dispatch(fetchTransactions(transactionFilters));
    dispatch(fetchTransactionAnalytics(analyticsFilters));
    dispatch(fetchCommissionTotals(commissionFilters));
  }, [
    dispatch,
    buildTransactionFilters,
    buildAnalyticsFilters,
    buildCommissionTotalsFilters,
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
      idempotencyKey:
        transactionRequestKeyRef.current ??
        generateIdempotencyKey("txn-screen"),
    };

    transactionRequestKeyRef.current = data.idempotencyKey ?? null;

    setSubmitError(null);
    try {
      await dispatch(createTransaction(data)).unwrap();
      transactionRequestKeyRef.current = null;
      setShowAddTransaction(false);
      setTransactionForm(initialTransactionForm);
      refreshCurrentRange();
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
  }, [dispatch, companyId, transactionForm, refreshCurrentRange]);

  const handleCreateFloatPurchase = useCallback(async () => {
    if (
      !floatPurchaseForm.destinationAccountId ||
      !floatPurchaseForm.amount ||
      !companyId
    ) {
      return;
    }
    // Internal transfer requires a source account
    if (!floatPurchaseForm.floatSource && !floatPurchaseForm.sourceAccountId) {
      return;
    }

    const data: FloatPurchaseCreate = {
      companyId,
      destinationAccountId: floatPurchaseForm.destinationAccountId,
      amount: parseFloat(floatPurchaseForm.amount),
      transactionTime: new Date().toISOString(),
      floatSource: floatPurchaseForm.floatSource ?? undefined,
      sourceAccountId: floatPurchaseForm.floatSource
        ? undefined
        : (floatPurchaseForm.sourceAccountId ?? undefined),
      reference: floatPurchaseForm.reference || undefined,
      notes: floatPurchaseForm.notes || undefined,
      isConfirmed: floatPurchaseForm.isConfirmed,
      idempotencyKey:
        floatPurchaseRequestKeyRef.current ??
        generateIdempotencyKey("float-screen"),
    };

    floatPurchaseRequestKeyRef.current = data.idempotencyKey ?? null;

    setSubmitError(null);
    try {
      await dispatch(createFloatPurchase(data)).unwrap();
      floatPurchaseRequestKeyRef.current = null;
      setShowFloatPurchase(false);
      setFloatPurchaseForm(initialFloatPurchaseForm);
      refreshCurrentRange();
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
  }, [dispatch, companyId, floatPurchaseForm, refreshCurrentRange]);

  const handleCreateCapitalInjection = useCallback(async () => {
    if (!capitalInjectionForm.amount || !companyId) return;
    if (
      capitalInjectionForm.injectionType === "FLOAT" &&
      !capitalInjectionForm.accountId
    ) {
      return;
    }

    setSubmitError(null);
    try {
      const requestKey =
        capitalInjectionRequestKeyRef.current ??
        generateIdempotencyKey("capital-screen");
      capitalInjectionRequestKeyRef.current = requestKey;

      if (capitalInjectionForm.injectionType === "FLOAT") {
        const data: CapitalInjectionCreate = {
          companyId,
          accountId: capitalInjectionForm.accountId!,
          amount: parseFloat(capitalInjectionForm.amount),
          transactionTime: new Date().toISOString(),
          reference: capitalInjectionForm.reference || undefined,
          notes: capitalInjectionForm.notes || undefined,
          idempotencyKey: requestKey,
        };
        await dispatch(createCapitalInjection(data)).unwrap();
      } else {
        const data: CashCapitalInjectionCreate = {
          companyId,
          amount: parseFloat(capitalInjectionForm.amount),
          transactionTime: new Date().toISOString(),
          reference: capitalInjectionForm.reference || undefined,
          notes: capitalInjectionForm.notes || undefined,
          idempotencyKey: requestKey,
        };
        await dispatch(createCashCapitalInjection(data)).unwrap();
      }

      capitalInjectionRequestKeyRef.current = null;
      setShowCapitalInjection(false);
      setCapitalInjectionForm(initialCapitalInjectionForm);
      refreshCurrentRange();
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
  }, [dispatch, companyId, capitalInjectionForm, refreshCurrentRange]);

  const handleReverse = useCallback(async (transaction: Transaction) => {
    setTransactionToReverse(transaction);
    setShowReverseConfirm(true);
  }, []);

  const handleConfirmTransaction = useCallback(
    async (transactionId: number) => {
      try {
        await dispatch(confirmTransaction(transactionId)).unwrap();
        refreshCurrentRange();
      } catch {
        // Error handled by Redux state
      }
    },
    [dispatch, refreshCurrentRange],
  );

  const confirmReverse = useCallback(async () => {
    if (!transactionToReverse || !companyId) return;

    try {
      await dispatch(
        reverseTransaction({ id: transactionToReverse.id, companyId }),
      ).unwrap();
      setShowReverseConfirm(false);
      setTransactionToReverse(null);
      refreshCurrentRange();
    } catch (err) {
      setSubmitError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to reverse transaction.",
      );
    }
  }, [dispatch, companyId, transactionToReverse, refreshCurrentRange]);

  const handleRefresh = useCallback(() => {
    refreshCurrentRange();
  }, [refreshCurrentRange]);

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleStatementFileChange = useCallback(
    (file: File | null) => {
      setStatementFile(file);
      setStatementReviewDesignations({});
      dispatch(clearStatementPreview());
      dispatch(clearStatementImportResult());
      clearSubmitError();
    },
    [dispatch, clearSubmitError],
  );

  const handleStatementAccountChange = useCallback(
    (accountId: number | null) => {
      setStatementAccountId(accountId);
      setStatementReviewDesignations({});
      dispatch(clearStatementPreview());
      dispatch(clearStatementImportResult());
      clearSubmitError();
    },
    [dispatch, clearSubmitError],
  );

  const handleStatementProviderChange = useCallback(
    (provider: StatementProvider | "AUTO") => {
      setStatementProvider(provider);
      setStatementReviewDesignations({});
      dispatch(clearStatementPreview());
      dispatch(clearStatementImportResult());
      clearSubmitError();
    },
    [dispatch, clearSubmitError],
  );

  const closeStatementImport = useCallback(() => {
    setShowStatementImport(false);
    setStatementAccountId(null);
    setStatementProvider("AUTO");
    setStatementFile(null);
    setStatementReviewDesignations({});
    dispatch(clearStatementPreview());
    dispatch(clearStatementImportResult());
    clearSubmitError();
  }, [dispatch, clearSubmitError]);

  useEffect(() => {
    setStatementReviewDesignations({});
  }, [statementPreview?.metadata.filename]);

  const statementReviewOverrides = useMemo<StatementReviewOverride[]>(() => {
    return (statementPreview?.rows ?? []).flatMap((row) => {
      if (row.decision !== "REVIEW") {
        return [];
      }

      const designation =
        statementReviewDesignations[
          getStatementRowKey(row.rowIndex, row.providerReference)
        ];
      if (!designation || designation === "KEEP_REVIEW") {
        return [];
      }

      return [
        {
          rowIndex: row.rowIndex,
          providerReference: row.providerReference,
          designation,
        },
      ];
    });
  }, [statementPreview, statementReviewDesignations]);

  const selectedReviewRowCount = statementReviewOverrides.length;
  const overlapBlockedStatementRowCount = useMemo(() => {
    return (statementPreview?.rows ?? []).filter((row) => {
      if (row.decision === "READY") {
        return isStatementRowOverlapBlocked(row.overlapStatus);
      }

      if (row.decision !== "REVIEW") {
        return false;
      }

      const designation =
        statementReviewDesignations[
          getStatementRowKey(row.rowIndex, row.providerReference)
        ];
      if (!designation || designation === "KEEP_REVIEW") {
        return false;
      }

      return isStatementRowOverlapBlocked(row.overlapStatus);
    }).length;
  }, [statementPreview, statementReviewDesignations]);

  const importableStatementRowCount = useMemo(() => {
    return (statementPreview?.rows ?? []).filter((row) => {
      if (isStatementRowOverlapBlocked(row.overlapStatus)) {
        return false;
      }

      if (row.decision === "READY") {
        return true;
      }

      if (row.decision !== "REVIEW") {
        return false;
      }

      const designation =
        statementReviewDesignations[
          getStatementRowKey(row.rowIndex, row.providerReference)
        ];
      return !!designation && designation !== "KEEP_REVIEW";
    }).length;
  }, [statementPreview, statementReviewDesignations]);

  const handleStatementReviewDesignationChange = useCallback(
    (row: StatementParsedRow, designation: StatementReviewDesignation) => {
      setStatementReviewDesignations((current) => ({
        ...current,
        [getStatementRowKey(row.rowIndex, row.providerReference)]: designation,
      }));
      dispatch(clearStatementImportResult());
      clearSubmitError();
    },
    [dispatch, clearSubmitError],
  );

  const handlePreviewStatement = useCallback(async () => {
    if (!statementFile || !statementAccountId) {
      setSubmitError("Select a telecom account and PDF statement first.");
      return;
    }

    setSubmitError(null);
    try {
      await dispatch(
        previewStatementImport({
          file: statementFile,
          accountId: statementAccountId,
          provider: statementProvider,
        }),
      ).unwrap();
    } catch (err) {
      setSubmitError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to preview statement.",
      );
      dispatch(clearError());
    }
  }, [
    dispatch,
    statementFile,
    statementAccountId,
    statementProvider,
    clearSubmitError,
  ]);

  const handleImportStatement = useCallback(async () => {
    if (!statementFile || !statementAccountId) {
      setSubmitError("Select a telecom account and PDF statement first.");
      return;
    }

    if (!importableStatementRowCount) {
      setSubmitError(
        "Preview the statement first and designate any REVIEW rows you want to import.",
      );
      return;
    }

    setSubmitError(null);
    try {
      await dispatch(
        importStatementTransactions({
          file: statementFile,
          accountId: statementAccountId,
          provider: statementProvider,
          reviewOverrides: statementReviewOverrides,
        }),
      ).unwrap();
      refreshCurrentRange();
      dispatch(fetchDashboard({ forceRefresh: true }));
    } catch (err) {
      setSubmitError(
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to import statement.",
      );
      dispatch(clearError());
    }
  }, [
    dispatch,
    statementFile,
    statementAccountId,
    statementProvider,
    importableStatementRowCount,
    statementReviewOverrides,
    refreshCurrentRange,
  ]);

  const handleResetFilters = useCallback(() => {
    const today = getLocalDateString();
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
    topTransactionAccount,
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
    showStatementImport,
    setShowStatementImport,
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
    statementAccountId,
    statementProvider,
    statementFile,
    statementPreview,
    statementImportResult,
    statementReviewDesignations,
    selectedReviewRowCount,
    overlapBlockedStatementRowCount,
    importableStatementRowCount,

    // Submit error (inline modal feedback)
    submitError,
    clearSubmitError,

    // Statement upload state
    isPreviewingStatement,
    isImportingStatement,

    // Handlers
    handleCreateTransaction,
    handleCreateFloatPurchase,
    handleCreateCapitalInjection,
    handleStatementAccountChange,
    handleStatementProviderChange,
    handleStatementFileChange,
    handleStatementReviewDesignationChange,
    handlePreviewStatement,
    handleImportStatement,
    closeStatementImport,
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
