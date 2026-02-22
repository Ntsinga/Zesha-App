import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboard, setShift } from "../../store/slices/dashboardSlice";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
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
  const companyName = companyInfo?.name ?? "Company";
  const totalCommission = summary?.totalCommission ?? 0;
  const dailyCommission = summary?.dailyCommission ?? 0;

  // Today's transaction metrics
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.transactionTime?.startsWith(today));
  }, [transactions, today]);

  const transactionCount = todayTransactions.length;

  const recentTransactions = useMemo(() => {
    return [...todayTransactions]
      .sort(
        (a, b) =>
          new Date(b.transactionTime || "").getTime() -
          new Date(a.transactionTime || "").getTime(),
      )
      .slice(0, 5);
  }, [todayTransactions]);

  return {
    // State
    isLoading,
    error,
    refreshing,
    currentShift,
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
    totalCommission,
    dailyCommission,

    // Transaction data
    transactionCount,
    recentTransactions,

    // Formatters
    formatCurrency,
    formatCompactCurrency,

    // Actions
    onRefresh,
    handleShiftChange,
  };
}
