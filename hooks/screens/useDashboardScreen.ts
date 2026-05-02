import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboard, setShift } from "../../store/slices/dashboardSlice";
import { updateCompanyInfo } from "../../store/slices/companyInfoSlice";
import {
  fetchTransactions,
  fetchTransactionAnalytics,
  fetchDailyAnalytics,
} from "../../store/slices/transactionsSlice";
import { fetchExpenses } from "../../store/slices/expensesSlice";
import {
  fetchCommissionTotals,
  fetchCommissionBreakdown,
  fetchCommissionDailyTotals,
} from "../../store/slices/expectedCommissionsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { useAutoRefreshOnReconnect } from "../useAutoRefreshOnReconnect";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
import type { AccountTypeEnum, ShiftEnum } from "../../types";
import type { AppDispatch, RootState } from "../../store";

function parseUtcDateString(value: string): Date {
  const hasExplicitTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasExplicitTimezone ? value : `${value}Z`);
}

type ChartPeriod = "today" | "week" | "month" | "year";

function getChartDateRange(period: ChartPeriod): {
  startDate: string;
  endDate: string;
} {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (period === "today") return { startDate: end, endDate: end };
  const daysBack = period === "week" ? 6 : period === "month" ? 29 : 364;
  const from = new Date(d);
  from.setDate(d.getDate() - daysBack);
  const start = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
  return { startDate: start, endDate: end };
}

function getChartDays(period: ChartPeriod): number {
  if (period === "today") return 1;
  if (period === "week") return 7;
  if (period === "year") return 365;
  return 30;
}

function buildDailySlots(startDate: string, endDate: string): string[] {
  const slots: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    slots.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return slots;
}

/**
 * Shared Dashboard screen hook - contains all business logic
 * Used by both web and native Dashboard components
 */
