import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import Constants from "expo-constants";
import { fetchDashboard, setShift } from "../../store/slices/dashboardSlice";
import { useCurrencyFormatter } from "../useCurrency";
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

  // Debug API keys on mount
  useEffect(() => {
    const geminiKey = Constants.expoConfig?.extra?.geminiApiKey;
    const openaiKey = Constants.expoConfig?.extra?.openaiApiKey;

    console.log("[Dashboard] API Keys Check:");
    console.log(
      "  - Gemini:",
      geminiKey ? `${geminiKey.substring(0, 10)}...` : "NOT SET"
    );
    console.log(
      "  - OpenAI:",
      openaiKey ? `${openaiKey.substring(0, 10)}...` : "NOT SET"
    );
  }, []);

  // Fetch dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboard({}));
  }, [dispatch]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchDashboard({}));
    setRefreshing(false);
  }, [dispatch]);

  // Shift change handler
  const handleShiftChange = useCallback(
    (shift: ShiftEnum) => {
      dispatch(setShift(shift));
      dispatch(fetchDashboard({ shift }));
    },
    [dispatch]
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
