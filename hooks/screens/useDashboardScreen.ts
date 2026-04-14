import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboard, setShift } from "../../store/slices/dashboardSlice";
import { updateCompanyInfo } from "../../store/slices/companyInfoSlice";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
import { fetchExpenses } from "../../store/slices/expensesSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { useAutoRefreshOnReconnect } from "../useAutoRefreshOnReconnect";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
import type { ShiftEnum } from "../../types";
import type { AppDispatch, RootState } from "../../store";

function parseUtcDateString(value: string): Date {
  const hasExplicitTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasExplicitTimezone ? value : `${value}Z`);
}

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
  const { items: expenses } = useSelector((state: RootState) => state.expenses);
  const { user: backendUser } = useSelector((state: RootState) => state.auth);
  const effectiveCompanyId = useSelector(selectEffectiveCompanyId);

  // Currency formatter
  const { formatCurrency, formatCompactCurrency } = useCurrencyFormatter();

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  // Fetch dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboard({}));
  }, [dispatch]);

  // Fetch today's transactions when user is available
  useEffect(() => {
    if (effectiveCompanyId) {
      dispatch(
        fetchTransactions({
          companyId: effectiveCompanyId,
          startDate: today,
          endDate: today + "T23:59:59",
        }),
      );
    }
  }, [dispatch, effectiveCompanyId, today]);

  // Fetch today's expenses so the dashboard can show the current day's spend
  useEffect(() => {
    if (effectiveCompanyId) {
      dispatch(
        fetchExpenses({
          companyId: effectiveCompanyId,
          dateFrom: today,
          dateTo: today + "T23:59:59",
        }),
      );
    }
  }, [dispatch, effectiveCompanyId, today]);

  // Auto-refresh after offline → online transition + sync complete
  useAutoRefreshOnReconnect(
    useCallback(() => fetchDashboard({ forceRefresh: true }), []),
  );

  // Refresh handler - forces cache bypass
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchDashboard({ forceRefresh: true }));
    if (effectiveCompanyId) {
      dispatch(
        fetchTransactions({
          companyId: effectiveCompanyId,
          startDate: today,
          endDate: today + "T23:59:59",
        }),
      );
      dispatch(
        fetchExpenses({
          companyId: effectiveCompanyId,
          dateFrom: today,
          dateTo: today + "T23:59:59",
          forceRefresh: true,
        }),
      );
    }
    setRefreshing(false);
  }, [dispatch, effectiveCompanyId, today]);

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
    if (lastReconBoundary) {
      const t = parseUtcDateString(lastReconBoundary).toLocaleTimeString(
        "en-ZA",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      );
      return `Live since ${t}`;
    }
    if (lastReconDate) return `Based on recon ${lastReconDate}`;
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

  // Transactions fetched for the dashboard are already scoped to today.
  const todayTransactions = useMemo(() => transactions, [transactions]);

  const transactionCountsByAccountToday = useMemo(() => {
    const counts = new Map<number, number>();

    todayTransactions.forEach((transaction) => {
      counts.set(
        transaction.accountId,
        (counts.get(transaction.accountId) ?? 0) + 1,
      );
    });

    return counts;
  }, [todayTransactions]);

  // Commission earned per account today (all accounts, used for sorting + table)
  const commissionByAccountId = useMemo(() => {
    const map = new Map<number, number>();
    todayTransactions.forEach((t) => {
      if (
        (t.transactionType === "DEPOSIT" || t.transactionType === "WITHDRAW") &&
        (t.expectedCommission?.commissionAmount ?? 0) > 0
      ) {
        map.set(
          t.accountId,
          (map.get(t.accountId) ?? 0) +
            (t.expectedCommission?.commissionAmount ?? 0),
        );
      }
    });
    return map;
  }, [todayTransactions]);

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((left, right) => {
      const commDelta =
        (commissionByAccountId.get(right.accountId) ?? 0) -
        (commissionByAccountId.get(left.accountId) ?? 0);

      if (commDelta !== 0) return commDelta;
      return left.accountName.localeCompare(right.accountName);
    });
  }, [accounts, commissionByAccountId]);

  const topTransactionAccount = useMemo<{
    accountId: number;
    accountName: string;
    transactionCount: number;
  } | null>(() => {
    let topAccountId: number | null = null;
    let topCount = 0;

    transactionCountsByAccountToday.forEach((count, accountId) => {
      if (count > topCount) {
        topAccountId = accountId;
        topCount = count;
      }
    });

    if (topAccountId === null) return null;

    const matchingAccount = accounts.find(
      (account) => account.accountId === topAccountId,
    );

    return {
      accountId: topAccountId,
      accountName: matchingAccount?.accountName ?? `Account ${topAccountId}`,
      transactionCount: topCount,
    };
  }, [accounts, transactionCountsByAccountToday]);

  const dailyCommissionTransactions = useMemo(
    () =>
      todayTransactions.filter(
        (transaction) =>
          (transaction.transactionType === "DEPOSIT" ||
            transaction.transactionType === "WITHDRAW") &&
          (transaction.expectedCommission?.commissionAmount ?? 0) > 0,
      ),
    [todayTransactions],
  );

  const dailyCommission = useMemo(
    () =>
      dailyCommissionTransactions.reduce(
        (sum, transaction) =>
          sum + (transaction.expectedCommission?.commissionAmount ?? 0),
        0,
      ),
    [dailyCommissionTransactions],
  );

  const topCommissionAccount = useMemo<{
    accountId: number;
    accountName: string;
    commissionAmount: number;
  } | null>(() => {
    const commissionsByAccount = new Map<
      number,
      { accountName: string; commissionAmount: number }
    >();

    dailyCommissionTransactions.forEach((transaction) => {
      const existing = commissionsByAccount.get(transaction.accountId);
      const accountName =
        transaction.account?.name || `Account ${transaction.accountId}`;
      const commissionAmount =
        transaction.expectedCommission?.commissionAmount ?? 0;

      if (existing) {
        existing.commissionAmount += commissionAmount;
        return;
      }

      commissionsByAccount.set(transaction.accountId, {
        accountName,
        commissionAmount,
      });
    });

    let topEntry: {
      accountId: number;
      accountName: string;
      commissionAmount: number;
    } | null = null;

    commissionsByAccount.forEach((value, accountId) => {
      if (!topEntry || value.commissionAmount > topEntry.commissionAmount) {
        topEntry = {
          accountId,
          accountName: value.accountName,
          commissionAmount: value.commissionAmount,
        };
      }
    });

    return topEntry;
  }, [dailyCommissionTransactions]);

  // Top 5 accounts by transaction count today
  const topTransactionAccounts = useMemo<
    { accountId: number; accountName: string; transactionCount: number }[]
  >(() => {
    return accounts
      .map((account) => ({
        accountId: account.accountId,
        accountName: account.accountName,
        transactionCount:
          transactionCountsByAccountToday.get(account.accountId) ?? 0,
      }))
      .filter((entry) => entry.transactionCount > 0)
      .sort((left, right) => {
        const countDelta = right.transactionCount - left.transactionCount;
        if (countDelta !== 0) return countDelta;
        return left.accountName.localeCompare(right.accountName);
      })
      .slice(0, 5);
  }, [accounts, transactionCountsByAccountToday]);

  // Top 5 accounts by commission earned today
  const topCommissionAccounts = useMemo<
    { accountId: number; accountName: string; commissionAmount: number }[]
  >(() => {
    const commissionsByAccount = new Map<
      number,
      { accountName: string; commissionAmount: number }
    >();

    dailyCommissionTransactions.forEach((transaction) => {
      const existing = commissionsByAccount.get(transaction.accountId);
      const accountName =
        transaction.account?.name || `Account ${transaction.accountId}`;
      const commissionAmount =
        transaction.expectedCommission?.commissionAmount ?? 0;

      if (existing) {
        existing.commissionAmount += commissionAmount;
      } else {
        commissionsByAccount.set(transaction.accountId, {
          accountName,
          commissionAmount,
        });
      }
    });

    return Array.from(commissionsByAccount.entries())
      .map(([accountId, value]) => ({ accountId, ...value }))
      .sort((a, b) => b.commissionAmount - a.commissionAmount)
      .slice(0, 5);
  }, [dailyCommissionTransactions]);

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

  const todayExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [expenses],
  );

  const totalBankCommission = useMemo(
    () =>
      dailyCommissionTransactions
        .filter((transaction) => transaction.account?.accountType === "BANK")
        .reduce(
          (sum, transaction) =>
            sum + (transaction.expectedCommission?.commissionAmount ?? 0),
          0,
        ),
    [dailyCommissionTransactions],
  );
  const totalTelecomCommission = useMemo(
    () =>
      dailyCommissionTransactions
        .filter((transaction) => transaction.account?.accountType === "TELECOM")
        .reduce(
          (sum, transaction) =>
            sum + (transaction.expectedCommission?.commissionAmount ?? 0),
          0,
        ),
    [dailyCommissionTransactions],
  );

  return {
    // State
    isLoading,
    error,
    refreshing,
    snapshotDate,
    accounts: sortedAccounts,

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
    topTransactionAccount,
    topCommissionAccount,
    topTransactionAccounts,
    topCommissionAccounts,
    commissionByAccountId,
    transactionCountsByAccountToday,

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
    todayExpenses,
    recentTransactions,

    totalBankCommission,
    totalTelecomCommission,
    // Formatters
    formatCurrency,
    formatCompactCurrency,

    // Actions
    onRefresh,
    injectCapital,
  };
}
