import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { fetchExpectedCommissions } from "../../store/slices/expectedCommissionsSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDateTime } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum } from "../../types";

export function useCommissionsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const { items: expectedCommissions, isLoading } = useSelector(
    (state: RootState) => state.expectedCommissions,
  );
  const { items: accounts } = useSelector(
    (state: RootState) => state.accounts,
  );
  const companyId = useSelector(
    (state: RootState) =>
      state.auth.viewingAgencyId || state.auth.user?.companyId,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [filterShift, setFilterShift] = useState<ShiftEnum | "ALL">("ALL");
  const [filterAccountId, setFilterAccountId] = useState<number | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [filterDateTo, setFilterDateTo] = useState<string>(
    new Date().toISOString().split("T")[0],
  );

  const lastFetchedCompanyId = useRef<number | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    if (!companyId) return;
    if (lastFetchedCompanyId.current === companyId) return;
    lastFetchedCompanyId.current = companyId;
    dispatch(fetchAccounts({ companyId, isActive: true }));
  }, [dispatch, companyId]);

  // Fetch expected commissions when filters change
  useEffect(() => {
    if (!companyId) return;
    dispatch(
      fetchExpectedCommissions({
        companyId,
        startDate: filterDateFrom,
        endDate: filterDateTo,
        accountId: filterAccountId ?? undefined,
        forceRefresh: true,
      }),
    );
  }, [dispatch, companyId, filterDateFrom, filterDateTo, filterAccountId]);

  const onRefresh = useCallback(async () => {
    if (!companyId) return;
    setRefreshing(true);
    await dispatch(
      fetchExpectedCommissions({
        companyId,
        startDate: filterDateFrom,
        endDate: filterDateTo,
        accountId: filterAccountId ?? undefined,
        forceRefresh: true,
      }),
    );
    setRefreshing(false);
  }, [dispatch, companyId, filterDateFrom, filterDateTo, filterAccountId]);

  // Apply shift filter locally
  const filteredCommissions = useMemo(() => {
    let items = [...expectedCommissions];
    if (filterShift !== "ALL") {
      items = items.filter((c) => c.shift === filterShift);
    }
    return items.sort((a, b) => {
      const timeA = a.transactionTime
        ? new Date(a.transactionTime).getTime()
        : new Date(a.date).getTime();
      const timeB = b.transactionTime
        ? new Date(b.transactionTime).getTime()
        : new Date(b.date).getTime();
      return timeB - timeA;
    });
  }, [expectedCommissions, filterShift]);

  // Metrics
  const metrics = useMemo(() => {
    let totalCommission = 0;
    let totalVolume = 0;
    let depositCommission = 0;
    let withdrawCommission = 0;

    filteredCommissions.forEach((c) => {
      totalCommission += c.commissionAmount;
      totalVolume += c.transactionAmount;
      if (c.transactionType === "DEPOSIT") {
        depositCommission += c.commissionAmount;
      } else {
        withdrawCommission += c.commissionAmount;
      }
    });

    return {
      totalCommission,
      totalVolume,
      depositCommission,
      withdrawCommission,
      recordCount: filteredCommissions.length,
    };
  }, [filteredCommissions]);

  const activeAccounts = useMemo(() => {
    return accounts.filter((a) => a.isActive);
  }, [accounts]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleResetFilters = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setFilterShift("ALL");
    setFilterAccountId(null);
    setFilterDateFrom(today);
    setFilterDateTo(today);
  }, []);

  return {
    // State
    isLoading,
    refreshing,
    filterShift,
    setFilterShift,
    filterAccountId,
    setFilterAccountId,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,

    // Data
    filteredCommissions,
    accounts: activeAccounts,
    metrics,

    // Actions
    onRefresh,
    handleBack,
    handleResetFilters,

    // Utils
    formatCurrency,
    formatDateTime,
  };
}
