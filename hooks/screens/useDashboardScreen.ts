import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboard, setShift } from "../../store/slices/dashboardSlice";
import { updateCompanyInfo } from "../../store/slices/companyInfoSlice";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
import { fetchCommissionVariance } from "../../store/slices/commissionsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { useAutoRefreshOnReconnect } from "../useAutoRefreshOnReconnect";
import type { ShiftEnum } from "../../types";
import type { AppDispatch, RootState } from "../../store";

/**
 * Shared Dashboard screen hook - contains all business logic
 * Used by both web and native Dashboard components
 */
export function useDashboardScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const [refreshing, setRefreshing] = useState(false);

  // Redux state
  const {
    companyInfo,
    summary,
    liveCapital,
    accounts,
    currentShift,
    snapshotDate,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.dashboard);

  const { items: transactions } = useSelector(
    (state: RootState) => state.transactions,
  );
  const { user: backendUser } = useSelector((state: RootState) => state.auth);
  const { commissionVariance = [] } = useSelector(
    (state: RootState) => state.commissions,
  );

  // Currency formatter
  const { formatCurrency, formatCompactCurrency } = useCurrencyFormatter();

  const today = new Date().toISOString().split("T")[0];

  // Fetch dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboard({}));
  }, [dispatch]);

  // Fetch today's transactions when user is available
  useEffect(() => {
    if (backendUser?.companyId) {
      dispatch(
        fetchTransactions({
          companyId: backendUser.companyId,
          startDate: today,
          endDate: today,
        }),
      );
    }
  }, [dispatch, backendUser?.companyId, today]);

  // Fetch commission variance (bank vs telecom reconciliation)
  useEffect(() => {
    if (backendUser?.companyId) {
      dispatch(fetchCommissionVariance({ companyId: backendUser.companyId }));
    }
  }, [dispatch, backendUser?.companyId, today]);

  // Auto-refresh after offline → online transition + sync complete
  useAutoRefreshOnReconnect(
    useCallback(() => fetchDashboard({ forceRefresh: true }), []),
  );

  // Refresh handler - forces cache bypass
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchDashboard({ forceRefresh: true }));
    if (backendUser?.companyId) {
      dispatch(
        fetchTransactions({
          companyId: backendUser.companyId,
          startDate: today,
          endDate: today,
        }),
      );
      dispatch(
        fetchCommissionVariance({
          companyId: backendUser.companyId,
          forceRefresh: true,
        }),
      );
    }
    setRefreshing(false);
  }, [dispatch, backendUser?.companyId, today]);

  // Shift change handler
  const handleShiftChange = useCallback(
    (shift: ShiftEnum) => {
      dispatch(setShift(shift));
      dispatch(fetchDashboard({ shift, forceRefresh: true }));
    },
    [dispatch],
  );

  // Computed values from summary
  const totalFloat = summary?.totalFloat ?? 0;
  const totalCash = summary?.totalCash ?? 0;
  const grandTotal = summary?.grandTotal ?? 0;
  const expectedGrandTotal = summary?.expectedGrandTotal ?? 0;
  const capitalVariance = summary?.capitalVariance ?? 0;
  const totalExpenses = summary?.totalExpenses ?? 0;
  const outstandingBalance = summary?.outstandingBalance ?? 0;
  const totalWorkingCapital = summary?.totalWorkingCapital ?? 0;
  const companyName = companyInfo?.name ?? "Company";
  const totalCommission = summary?.totalCommission ?? 0;
  const dailyCommission = summary?.dailyCommission ?? 0;

  // Role check — capital injection allowed for everyone except plain Agent
  const canInjectCapital =
    backendUser?.role === "Agent Supervisor" ||
    backendUser?.role === "Administrator" ||
    backendUser?.role === "Super Administrator";

  // Live operating capital (real-time intraday values)
  const liveFloat = liveCapital?.liveFloat ?? null;
  const liveCash = liveCapital?.liveCash ?? null;
  const liveGrandTotal = liveCapital?.liveGrandTotal ?? null;
  const lastReconDate = liveCapital?.lastReconciliationDate ?? null;
  const lastReconBoundary = liveCapital?.lastReconciliationBoundary ?? null;
  const transactionsSinceRecon = liveCapital?.transactionsSinceRecon ?? 0;

  // Merged display values — live takes priority over historical snapshot
  const displayCapital = liveGrandTotal ?? grandTotal;
  const displayFloat = liveFloat ?? totalFloat;
  const displayCash = liveCash ?? totalCash;
  // Live-first variance: displayCapital (live/reconciled) minus what the books expect
  const displayVariance = displayCapital - expectedGrandTotal;
  const capitalLabel: string = (() => {
    const sincePart =
      transactionsSinceRecon > 0
        ? ` · ${transactionsSinceRecon} txn${transactionsSinceRecon !== 1 ? "s" : ""}`
        : "";
    if (lastReconBoundary) {
      const t = new Date(lastReconBoundary).toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `Live since ${t}${sincePart}`;
    }
    if (lastReconDate) return `Based on recon ${lastReconDate}${sincePart}`;
    if (transactionsSinceRecon > 0)
      return `Based on ${transactionsSinceRecon} transaction${transactionsSinceRecon !== 1 ? "s" : ""}`;
    return "Live";
  })();

  // Capital injection — adds an amount to the current working capital
  const injectCapital = useCallback(
    async (
      injectionAmount: number,
    ): Promise<{ success: boolean; message: string }> => {
      if (!companyInfo?.id)
        return { success: false, message: "No company found" };
      try {
        await dispatch(
          updateCompanyInfo({
            id: companyInfo.id,
            data: {
              totalWorkingCapital: totalWorkingCapital + injectionAmount,
            },
          }),
        ).unwrap();
        await dispatch(fetchDashboard({ forceRefresh: true }));
        return { success: true, message: "Capital updated successfully" };
      } catch (err) {
        return {
          success: false,
          message:
            err instanceof Error ? err.message : "Failed to update capital",
        };
      }
    },
    [dispatch, companyInfo?.id, totalWorkingCapital],
  );

  // Today's transaction metrics
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.transactionTime?.startsWith(today));
  }, [transactions, today]);

  const transactionCount = todayTransactions.length;

  const dailyDeposits = useMemo(
    () =>
      todayTransactions
        .filter((t) => t.transactionType === "DEPOSIT")
        .reduce((s, t) => s + (t.amount || 0), 0),
    [todayTransactions],
  );

  const dailyWithdrawals = useMemo(
    () =>
      todayTransactions
        .filter((t) => t.transactionType === "WITHDRAW")
        .reduce((s, t) => s + (t.amount || 0), 0),
    [todayTransactions],
  );

  const recentTransactions = useMemo(() => {
    return [...todayTransactions]
      .sort(
        (a, b) =>
          new Date(b.transactionTime || "").getTime() -
          new Date(a.transactionTime || "").getTime(),
      )
      .slice(0, 5);
  }, [todayTransactions]);

  // Commission variance breakdown — bank vs telecom
  const bankVariance = useMemo(
    () => commissionVariance.filter((v) => v.accountType === "BANK"),
    [commissionVariance],
  );
  const telecomVariance = useMemo(
    () => commissionVariance.filter((v) => v.accountType === "TELECOM"),
    [commissionVariance],
  );
  const totalBankCommission = useMemo(
    () => bankVariance.reduce((sum, v) => sum + v.expected, 0),
    [bankVariance],
  );
  const totalTelecomCommission = useMemo(
    () =>
      telecomVariance.reduce(
        (sum, v) => sum + (v.actual > 0 ? v.actual : v.expected),
        0,
      ),
    [telecomVariance],
  );
  const telecomPendingCount = useMemo(
    () => telecomVariance.filter((v) => v.actual === 0).length,
    [telecomVariance],
  );
  const telecomVarianceCount = useMemo(
    () =>
      telecomVariance.filter((v) => v.status !== "MATCHED" && v.actual > 0)
        .length,
    [telecomVariance],
  );
  const telecomHasIssues = telecomPendingCount > 0 || telecomVarianceCount > 0;

  return {
    // State
    isLoading,
    error,
    refreshing,
    snapshotDate,
    accounts,

    // Computed values
    companyName,
    totalFloat,
    totalCash,
    grandTotal,
    expectedGrandTotal,
    capitalVariance,
    totalExpenses,
    outstandingBalance,
    totalWorkingCapital,
    totalCommission,
    dailyCommission,

    // Role
    canInjectCapital,

    // Merged live-first capital display
    displayCapital,
    displayFloat,
    displayCash,
    displayVariance,
    capitalLabel,
    liveFloat,
    liveCash,
    liveGrandTotal,
    lastReconDate,
    lastReconBoundary,
    transactionsSinceRecon,

    // Transaction data
    transactionCount,
    dailyDeposits,
    dailyWithdrawals,
    recentTransactions,

    // Commission variance breakdown
    commissionVariance,
    bankVariance,
    telecomVariance,
    totalBankCommission,
    totalTelecomCommission,
    telecomPendingCount,
    telecomVarianceCount,
    telecomHasIssues,

    // Formatters
    formatCurrency,
    formatCompactCurrency,

    // Actions
    onRefresh,
    injectCapital,
  };
}
