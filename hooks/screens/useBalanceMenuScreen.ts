import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { fetchCashCounts } from "../../store/slices/cashCountSlice";
import { fetchBalances } from "../../store/slices/balancesSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { fetchCommissions } from "../../store/slices/commissionsSlice";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
import {
  calculateReconciliation,
  fetchShiftStatus,
} from "../../store/slices/reconciliationsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { ReconciliationSubtypeEnum, ShiftEnum } from "../../types";

// Module-level cache: PM handover decision survives navigate-and-back
// (React component unmounts when navigating to add-balance, add-commission, etc.).
// Resets automatically when a new date begins.
const _handoverCache: { date: string; pm: boolean | null } = {
  date: "",
  pm: null,
};

export function useBalanceMenuScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const [selectedShift, setSelectedShift] = useState<ShiftEnum>("AM");

  // Get today's date (computed early so the cache check below can use it)
  const today = new Date().toISOString().split("T")[0];

  // Reset cache when the date rolls over to a new day
  if (_handoverCache.date !== today) {
    _handoverCache.date = today;
    _handoverCache.pm = null;
  }

  // null = not yet answered, true = yes (taking over from AM), false = no (solo/full day)
  // State is seeded from the module-level cache so decisions survive navigate-and-back.
  const [handoverDecision, _setHandoverDecision] = useState<boolean | null>(
    () => _handoverCache.pm,
  );

  // Write-through setter: updates both the cache and the React state.
  // This means switching AM→PM→AM→PM will not re-show the modal.
  const setHandoverDecision = useCallback((decision: boolean | null) => {
    _handoverCache.pm = decision;
    _setHandoverDecision(decision);
  }, []);

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

  const isLoading =
    cashCountLoading ||
    balancesLoading ||
    commissionsLoading ||
    accountsLoading ||
    transactionsLoading;

  // Track the last companyId we fetched for, to prevent re-fetching when
  // the backendUser object reference changes but companyId stays the same
  // (e.g. after Clerk sync completes and updates the Redux auth state).
  const lastFetchedCompanyId = useRef<number | null>(null);

  // Fetch shift status whenever the selected shift or date changes
  useEffect(() => {
    if (!backendUser?.companyId) return;
    dispatch(fetchShiftStatus({ date: today, shift: selectedShift }));
  }, [dispatch, today, selectedShift, backendUser?.companyId]);

  // Fetch data on mount
  useEffect(() => {
    // Don't fetch until we have a real companyId
    if (!backendUser?.companyId) return;
    // Skip if we already fetched for this companyId (prevents the
    // isLoading flicker when auth sync re-triggers this effect)
    if (lastFetchedCompanyId.current === backendUser.companyId) return;
    lastFetchedCompanyId.current = backendUser.companyId;

    dispatch(
      fetchCashCounts({
        companyId: backendUser.companyId,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchBalances({
        companyId: backendUser.companyId,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchCommissions({
        companyId: backendUser.companyId,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchAccounts({ companyId: backendUser.companyId, isActive: true }),
    );
    dispatch(
      fetchTransactions({
        companyId: backendUser.companyId,
        startDate: today,
        endDate: today,
      }),
    );
  }, [dispatch, today, backendUser?.companyId]);

  // Derive current shift phase:
  // OPENING — no opening reconciliation exists yet, or it exists but isn't finalized
  // CLOSING  — opening record exists AND is finalized (baseline locked)
  // COMPLETE — closing is finalized
  //
  // OPENING must be finalized before advancing to CLOSING.  Finalization sets
  // reconciled_at as a hard timestamp boundary, preventing re-calculation from
  // shifting the baseline while the boundary stays the same (which would cause
  // double-counting of pre-opening transactions in the live snapshot).
  const shiftPhase = useMemo((): "OPENING" | "CLOSING" | "COMPLETE" => {
    if (!shiftStatus) return "OPENING";
    if (shiftStatus.closingFinalized) return "COMPLETE";
    if (shiftStatus.openingFinalized) return "CLOSING";
    return "OPENING";
  }, [shiftStatus]);

  // Both AM and PM follow the shiftPhase state machine: OPENING → CLOSING → COMPLETE.
  //
  // AM OPENING: start-of-day check to verify overnight deposits/commission credits.
  // AM CLOSING: full end-of-morning reconciliation.
  // PM OPENING: handover snapshot when a second worker takes over from AM.
  // PM CLOSING: full end-of-day reconciliation.
  //
  // Exception: PM solo worker (handoverDecision=false) skips OPENING entirely.
  const currentSubtype: ReconciliationSubtypeEnum = useMemo(() => {
    if (selectedShift === "PM" && handoverDecision === false) return "CLOSING";
    if (shiftPhase === "CLOSING" || shiftPhase === "COMPLETE") return "CLOSING";
    return "OPENING";
  }, [selectedShift, handoverDecision, shiftPhase]);

  // Show the handover modal only for a PM shift with zero records and
  // no decision made yet by the user.
  const showHandoverModal =
    selectedShift === "PM" &&
    !isLoadingShiftStatus &&
    handoverDecision === null &&
    shiftStatus !== null &&
    !shiftStatus.hasOpening &&
    !shiftStatus.hasClosing;

  // "Start" during OPENING (handover snapshot or AM overnight verification)
  // "Submit" during CLOSING (full end-of-shift reconciliation)
  const buttonLabel =
    currentSubtype === "OPENING"
      ? `Start ${selectedShift} Shift`
      : `Submit ${selectedShift} Shift`;

  // Show commissions & transactions only during a CLOSING or COMPLETE phase,
  // or when the PM worker chose to cover the full day (no handover).
  const showCommissionsAndTransactions =
    currentSubtype === "CLOSING" || shiftPhase === "COMPLETE";
  const cashCountStatus = useMemo(() => {
    const todayCounts = cashCounts.filter((cc) => cc.date === today);
    // Only exclude opening-linked records when actually in CLOSING/COMPLETE phase.
    // In OPENING phase (even after calculating), the records belong to this phase
    // and should still count toward the green indicator.
    const openingReconId =
      shiftPhase === "CLOSING" || shiftPhase === "COMPLETE"
        ? (shiftStatus?.openingId ?? null)
        : null;
    const amCounts = todayCounts.filter(
      (cc) =>
        cc.shift === "AM" &&
        (openingReconId === null || cc.reconciliationId !== openingReconId),
    );
    const pmCounts = todayCounts.filter(
      (cc) =>
        cc.shift === "PM" &&
        (openingReconId === null || cc.reconciliationId !== openingReconId),
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
  }, [cashCounts, today, shiftStatus, shiftPhase]);

  // Calculate balance completion status
  const balanceStatus = useMemo(() => {
    const activeAccounts = accounts.filter((acc) => acc.isActive);
    const todayBalances = balances.filter((bal) => bal.date.startsWith(today));

    // Only exclude opening-linked records when actually in CLOSING/COMPLETE phase.
    // In OPENING phase (even after calculating), the records belong to this phase
    // and should still count toward the green indicator.
    const openingReconId =
      shiftPhase === "CLOSING" || shiftPhase === "COMPLETE"
        ? (shiftStatus?.openingId ?? null)
        : null;
    const amBalances = todayBalances.filter(
      (bal) =>
        bal.shift === "AM" &&
        (openingReconId === null || bal.reconciliationId !== openingReconId),
    );
    const pmBalances = todayBalances.filter(
      (bal) =>
        bal.shift === "PM" &&
        (openingReconId === null || bal.reconciliationId !== openingReconId),
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
  }, [balances, accounts, today, shiftStatus, shiftPhase]);

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
    // Only exclude OPENING-linked records when we're in CLOSING phase.
    // In OPENING phase, passing openingId would filter out the very entries
    // the user just submitted, leaving the form blank on re-entry.
    const openingId = currentSubtype === "CLOSING" ? (shiftStatus?.openingId ?? "") : "";
    router.push(
      `/add-cash-count?shift=${selectedShift}&openingId=${openingId}` as any,
    );
  };

  const handleNavigateAddBalance = () => {
    // Only exclude OPENING-linked records when we're in CLOSING phase.
    // In OPENING phase, passing openingId would filter out the very entries
    // the user just submitted, leaving the form blank on re-entry.
    const openingId = currentSubtype === "CLOSING" ? (shiftStatus?.openingId ?? "") : "";
    router.push(
      `/add-balance?shift=${selectedShift}&openingId=${openingId}` as any,
    );
  };

  const handleNavigateCommissions = () => {
    router.push(`/add-commission?shift=${selectedShift}` as any);
  };

  const handleNavigateTransactions = () => {
    router.push(`/transactions?shift=${selectedShift}` as any);
  };

  const handleBack = () => {
    router.back();
  };

  const handleRefresh = () => {
    dispatch(
      fetchCashCounts({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchBalances({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchCommissions({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchAccounts({ companyId: backendUser?.companyId || 0, isActive: true }),
    );
    dispatch(
      fetchTransactions({
        companyId: backendUser?.companyId || 0,
        startDate: today,
        endDate: today,
      }),
    );
    // Also re-fetch shift status so phase updates if another device finalised
    dispatch(fetchShiftStatus({ date: today, shift: selectedShift }));
  };

  const handleCalculate = async () => {
    if (!backendUser?.id) {
      return {
        success: false,
        error: "User not authenticated",
      };
    }

    try {
      await dispatch(
        calculateReconciliation({
          companyId: backendUser.companyId || 0,
          date: today,
          shift: selectedShift,
          subtype: currentSubtype,
          userId: backendUser.id,
        }),
      ).unwrap();

      // Re-fetch shift status so the UI advances to CLOSING immediately
      dispatch(fetchShiftStatus({ date: today, shift: selectedShift }));
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
    shiftStatus,
    shiftPhase,
  ]);

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
    currentSubtype,
    handoverDecision,
    setHandoverDecision,
    showHandoverModal,
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
