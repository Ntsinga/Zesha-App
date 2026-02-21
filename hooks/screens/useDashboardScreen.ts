import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboard, setShift } from "../../store/slices/dashboardSlice";
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

  // Currency formatter
  const { formatCurrency, formatCompactCurrency } = useCurrencyFormatter();

  // Fetch dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboard({}));
  }, [dispatch]);

  // Auto-refresh after offline → online transition + sync complete
  useAutoRefreshOnReconnect(
    useCallback(() => fetchDashboard({ forceRefresh: true }), []),
  );

  // Refresh handler - forces cache bypass
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchDashboard({ forceRefresh: true }));
    setRefreshing(false);
  }, [dispatch]);

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

    // Formatters
    formatCurrency,
    formatCompactCurrency,

    // Actions
    onRefresh,
    handleShiftChange,
  };
}
