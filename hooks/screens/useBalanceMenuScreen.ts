import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect, useRouter } from "expo-router";
import { fetchCashCounts } from "../../store/slices/cashCountSlice";
import { fetchBalances } from "../../store/slices/balancesSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { fetchCommissions } from "../../store/slices/commissionsSlice";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
import {
  calculateReconciliation,
  fetchShiftStatus,
} from "../../store/slices/reconciliationsSlice";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { ReconciliationSubtypeEnum, ShiftEnum } from "../../types";

export function useBalanceMenuScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const [selectedShift, setSelectedShift] = useState<ShiftEnum>("AM");

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Get cash counts, balances, commissions, and accounts from Redux
  const { items: cashCounts, isLoading: cashCountLoading } = useSelector(
    (state: RootState) => state.cashCount,
  );

  const { items: balances, isLoading: balancesLoading } = useSelector(
    (state: RootState) => state.balances,
  );

  const { items: commissions, isLoading: commissionsLoading } = useSelector(
    (state: RootState) => state.commissions,
  );

  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts,
  );

  const { items: transactions, isLoading: transactionsLoading } = useSelector(
    (state: RootState) => state.transactions,
  );

  const { isCalculating, shiftStatus, isLoadingShiftStatus } = useSelector(
    (state: RootState) => state.reconciliations,
  );

  const { user: backendUser } = useSelector((state: RootState) => state.auth);
  const effectiveCompanyId = useSelector(selectEffectiveCompanyId);

  const isLoading =
    cashCountLoading ||
    balancesLoading ||
    commissionsLoading ||
    accountsLoading ||
    transactionsLoading;

  const [shiftStatusCache, setShiftStatusCache] = useState<
    Partial<Record<ShiftEnum, NonNullable<RootState["reconciliations"]["shiftStatus"]>>>
  >({});

  // Track the last fetch scopes to prevent redundant refetches when auth state
  // rehydrates without the effective company/day/phase actually changing.
  const lastBaseFetchKey = useRef<string | null>(null);
  const lastSubtypeFetchKey = useRef<string | null>(null);

  // Fetch shift status whenever the selected shift or date changes
  useEffect(() => {
    if (!effectiveCompanyId) return;
    dispatch(fetchShiftStatus({ date: today, shift: selectedShift }));
  }, [dispatch, today, selectedShift, effectiveCompanyId]);

  // Re-fetch shift status on screen focus (e.g. returning from reconciliation
  // after finalize — ensures the phase advances from OPENING → CLOSING without
  // requiring a manual refresh).
  useFocusEffect(
    useCallback(() => {
      if (!effectiveCompanyId) return;
      dispatch(fetchShiftStatus({ date: today, shift: selectedShift }));
    }, [dispatch, today, selectedShift, effectiveCompanyId]),
  );

  useEffect(() => {
    if (!isLoadingShiftStatus && shiftStatus) {
      setShiftStatusCache((prev) => ({
        ...prev,
        [selectedShift]: shiftStatus,
      }));
    }
  }, [isLoadingShiftStatus, shiftStatus, selectedShift]);

  const resolvedShiftStatus = shiftStatusCache[selectedShift] ?? null;

  // Derive current shift phase.
  // AM tab:  OPENING → CLOSING (once AM OPENING finalized) → COMPLETE (once AM CLOSING finalized)
  // PM tab:  PM OPENING no longer exists — PM always starts at CLOSING.
  //          CLOSING → COMPLETE (once PM CLOSING finalized)
  //
  // Whether this is a solo-worker day (2 recons: AM OPENING + PM CLOSING) or a
  // two-worker day (3 recons: AM OPENING + AM CLOSING + PM CLOSING) is determined
  // automatically by the backend: PM CLOSING uses AM CLOSING as its base if it exists,
  // otherwise falls back to AM OPENING.
  const shiftPhase = useMemo((): "OPENING" | "CLOSING" | "COMPLETE" => {
    if (resolvedShiftStatus?.closingFinalized) return "COMPLETE";
    // PM shift never has an OPENING phase
    if (selectedShift === "PM") return "CLOSING";
    if (resolvedShiftStatus?.openingFinalized) return "CLOSING";
    return "OPENING";
  }, [resolvedShiftStatus, selectedShift]);

  const currentSubtype: ReconciliationSubtypeEnum = useMemo(() => {
    if (shiftPhase === "CLOSING" || shiftPhase === "COMPLETE") return "CLOSING";
    return "OPENING";
  }, [shiftPhase]);

  const isPhaseResolved = selectedShift === "PM" || resolvedShiftStatus !== null;

  // Fetch day-scoped data that doesn't vary by phase.
  useEffect(() => {
    if (!effectiveCompanyId) return;
    const fetchKey = `${effectiveCompanyId}:${today}`;
    if (lastBaseFetchKey.current === fetchKey) return;
    lastBaseFetchKey.current = fetchKey;

    dispatch(
      fetchCommissions({
        companyId: effectiveCompanyId,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchAccounts({ companyId: effectiveCompanyId, isActive: true }),
    );
    dispatch(
      fetchTransactions({
        companyId: effectiveCompanyId,
        startDate: today,
        endDate: today,
      }),
    );
  }, [dispatch, today, effectiveCompanyId]);

  // Fetch phase-scoped data only after the AM phase is known.
  useEffect(() => {
    if (!effectiveCompanyId || !isPhaseResolved) return;
    const fetchKey = `${effectiveCompanyId}:${today}:${selectedShift}:${currentSubtype}`;
    if (lastSubtypeFetchKey.current === fetchKey) return;
    lastSubtypeFetchKey.current = fetchKey;

    dispatch(
      fetchCashCounts({
        companyId: effectiveCompanyId,
        countDate: today,
        subtype: currentSubtype,
      }),
    );
    dispatch(
      fetchBalances({
        companyId: effectiveCompanyId,
        dateFrom: today,
        dateTo: today,
        subtype: currentSubtype,
      }),
    );
  }, [
    dispatch,
    today,
    effectiveCompanyId,
    isPhaseResolved,
    selectedShift,
    currentSubtype,
  ]);

  // "Start" during OPENING (handover snapshot or AM overnight verification)
  // "Submit" during CLOSING (full end-of-shift reconciliation)
  const buttonLabel =
    currentSubtype === "OPENING"
      ? `Start ${selectedShift} Shift`
      : `Submit ${selectedShift} Shift`;

  // Show commissions & transactions only during a CLOSING or COMPLETE phase.
  const showCommissionsAndTransactions =
    currentSubtype === "CLOSING" || shiftPhase === "COMPLETE";
  const cashCountStatus = useMemo(() => {
    const todayCounts = cashCounts.filter((cc) => cc.date === today);
    const amCounts = todayCounts.filter(
      (cc) => cc.shift === "AM" && cc.subtype === currentSubtype,
    );
    const pmCounts = todayCounts.filter(
      (cc) => cc.shift === "PM" && cc.subtype === currentSubtype,
    );

    const hasAM = amCounts.length > 0;
    const hasPM = pmCounts.length > 0;

    let latestShift: ShiftEnum | null = null;
    let total = 0;

    if (hasPM) {
      latestShift = "PM";
      total = pmCounts.reduce(
        (sum, cc) => sum + parseFloat(String(cc.amount)),
        0,
      );
    } else if (hasAM) {
      latestShift = "AM";
      total = amCounts.reduce(
        (sum, cc) => sum + parseFloat(String(cc.amount)),
        0,
      );
    }

    return {
      hasAMShift: hasAM,
      hasPMShift: hasPM,
      latestShift,
      latestShiftTotal: total,
      hasTodayCashCount: hasAM || hasPM,
    };
  }, [cashCounts, today, currentSubtype]);

  // Calculate balance completion status
  const balanceStatus = useMemo(() => {
    const activeAccounts = accounts.filter((acc) => acc.isActive);
    const todayBalances = balances.filter((bal) => bal.date.startsWith(today));

    const amBalances = todayBalances.filter(
      (bal) => bal.shift === "AM" && bal.subtype === currentSubtype,
    );
    const pmBalances = todayBalances.filter(
      (bal) => bal.shift === "PM" && bal.subtype === currentSubtype,
    );

    // Check if all active accounts have balances for each shift
    const hasAM =
      activeAccounts.length > 0 &&
      activeAccounts.every((acc) =>
        amBalances.some((bal) => bal.accountId === acc.id),
      );

    const hasPM =
      activeAccounts.length > 0 &&
      activeAccounts.every((acc) =>
        pmBalances.some((bal) => bal.accountId === acc.id),
      );

    let latestShift: ShiftEnum | null = null;
    let latestBalanceTotal = 0;

    if (hasPM) {
      latestShift = "PM";
      latestBalanceTotal = pmBalances.reduce(
        (sum, bal) => sum + parseFloat(String(bal.amount)),
        0,
      );
    } else if (hasAM) {
      latestShift = "AM";
      latestBalanceTotal = amBalances.reduce(
        (sum, bal) => sum + parseFloat(String(bal.amount)),
        0,
      );
    }

    return {
      hasAMBalances: hasAM,
      hasPMBalances: hasPM,
      latestBalanceShift: latestShift,
      latestBalanceTotal,
      hasTodayBalances: hasAM || hasPM,
    };
  }, [balances, accounts, today, currentSubtype]);

  // Calculate commission completion status
  const commissionStatus = useMemo(() => {
    const todayCommissions = commissions.filter((com) =>
      com.date.startsWith(today),
    );

    const amCommissions = todayCommissions.filter((com) => com.shift === "AM");
    const pmCommissions = todayCommissions.filter((com) => com.shift === "PM");

    const hasAM = amCommissions.length > 0;
    const hasPM = pmCommissions.length > 0;

    let latestShift: ShiftEnum | null = null;
    let latestCommissionTotal = 0;

    if (hasPM) {
      latestShift = "PM";
      latestCommissionTotal = pmCommissions.reduce(
        (sum, com) => sum + parseFloat(String(com.amount)),
        0,
      );
    } else if (hasAM) {
      latestShift = "AM";
      latestCommissionTotal = amCommissions.reduce(
        (sum, com) => sum + parseFloat(String(com.amount)),
        0,
      );
    }

    return {
      hasAMCommissions: hasAM,
      hasPMCommissions: hasPM,
      latestCommissionShift: latestShift,
      latestCommissionTotal,
      hasTodayCommissions: hasAM || hasPM,
    };
  }, [commissions, today]);

  // Calculate transaction status for today
  const transactionStatus = useMemo(() => {
    const todayTransactions = transactions.filter((txn) =>
      txn.transactionTime?.startsWith(today),
    );

    const amTransactions = todayTransactions.filter(
      (txn) => txn.shift === "AM",
    );
    const pmTransactions = todayTransactions.filter(
      (txn) => txn.shift === "PM",
    );

    const hasAM = amTransactions.length > 0;
    const hasPM = pmTransactions.length > 0;

    const amCount = amTransactions.length;
    const pmCount = pmTransactions.length;

    const amTotal = amTransactions.reduce(
      (sum, txn) => sum + parseFloat(String(txn.amount || 0)),
      0,
    );
    const pmTotal = pmTransactions.reduce(
      (sum, txn) => sum + parseFloat(String(txn.amount || 0)),
      0,
    );

    return {
      hasAMTransactions: hasAM,
      hasPMTransactions: hasPM,
      hasTodayTransactions: hasAM || hasPM,
      amTransactionCount: amCount,
      pmTransactionCount: pmCount,
      amTransactionTotal: amTotal,
      pmTransactionTotal: pmTotal,
    };
  }, [transactions, today]);

  // Auto-select the shift that has data (only on initial load)
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    // Only auto-select once on initial load
    if (hasAutoSelected) return;

    // Determine which shift has data
    // Priority: If both have data, prefer AM. If only one has data, select that one.
    const hasPMData =
      commissionStatus.hasPMCommissions ||
      balanceStatus.hasPMBalances ||
      cashCountStatus.hasPMShift ||
      transactionStatus.hasPMTransactions;
    const hasAMData =
      commissionStatus.hasAMCommissions ||
      balanceStatus.hasAMBalances ||
      cashCountStatus.hasAMShift ||
      transactionStatus.hasAMTransactions;

    // If both have data or only AM has data, select AM
    // If only PM has data, select PM
    if (hasAMData) {
      setSelectedShift("AM");
      setHasAutoSelected(true);
    } else if (hasPMData) {
      setSelectedShift("PM");
      setHasAutoSelected(true);
    } else if (!hasAMData && !hasPMData) {
      // No data yet, don't mark as auto-selected so we can try again
      setHasAutoSelected(false);
    }
  }, [
    commissionStatus.hasPMCommissions,
    commissionStatus.hasAMCommissions,
    balanceStatus.hasPMBalances,
    balanceStatus.hasAMBalances,
    cashCountStatus.hasPMShift,
    cashCountStatus.hasAMShift,
    transactionStatus.hasPMTransactions,
    transactionStatus.hasAMTransactions,
    hasAutoSelected,
  ]);

  const handleNavigateCashCount = () => {
    router.push(
      `/add-cash-count?shift=${selectedShift}&subtype=${currentSubtype}` as any,
    );
  };

  const handleNavigateAddBalance = () => {
    router.push(
      `/add-balance?shift=${selectedShift}&subtype=${currentSubtype}` as any,
    );
  };

  const handleNavigateCommissions = () => {
    router.push(`/add-commission?shift=${selectedShift}&subtype=${currentSubtype}` as any);
  };

  const handleNavigateTransactions = () => {
    router.push(`/transactions?shift=${selectedShift}` as any);
  };

  const handleBack = () => {
    router.back();
  };

  const handleRefresh = () => {
    if (!effectiveCompanyId) return;

    dispatch(
      fetchCashCounts({
        companyId: effectiveCompanyId,
        countDate: today,
        subtype: currentSubtype,
      }),
    );
    dispatch(
      fetchBalances({
        companyId: effectiveCompanyId,
        dateFrom: today,
        dateTo: today,
        subtype: currentSubtype,
      }),
    );
    dispatch(
      fetchCommissions({
        companyId: effectiveCompanyId,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchAccounts({ companyId: effectiveCompanyId, isActive: true }),
    );
    dispatch(
      fetchTransactions({
        companyId: effectiveCompanyId,
        startDate: today,
        endDate: today,
      }),
    );
    // Also re-fetch shift status so phase updates if another device finalised
    dispatch(fetchShiftStatus({ date: today, shift: selectedShift }));
  };

  const handleCalculate = async () => {
    if (!backendUser?.id || !effectiveCompanyId) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    try {
      await dispatch(
        calculateReconciliation({
          companyId: effectiveCompanyId,
          date: today,
          shift: selectedShift,
          subtype: currentSubtype,
          userId: backendUser.id,
        }),
      ).unwrap();

      // Re-fetch shift status so the UI advances to CLOSING immediately
      dispatch(fetchShiftStatus({ date: today, shift: selectedShift }));
      // Re-fetch cash counts and balances so their reconciliation_id links (set by
      // the backend during calculation) are reflected in Redux.  Without this, the
      // opening records still show reconciliation_id=null in the store, causing the
      // closing cash-count / balance forms to display opening values on first render.
      dispatch(
        fetchCashCounts({
          companyId: effectiveCompanyId,
          countDate: today,
          subtype: currentSubtype,
        }),
      );
      dispatch(
        fetchBalances({
          companyId: effectiveCompanyId,
          dateFrom: today,
          dateTo: today,
          subtype: currentSubtype,
        }),
      );
      dispatch(
        fetchCommissions({
          companyId: effectiveCompanyId,
          dateFrom: today,
          dateTo: today,
        }),
      );
      return { success: true, subtype: currentSubtype };
    } catch (error: unknown) {
      const msg =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Failed to calculate reconciliation";
      return {
        success: false,
        error: msg,
      };
    }
  };

  // Compute status for the selected shift
  const selectedShiftStatus = useMemo(() => {
    const hasSelectedCashCount =
      selectedShift === "AM"
        ? cashCountStatus.hasAMShift
        : cashCountStatus.hasPMShift;

    const hasSelectedBalances =
      selectedShift === "AM"
        ? balanceStatus.hasAMBalances
        : balanceStatus.hasPMBalances;

    const hasSelectedCommissions =
      selectedShift === "AM"
        ? commissionStatus.hasAMCommissions
        : commissionStatus.hasPMCommissions;

    const hasSelectedTransactions =
      selectedShift === "AM"
        ? transactionStatus.hasAMTransactions
        : transactionStatus.hasPMTransactions;

    const selectedTransactionCount =
      selectedShift === "AM"
        ? transactionStatus.amTransactionCount
        : transactionStatus.pmTransactionCount;

    const selectedTransactionTotal =
      selectedShift === "AM"
        ? transactionStatus.amTransactionTotal
        : transactionStatus.pmTransactionTotal;

    // Calculate totals for selected shift.
    // Only exclude opening-linked records when in CLOSING/COMPLETE phase.
    const _openingReconId =
      shiftPhase === "CLOSING" || shiftPhase === "COMPLETE"
        ? (shiftStatus?.openingId ?? null)
        : null;
    const todayCounts = cashCounts.filter(
      (cc) =>
        cc.date === today &&
        cc.shift === selectedShift &&
        cc.subtype === currentSubtype &&
        (_openingReconId === null || cc.reconciliationId !== _openingReconId),
    );
    const selectedShiftTotal = todayCounts.reduce(
      (sum, cc) => sum + parseFloat(String(cc.amount)),
      0,
    );

    const todayBalances = balances.filter(
      (bal) =>
        bal.date.startsWith(today) &&
        bal.shift === selectedShift &&
        bal.subtype === currentSubtype &&
        (_openingReconId === null || bal.reconciliationId !== _openingReconId),
    );
    const selectedBalanceTotal = todayBalances.reduce(
      (sum, bal) => sum + parseFloat(String(bal.amount)),
      0,
    );

    const todayCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === selectedShift,
    );
    const selectedCommissionTotal = todayCommissions.reduce(
      (sum, com) => sum + parseFloat(String(com.amount)),
      0,
    );

    return {
      hasSelectedCashCount,
      hasSelectedBalances,
      hasSelectedCommissions,
      hasSelectedTransactions,
      selectedShiftTotal,
      selectedBalanceTotal,
      selectedCommissionTotal,
      selectedTransactionCount,
      selectedTransactionTotal,
    };
  }, [
    selectedShift,
    cashCountStatus.hasAMShift,
    cashCountStatus.hasPMShift,
    balanceStatus.hasAMBalances,
    balanceStatus.hasPMBalances,
    commissionStatus.hasAMCommissions,
    commissionStatus.hasPMCommissions,
    transactionStatus.hasAMTransactions,
    transactionStatus.hasPMTransactions,
    transactionStatus.amTransactionCount,
    transactionStatus.pmTransactionCount,
    transactionStatus.amTransactionTotal,
    transactionStatus.pmTransactionTotal,
    cashCounts,
    balances,
    commissions,
    today,
    currentSubtype,
    shiftStatus,
    shiftPhase,
  ]);

  const isResolvingPhase = selectedShift === "AM" && !isPhaseResolved;

  return {
    // State
    isLoading,
    isCalculating,
    isLoadingShiftStatus,
    today,
    formatCurrency,
    selectedShift,
    setSelectedShift,
    shiftStatus,
    shiftPhase,
    isResolvingPhase,
    currentSubtype,
    buttonLabel,
    showCommissionsAndTransactions,

    // Cash count status (all shifts)
    ...cashCountStatus,

    // Balance status (all shifts)
    ...balanceStatus,

    // Commission status (all shifts)
    ...commissionStatus,

    // Transaction status (all shifts)
    ...transactionStatus,

    // Selected shift status
    ...selectedShiftStatus,

    // Actions
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleNavigateTransactions,
    handleBack,
    handleRefresh,
    handleCalculate,
  };
}