export function useDashboardScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const [refreshing, setRefreshing] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("today");

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

  const {
    items: transactions,
    analytics: transactionAnalytics,
    dailyAnalytics: transactionDailyData,
  } = useSelector((state: RootState) => state.transactions);
  const { items: expenses } = useSelector((state: RootState) => state.expenses);
  const {
    totals: commissionTotals,
    breakdown: commissionBreakdown,
    dailyTotals: commissionDailyTotals,
  } = useSelector((state: RootState) => state.expectedCommissions);
  const { user: backendUser } = useSelector((state: RootState) => state.auth);
  const effectiveCompanyId = useSelector(selectEffectiveCompanyId);

  // Currency formatter
  const { formatCurrency, formatCompactCurrency } = useCurrencyFormatter();

  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const hasCoreDashboardData = Boolean(summary);
  const chartRange = useMemo(
    () => getChartDateRange(chartPeriod),
    [chartPeriod],
  );

  // Fetch dashboard data on mount and whenever effectiveCompanyId becomes available
  useEffect(() => {
    if (!effectiveCompanyId) return;
    dispatch(fetchDashboard({}));
  }, [dispatch, effectiveCompanyId]);

  // Fetch today's transactions (always today — powers balances table)
  useEffect(() => {
    if (effectiveCompanyId && hasCoreDashboardData) {
      dispatch(
        fetchTransactions({
          companyId: effectiveCompanyId,
          startDate: today,
          endDate: today + "T23:59:59",
          limit: 500,
        }),
      );
    }
  }, [dispatch, effectiveCompanyId, today, hasCoreDashboardData]);

  // Fetch chart data based on selected period (commission pies + transaction bar + daily charts)
  useEffect(() => {
    if (!effectiveCompanyId || !hasCoreDashboardData) return;
    const { startDate, endDate } = chartRange;
    dispatch(
      fetchCommissionTotals({ startDate, endDate, shift: currentShift }),
    );
    dispatch(
      fetchCommissionBreakdown({ startDate, endDate, shift: currentShift }),
    );
    dispatch(
      fetchTransactionAnalytics({
        companyId: effectiveCompanyId,
        startDate,
        endDate,
      }),
    );
    // Daily data for line / area charts
    dispatch(fetchCommissionDailyTotals({ startDate, endDate }));
    dispatch(
      fetchDailyAnalytics({
        companyId: effectiveCompanyId,
        days: getChartDays(chartPeriod),
      }),
    );
  }, [
    dispatch,
    effectiveCompanyId,
    chartPeriod,
    currentShift,
    chartRange,
    hasCoreDashboardData,
  ]);

  // Fetch all expenses (not just today) so totalPendingExpenses reflects cumulative pending
  useEffect(() => {
    if (effectiveCompanyId && hasCoreDashboardData) {
      dispatch(
        fetchExpenses({
          companyId: effectiveCompanyId,
        }),
      );
    }
  }, [dispatch, effectiveCompanyId, hasCoreDashboardData]);

  // Auto-refresh after offline → online transition + sync complete
  useAutoRefreshOnReconnect(
    useCallback(() => fetchDashboard({ forceRefresh: true }), []),
  );

  // Refresh handler - forces cache bypass
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchDashboard({ forceRefresh: true }));
    if (effectiveCompanyId) {
      const { startDate, endDate } = chartRange;
      dispatch(
        fetchTransactions({
          companyId: effectiveCompanyId,
          startDate: today,
          endDate: today + "T23:59:59",
          limit: 500,
        }),
      );
      dispatch(
        fetchCommissionTotals({ startDate, endDate, shift: currentShift }),
      );
      dispatch(
        fetchCommissionBreakdown({ startDate, endDate, shift: currentShift }),
      );
      dispatch(
        fetchTransactionAnalytics({
          companyId: effectiveCompanyId,
          startDate,
          endDate,
        }),
      );
      dispatch(fetchCommissionDailyTotals({ startDate, endDate }));
      dispatch(
        fetchDailyAnalytics({
          companyId: effectiveCompanyId,
          days: getChartDays(chartPeriod),
        }),
      );
      dispatch(
        fetchExpenses({
          companyId: effectiveCompanyId,
          forceRefresh: true,
        }),
      );
    }
    setRefreshing(false);
  }, [
    dispatch,
    effectiveCompanyId,
    today,
    chartPeriod,
    currentShift,
    chartRange,
  ]);

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

  // Commission earned per account today (always from today's transactions — powers the balances table)
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

  const dailyCommission =
    commissionTotals?.totalExpectedCommission ??
    // Fallback: compute from loaded transactions if totals not yet fetched
    dailyCommissionTransactions.reduce(
      (sum, transaction) =>
        sum + (transaction.expectedCommission?.commissionAmount ?? 0),
      0,
    );

  const topCommissionAccount = useMemo<{
    accountId: number;
    accountName: string;
    commissionAmount: number;
  } | null>(() => {
    if (commissionBreakdown.length > 0) {
      const topEntry = [...commissionBreakdown].sort(
        (left, right) =>
          right.totalExpectedCommission - left.totalExpectedCommission,
      )[0];

      return topEntry
        ? {
            accountId: topEntry.accountId,
            accountName: topEntry.accountName,
            commissionAmount: topEntry.totalExpectedCommission,
          }
        : null;
    }

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
  }, [commissionBreakdown, dailyCommissionTransactions]);

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
    {
      accountId: number;
      accountName: string;
      commissionAmount: number;
      accountType: AccountTypeEnum;
    }[]
  >(() => {
    if (commissionBreakdown.length > 0) {
      return [...commissionBreakdown]
        .map((entry) => ({
          accountId: entry.accountId,
          accountName: entry.accountName,
          commissionAmount: entry.totalExpectedCommission,
          accountType: entry.accountType,
        }))
        .sort((left, right) => right.commissionAmount - left.commissionAmount)
        .slice(0, 5);
    }

    const commissionsByAccount = new Map<
      number,
      {
        accountName: string;
        commissionAmount: number;
        accountType: AccountTypeEnum;
      }
    >();

    dailyCommissionTransactions.forEach((transaction) => {
      const existing = commissionsByAccount.get(transaction.accountId);
      const accountName =
        transaction.account?.name || `Account ${transaction.accountId}`;
      const commissionAmount =
        transaction.expectedCommission?.commissionAmount ?? 0;
      const accountType = transaction.account?.accountType ?? "TELECOM";

      if (existing) {
        existing.commissionAmount += commissionAmount;
      } else {
        commissionsByAccount.set(transaction.accountId, {
          accountName,
          commissionAmount,
          accountType,
        });
      }
    });

    return Array.from(commissionsByAccount.entries())
      .map(([accountId, value]) => ({ accountId, ...value }))
      .sort((a, b) => b.commissionAmount - a.commissionAmount)
      .slice(0, 5);
  }, [commissionBreakdown, dailyCommissionTransactions]);

  const transactionCount = todayTransactions.length;

  // Transaction bar chart data: period-aware via analytics endpoint
  const chartTransactionAccounts = useMemo<
    { accountId: number; accountName: string; transactionCount: number }[]
  >(() => {
    if (transactionAnalytics?.byAccount?.length) {
      return [...transactionAnalytics.byAccount]
        .filter((a) => a.transactionCount > 0)
        .sort((a, b) => b.transactionCount - a.transactionCount)
        .slice(0, 8);
    }
    return topTransactionAccounts;
  }, [transactionAnalytics, topTransactionAccounts]);

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
    () =>
      expenses
        .filter((expense) => expense.expenseDate?.startsWith(today))
        .reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [expenses, today],
  );

  const capitalPendingExpenses = useMemo(
    () =>
      expenses
        .filter(
          (expense) =>
            expense.fundingSource === "CAPITAL" && expense.status === "PENDING",
        )
        .reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [expenses],
  );

  const currentMonth = today.slice(0, 7);
  const totalMonthExpenses = useMemo(
    () =>
      expenses
        .filter((expense) => expense.expenseDate?.startsWith(currentMonth))
        .reduce((sum, expense) => sum + (expense.amount || 0), 0),
    [expenses, currentMonth],
  );

  const totalBankCommission = useMemo(
    () =>
      commissionBreakdown.length > 0
        ? commissionBreakdown
            .filter((entry) => entry.accountType === "BANK")
            .reduce((sum, entry) => sum + entry.totalExpectedCommission, 0)
        : dailyCommissionTransactions
            .filter(
              (transaction) => transaction.account?.accountType === "BANK",
            )
            .reduce(
              (sum, transaction) =>
                sum + (transaction.expectedCommission?.commissionAmount ?? 0),
              0,
            ),
    [commissionBreakdown, dailyCommissionTransactions],
  );
  const totalTelecomCommission = useMemo(
    () =>
      commissionBreakdown.length > 0
        ? commissionBreakdown
            .filter((entry) => entry.accountType === "TELECOM")
            .reduce((sum, entry) => sum + entry.totalExpectedCommission, 0)
        : dailyCommissionTransactions
            .filter(
              (transaction) => transaction.account?.accountType === "TELECOM",
            )
            .reduce(
              (sum, transaction) =>
                sum + (transaction.expectedCommission?.commissionAmount ?? 0),
              0,
            ),
    [commissionBreakdown, dailyCommissionTransactions],
  );

  // Expense breakdown by category (for pie chart)
  const expensesByCategory = useMemo<{ name: string; value: number }[]>(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      const cat = e.category || "Uncategorized";
      map.set(cat, (map.get(cat) ?? 0) + (e.amount || 0));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const netEarningsTrendData = useMemo<
    {
      date: string;
      commission: number;
      expenses: number;
      netEarnings: number;
    }[]
  >(() => {
    const { startDate, endDate } = chartRange;

    if (chartPeriod === "year") {
      const now = new Date();
      const slots: string[] = [];
      for (let index = 11; index >= 0; index--) {
        const slot = new Date(now.getFullYear(), now.getMonth() - index, 1);
        const key = `${slot.getFullYear()}-${String(slot.getMonth() + 1).padStart(2, "0")}`;
        slots.push(key);
      }

      const commissionByMonth: Record<string, number> = {};
      commissionDailyTotals.forEach((entry) => {
        const key = entry.date.slice(0, 7);
        commissionByMonth[key] =
          (commissionByMonth[key] ?? 0) + entry.totalExpectedCommission;
      });

      const expensesByMonth: Record<string, number> = {};
      expenses.forEach((expense) => {
        const expenseDate = expense.expenseDate.slice(0, 10);
        if (expenseDate < startDate || expenseDate > endDate) return;
        const key = expenseDate.slice(0, 7);
        expensesByMonth[key] =
          (expensesByMonth[key] ?? 0) + (expense.amount || 0);
      });

      return slots.map((key) => {
        const commission = commissionByMonth[key] ?? 0;
        const expenseTotal = expensesByMonth[key] ?? 0;
        return {
          date: new Date(`${key}-01`).toLocaleString("default", {
            month: "short",
            year: "2-digit",
          }),
          commission,
          expenses: expenseTotal,
          netEarnings: commission - expenseTotal,
        };
      });
    }

    const commissionByDay: Record<string, number> = {};
    commissionDailyTotals.forEach((entry) => {
      commissionByDay[entry.date] =
        (commissionByDay[entry.date] ?? 0) + entry.totalExpectedCommission;
    });

    const expensesByDay: Record<string, number> = {};
    expenses.forEach((expense) => {
      const expenseDate = expense.expenseDate.slice(0, 10);
      if (expenseDate < startDate || expenseDate > endDate) return;
      expensesByDay[expenseDate] =
        (expensesByDay[expenseDate] ?? 0) + (expense.amount || 0);
    });

    return buildDailySlots(startDate, endDate).map((date) => {
      const commission = commissionByDay[date] ?? 0;
      const expenseTotal = expensesByDay[date] ?? 0;
      return {
        date: date.slice(5),
        commission,
        expenses: expenseTotal,
        netEarnings: commission - expenseTotal,
      };
    });
  }, [chartPeriod, chartRange, commissionDailyTotals, expenses]);

  return {
    // State
    isLoading,
    // True while waiting for companyId to resolve or the very first data fetch
    isInitializing: !effectiveCompanyId || (!hasCoreDashboardData && isLoading),
    hasCoreDashboardData,
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
    commissionBreakdown,
    commissionByAccountId,
    transactionCountsByAccountToday,
    chartPeriod,
    setChartPeriod,
    chartTransactionAccounts,

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
    capitalPendingExpenses,
    totalMonthExpenses,
    recentTransactions,

    totalBankCommission,
    totalTelecomCommission,

    // Chart data for new charts
    commissionDailyTotals,
    transactionDailyData,
    expensesByCategory,
    netEarningsTrendData,

    // Formatters
    formatCurrency,
    formatCompactCurrency,

    // Actions
    onRefresh,
    injectCapital,
  };
}
