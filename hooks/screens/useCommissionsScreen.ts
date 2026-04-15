import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import {
  fetchExpectedCommissions,
  fetchCommissionTotals,
  fetchCommissionBreakdown,
} from "../../store/slices/expectedCommissionsSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDateTime } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum } from "../../types";

export function useCommissionsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const {
    items: expectedCommissions,
    totals,
    breakdown,
    isLoading,
    isTotalsLoading,
    isBreakdownLoading,
  } = useSelector((state: RootState) => state.expectedCommissions);
  const { items: accounts } = useSelector((state: RootState) => state.accounts);
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
        shift: filterShift !== "ALL" ? filterShift : undefined,
        forceRefresh: true,
      }),
    );
    dispatch(
      fetchCommissionTotals({
        startDate: filterDateFrom,
        endDate: filterDateTo,
        accountId: filterAccountId ?? undefined,
        shift: filterShift !== "ALL" ? filterShift : undefined,
      }),
    );
    dispatch(
      fetchCommissionBreakdown({
        startDate: filterDateFrom,
        endDate: filterDateTo,
        accountId: filterAccountId ?? undefined,
        shift: filterShift !== "ALL" ? filterShift : undefined,
      }),
    );
  }, [
    dispatch,
    companyId,
    filterDateFrom,
    filterDateTo,
    filterAccountId,
    filterShift,
  ]);

  const onRefresh = useCallback(async () => {
    if (!companyId) return;
    setRefreshing(true);
    await dispatch(
      fetchExpectedCommissions({
        companyId,
        startDate: filterDateFrom,
        endDate: filterDateTo,
        accountId: filterAccountId ?? undefined,
        shift: filterShift !== "ALL" ? filterShift : undefined,
        forceRefresh: true,
      }),
    );
    await dispatch(
      fetchCommissionTotals({
        startDate: filterDateFrom,
        endDate: filterDateTo,
        accountId: filterAccountId ?? undefined,
        shift: filterShift !== "ALL" ? filterShift : undefined,
      }),
    );
    await dispatch(
      fetchCommissionBreakdown({
        startDate: filterDateFrom,
        endDate: filterDateTo,
        accountId: filterAccountId ?? undefined,
        shift: filterShift !== "ALL" ? filterShift : undefined,
      }),
    );
    setRefreshing(false);
  }, [
    dispatch,
    companyId,
    filterDateFrom,
    filterDateTo,
    filterAccountId,
    filterShift,
  ]);

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
    return {
      totalCommission:
        totals?.totalExpectedCommission ??
        filteredCommissions.reduce(
          (sum, commission) => sum + commission.commissionAmount,
          0,
        ),
      totalVolume:
        totals?.totalVolume ??
        filteredCommissions.reduce(
          (sum, commission) => sum + commission.transactionAmount,
          0,
        ),
      depositCommission:
        totals?.depositCommission ??
        filteredCommissions
          .filter((commission) => commission.transactionType === "DEPOSIT")
          .reduce((sum, commission) => sum + commission.commissionAmount, 0),
      withdrawCommission:
        totals?.withdrawCommission ??
        filteredCommissions
          .filter((commission) => commission.transactionType === "WITHDRAW")
          .reduce((sum, commission) => sum + commission.commissionAmount, 0),
      recordCount: totals?.totalTransactions ?? filteredCommissions.length,
    };
  }, [filteredCommissions, totals]);

  const commissionByAccount = useMemo(() => {
    const totals = new Map<
      number,
      { accountName: string; commissionAmount: number; recordCount: number }
    >();

    if (breakdown.length > 0) {
      breakdown.forEach((item) => {
        totals.set(item.accountId, {
          accountName: item.accountName,
          commissionAmount: item.totalExpectedCommission,
          recordCount: item.totalTransactions,
        });
      });
      return totals;
    }

    filteredCommissions.forEach((commission) => {
      const existing = totals.get(commission.accountId);
      const accountName =
        commission.accountName || `Account #${commission.accountId}`;

      if (existing) {
        existing.commissionAmount += commission.commissionAmount;
        existing.recordCount += 1;
        return;
      }

      totals.set(commission.accountId, {
        accountName,
        commissionAmount: commission.commissionAmount,
        recordCount: 1,
      });
    });

    return totals;
  }, [breakdown, filteredCommissions]);

  const topCommissionAccount = useMemo<{
    accountId: number;
    accountName: string;
    commissionAmount: number;
    recordCount: number;
  } | null>(() => {
    let topEntry: {
      accountId: number;
      accountName: string;
      commissionAmount: number;
      recordCount: number;
    } | null = null;

    commissionByAccount.forEach((value, accountId) => {
      if (!topEntry || value.commissionAmount > topEntry.commissionAmount) {
        topEntry = {
          accountId,
          accountName: value.accountName,
          commissionAmount: value.commissionAmount,
          recordCount: value.recordCount,
        };
      }
    });

    return topEntry;
  }, [commissionByAccount]);

  const activeAccounts = useMemo(() => {
    return [...accounts]
      .filter((a) => a.isActive)
      .sort((left, right) => {
        const leftCommission =
          commissionByAccount.get(left.id)?.commissionAmount ?? 0;
        const rightCommission =
          commissionByAccount.get(right.id)?.commissionAmount ?? 0;

        if (rightCommission !== leftCommission) {
          return rightCommission - leftCommission;
        }

        return left.name.localeCompare(right.name);
      });
  }, [accounts, commissionByAccount]);

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
    isLoading: isLoading || isTotalsLoading || isBreakdownLoading,
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
    topCommissionAccount,

    // Actions
    onRefresh,
    handleBack,
    handleResetFilters,

    // Utils
    formatCurrency,
    formatDateTime,
  };
}
