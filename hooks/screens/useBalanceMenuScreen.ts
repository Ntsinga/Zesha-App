import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { fetchCashCounts } from "../../store/slices/cashCountSlice";
import { fetchBalances } from "../../store/slices/balancesSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { calculateReconciliation } from "../../store/slices/reconciliationsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum } from "../../types";

export function useBalanceMenuScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const [selectedShift, setSelectedShift] = useState<ShiftEnum>("AM");

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Get cash counts, balances, and accounts from Redux
  const { items: cashCounts, isLoading: cashCountLoading } = useSelector(
    (state: RootState) => state.cashCount,
  );

  const { items: balances, isLoading: balancesLoading } = useSelector(
    (state: RootState) => state.balances,
  );

  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts,
  );

  const { isCalculating } = useSelector(
    (state: RootState) => state.reconciliations,
  );

  const { user: backendUser } = useSelector((state: RootState) => state.auth);

  const isLoading = cashCountLoading || balancesLoading || accountsLoading;

  // Fetch data on mount
  useEffect(() => {
    dispatch(
      fetchCashCounts({ companyId: backendUser?.companyId || 0, dateFrom: today, dateTo: today }),
    );
    dispatch(
      fetchBalances({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchAccounts({ companyId: backendUser?.companyId || 0, isActive: true }),
    );
  }, [dispatch, today, backendUser?.companyId]);

  // Calculate shift completion status and totals for cash counts
  const cashCountStatus = useMemo(() => {
    const todayCounts = cashCounts.filter((cc) => cc.date === today);
    const amCounts = todayCounts.filter((cc) => cc.shift === "AM");
    const pmCounts = todayCounts.filter((cc) => cc.shift === "PM");

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
  }, [cashCounts, today]);

  // Calculate balance completion status
  const balanceStatus = useMemo(() => {
    const activeAccounts = accounts.filter((acc) => acc.isActive);
    const todayBalances = balances.filter((bal) => bal.date.startsWith(today));

    const amBalances = todayBalances.filter((bal) => bal.shift === "AM");
    const pmBalances = todayBalances.filter((bal) => bal.shift === "PM");

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
    if (hasPM) {
      latestShift = "PM";
    } else if (hasAM) {
      latestShift = "AM";
    }

    return {
      hasAMBalances: hasAM,
      hasPMBalances: hasPM,
      latestBalanceShift: latestShift,
      hasTodayBalances: hasAM || hasPM,
    };
  }, [balances, accounts, today]);

  const handleNavigateCashCount = () => {
    router.push("/add-cash-count");
  };

  const handleNavigateAddBalance = () => {
    router.push("/add-balance");
  };

  const handleNavigateCommissions = () => {
    router.push("/add-commission");
  };

  const handleBack = () => {
    router.back();
  };

  const handleRefresh = () => {
    dispatch(
      fetchCashCounts({ companyId: backendUser?.companyId || 0, dateFrom: today, dateTo: today }),
    );
    dispatch(
      fetchBalances({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchAccounts({ companyId: backendUser?.companyId || 0, isActive: true }),
    );
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
          userId: backendUser.id,
        }),
      ).unwrap();

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to calculate reconciliation",
      };
    }
  };

  return {
    // State
    isLoading,
    isCalculating,
    today,
    formatCurrency,
    selectedShift,
    setSelectedShift,

    // Cash count status
    ...cashCountStatus,

    // Balance status
    ...balanceStatus,

    // Actions
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleBack,
    handleRefresh,
    handleCalculate,
  };
}
