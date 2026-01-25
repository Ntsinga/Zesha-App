import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { fetchCashCounts } from "../../store/slices/cashCountSlice";
import { fetchBalances } from "../../store/slices/balancesSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { fetchCommissions } from "../../store/slices/commissionsSlice";
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

  // Get cash counts, balances, commissions, and accounts from Redux
  const { items: cashCounts, isLoading: cashCountLoading } = useSelector(
    (state: RootState) => state.cashCount,
  );

  const { items: balances, isLoading: balancesLoading } = useSelector(
    (state: RootState) => state.balances,
  );

  const { items: commissions, isLoading: commissionsLoading } = useSelector(
    (state: RootState) => state.commissions,
  );

  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts,
  );

  const { isCalculating } = useSelector(
    (state: RootState) => state.reconciliations,
  );

  const { user: backendUser } = useSelector((state: RootState) => state.auth);

  const isLoading =
    cashCountLoading ||
    balancesLoading ||
    commissionsLoading ||
    accountsLoading;

  // Fetch data on mount
  useEffect(() => {
    dispatch(
      fetchCashCounts({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchBalances({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchCommissions({
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
    let latestBalanceTotal = 0;

    if (hasPM) {
      latestShift = "PM";
      latestBalanceTotal = pmBalances.reduce(
        (sum, bal) => sum + parseFloat(String(bal.amount)),
        0,
      );
    } else if (hasAM) {
      latestShift = "AM";
      latestBalanceTotal = amBalances.reduce(
        (sum, bal) => sum + parseFloat(String(bal.amount)),
        0,
      );
    }

    return {
      hasAMBalances: hasAM,
      hasPMBalances: hasPM,
      latestBalanceShift: latestShift,
      latestBalanceTotal,
      hasTodayBalances: hasAM || hasPM,
    };
  }, [balances, accounts, today]);

  // Calculate commission completion status
  const commissionStatus = useMemo(() => {
    const todayCommissions = commissions.filter((com) =>
      com.date.startsWith(today),
    );

    const amCommissions = todayCommissions.filter((com) => com.shift === "AM");
    const pmCommissions = todayCommissions.filter((com) => com.shift === "PM");

    const hasAM = amCommissions.length > 0;
    const hasPM = pmCommissions.length > 0;

    let latestShift: ShiftEnum | null = null;
    let latestCommissionTotal = 0;

    if (hasPM) {
      latestShift = "PM";
      latestCommissionTotal = pmCommissions.reduce(
        (sum, com) => sum + parseFloat(String(com.amount)),
        0,
      );
    } else if (hasAM) {
      latestShift = "AM";
      latestCommissionTotal = amCommissions.reduce(
        (sum, com) => sum + parseFloat(String(com.amount)),
        0,
      );
    }

    return {
      hasAMCommissions: hasAM,
      hasPMCommissions: hasPM,
      latestCommissionShift: latestShift,
      latestCommissionTotal,
      hasTodayCommissions: hasAM || hasPM,
    };
  }, [commissions, today]);

  // Auto-select the shift that has data (only on initial load)
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  useEffect(() => {
    // Only auto-select once on initial load
    if (hasAutoSelected) return;

    // Determine which shift has data
    // Priority: If both have data, prefer AM. If only one has data, select that one.
    const hasPMData =
      commissionStatus.hasPMCommissions ||
      balanceStatus.hasPMBalances ||
      cashCountStatus.hasPMShift;
    const hasAMData =
      commissionStatus.hasAMCommissions ||
      balanceStatus.hasAMBalances ||
      cashCountStatus.hasAMShift;

    // If both have data or only AM has data, select AM
    // If only PM has data, select PM
    if (hasAMData) {
      setSelectedShift("AM");
      setHasAutoSelected(true);
    } else if (hasPMData) {
      setSelectedShift("PM");
      setHasAutoSelected(true);
    } else if (!hasAMData && !hasPMData) {
      // No data yet, don't mark as auto-selected so we can try again
      setHasAutoSelected(false);
    }
  }, [
    commissionStatus.hasPMCommissions,
    commissionStatus.hasAMCommissions,
    balanceStatus.hasPMBalances,
    balanceStatus.hasAMBalances,
    cashCountStatus.hasPMShift,
    cashCountStatus.hasAMShift,
    hasAutoSelected,
  ]);

  const handleNavigateCashCount = () => {
    // Auto-select shift based on data availability before navigating
    const hasAMData = cashCountStatus.hasAMShift;
    const hasPMData = cashCountStatus.hasPMShift;

    let shiftToNavigate = selectedShift;
    if (hasAMData && !hasPMData) {
      shiftToNavigate = "AM";
      setSelectedShift("AM");
    } else if (hasPMData && !hasAMData) {
      shiftToNavigate = "PM";
      setSelectedShift("PM");
    }
    // If both have data or neither, keep current selection

    router.push(`/add-cash-count?shift=${shiftToNavigate}` as any);
  };

  const handleNavigateAddBalance = () => {
    // Auto-select shift based on data availability before navigating
    const hasAMData = balanceStatus.hasAMBalances;
    const hasPMData = balanceStatus.hasPMBalances;

    let shiftToNavigate = selectedShift;
    if (hasAMData && !hasPMData) {
      shiftToNavigate = "AM";
      setSelectedShift("AM");
    } else if (hasPMData && !hasAMData) {
      shiftToNavigate = "PM";
      setSelectedShift("PM");
    }
    // If both have data or neither, keep current selection

    router.push(`/add-balance?shift=${shiftToNavigate}` as any);
  };

  const handleNavigateCommissions = () => {
    // Auto-select shift based on data availability before navigating
    const hasAMData = commissionStatus.hasAMCommissions;
    const hasPMData = commissionStatus.hasPMCommissions;

    let shiftToNavigate = selectedShift;
    if (hasAMData && !hasPMData) {
      shiftToNavigate = "AM";
      setSelectedShift("AM");
    } else if (hasPMData && !hasAMData) {
      shiftToNavigate = "PM";
      setSelectedShift("PM");
    }
    // If both have data or neither, keep current selection

    router.push(`/add-commission?shift=${shiftToNavigate}` as any);
  };

  const handleBack = () => {
    router.back();
  };

  const handleRefresh = () => {
    dispatch(
      fetchCashCounts({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchBalances({
        companyId: backendUser?.companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
    dispatch(
      fetchCommissions({
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

  // Compute status for the selected shift
  const selectedShiftStatus = useMemo(() => {
    const hasSelectedCashCount =
      selectedShift === "AM"
        ? cashCountStatus.hasAMShift
        : cashCountStatus.hasPMShift;

    const hasSelectedBalances =
      selectedShift === "AM"
        ? balanceStatus.hasAMBalances
        : balanceStatus.hasPMBalances;

    const hasSelectedCommissions =
      selectedShift === "AM"
        ? commissionStatus.hasAMCommissions
        : commissionStatus.hasPMCommissions;

    // Calculate totals for selected shift
    const todayCounts = cashCounts.filter(
      (cc) => cc.date === today && cc.shift === selectedShift,
    );
    const selectedShiftTotal = todayCounts.reduce(
      (sum, cc) => sum + parseFloat(String(cc.amount)),
      0,
    );

    const todayBalances = balances.filter(
      (bal) => bal.date.startsWith(today) && bal.shift === selectedShift,
    );
    const selectedBalanceTotal = todayBalances.reduce(
      (sum, bal) => sum + parseFloat(String(bal.amount)),
      0,
    );

    const todayCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === selectedShift,
    );
    const selectedCommissionTotal = todayCommissions.reduce(
      (sum, com) => sum + parseFloat(String(com.amount)),
      0,
    );

    return {
      hasSelectedCashCount,
      hasSelectedBalances,
      hasSelectedCommissions,
      selectedShiftTotal,
      selectedBalanceTotal,
      selectedCommissionTotal,
    };
  }, [
    selectedShift,
    cashCountStatus.hasAMShift,
    cashCountStatus.hasPMShift,
    balanceStatus.hasAMBalances,
    balanceStatus.hasPMBalances,
    commissionStatus.hasAMCommissions,
    commissionStatus.hasPMCommissions,
    cashCounts,
    balances,
    commissions,
    today,
  ]);

  return {
    // State
    isLoading,
    isCalculating,
    today,
    formatCurrency,
    selectedShift,
    setSelectedShift,

    // Cash count status (all shifts)
    ...cashCountStatus,

    // Balance status (all shifts)
    ...balanceStatus,

    // Commission status (all shifts)
    ...commissionStatus,

    // Selected shift status
    ...selectedShiftStatus,

    // Actions
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleBack,
    handleRefresh,
    handleCalculate,
  };
}
