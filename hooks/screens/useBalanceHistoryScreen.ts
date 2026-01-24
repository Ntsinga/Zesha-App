import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReconciliationHistory,
  selectBalanceHistory,
} from "../../store/slices/reconciliationsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDate } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";

/**
 * Shared hook for Balance History screen
 * Contains all business logic used by both web and native versions
 */
export function useBalanceHistoryScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const history = useSelector((state: RootState) =>
    selectBalanceHistory(state),
  );
  const { isLoading, error } = useSelector(
    (state: RootState) => state.reconciliations,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [filterShift, setFilterShift] = useState<"ALL" | "AM" | "PM">("ALL");
  const [searchDate, setSearchDate] = useState("");

  // Load history on mount
  useEffect(() => {
    dispatch(fetchReconciliationHistory({}));
  }, [dispatch]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchReconciliationHistory({}));
    setRefreshing(false);
  }, [dispatch]);

  // Filter history based on shift and date
  const filteredHistory = history.filter((record) => {
    const matchesShift = filterShift === "ALL" || record.shift === filterShift;
    const matchesDate = !searchDate || record.date.includes(searchDate);
    return matchesShift && matchesDate;
  });

  // Calculate summary stats
  const totalRecords = filteredHistory.length;
  const passedCount = filteredHistory.filter(
    (r) => r.status === "PASSED",
  ).length;
  const failedCount = filteredHistory.filter(
    (r) => r.status === "FAILED",
  ).length;
  const flaggedCount = filteredHistory.filter(
    (r) => r.status === "FLAGGED",
  ).length;

  return {
    // State
    isLoading,
    refreshing,
    error,
    filterShift,
    searchDate,

    // Data
    history: filteredHistory,
    totalRecords,
    passedCount,
    failedCount,
    flaggedCount,

    // Actions
    setFilterShift,
    setSearchDate,
    onRefresh,

    // Formatters
    formatCurrency,
    formatDate,
  };
}
