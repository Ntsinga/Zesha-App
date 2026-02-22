import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDate } from "../../utils/formatters";
import {
  fetchReconciliationDetails,
  clearReconciliationDetails,
  finalizeReconciliation,
  approveReconciliation,
  calculateReconciliation,
  fetchBalanceValidation,
  clearBalanceValidation,
} from "../../store/slices/reconciliationsSlice";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
import type { AppDispatch, RootState } from "../../store";
import type {
  ShiftEnum,
  Balance,
  Commission,
  CashCount,
  BalanceValidationEnum,
} from "../../types";
import type { Transaction } from "../../types/transaction";

interface UseReconciliationScreenProps {
  date: string;
  shift: ShiftEnum;
}

export function useReconciliationScreen({
  date,
  shift,
}: UseReconciliationScreenProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  // Redux state
  const {
    reconciliationDetails,
    isLoading,
    isFinalizing,
    isCalculating,
    error,
    balanceValidation,
  } = useSelector((state: RootState) => state.reconciliations);
  const { user: backendUser } = useSelector((state: RootState) => state.auth);
  const { items: transactions } = useSelector(
    (state: RootState) => state.transactions,
  );

  // Check if user can review reconciliations (supervisor or admin)
  const canReview =
    backendUser?.role === "Agent Supervisor" ||
    backendUser?.role === "Administrator" ||
    backendUser?.role === "Super Administrator";

  // Fetch details on mount
  useEffect(() => {
    if (date && shift && backendUser?.companyId) {
      dispatch(
        fetchReconciliationDetails({
          companyId: backendUser.companyId,
          date,
          shift,
        }),
      );
      dispatch(
        fetchBalanceValidation({
          companyId: backendUser.companyId,
          date,
          shift,
        }),
      );
      dispatch(
        fetchTransactions({
          companyId: backendUser.companyId,
          startDate: date,
          endDate: date,
          shift,
        }),
      );
    }

    return () => {
      dispatch(clearReconciliationDetails());
      dispatch(clearBalanceValidation());
    };
  }, [dispatch, date, shift, backendUser?.companyId]);

  // Load notes from reconciliation details when they're fetched
  useEffect(() => {
    if (reconciliationDetails?.reconciliation?.notes) {
      setNotes(reconciliationDetails.reconciliation.notes);
    }
  }, [reconciliationDetails]);

  // Extract data from reconciliation detail
  const balances: Balance[] = reconciliationDetails?.balances || [];
  const cashCounts: CashCount[] = reconciliationDetails?.cashCounts || [];
  const commissions: Commission[] = reconciliationDetails?.commissions || [];
  const reconciliation = reconciliationDetails?.reconciliation;

  // Use reconciliation totals (pre-calculated on backend)
  const totalFloat = reconciliation?.totalFloat || 0;
  const totalCash = reconciliation?.totalCash || 0;
  const totalCommission = reconciliation?.totalCommissions || 0;
  const expectedClosing = reconciliation?.expectedClosing || 0;
  const actualClosing = reconciliation?.actualClosing || 0;
  const variance = reconciliation?.variance || 0;
  const status = reconciliation?.status || "FLAGGED";
  const isFinalized = reconciliation?.isFinalized || false;
  const isApproved = reconciliation?.approvalStatus === "APPROVED" || false;

  // --- Balance validation computed values ---
  const { hasDiscrepancies, discrepancyCount, totalDiscrepancyAmount } =
    useMemo(() => {
      let count = 0;
      let totalVariance = 0;
      const validationList = Array.isArray(balanceValidation)
        ? balanceValidation
        : [];
      for (const v of validationList) {
        if (
          v.validationStatus === "SHORTAGE" ||
          v.validationStatus === "EXCESS"
        ) {
          count++;
          totalVariance += Math.abs(v.variance ?? 0);
        }
      }
      return {
        hasDiscrepancies: count > 0,
        discrepancyCount: count,
        totalDiscrepancyAmount: totalVariance,
      };
    }, [balanceValidation]);

  // Build a lookup map: accountId → validation result
  const validationByAccountId = useMemo(() => {
    const map: Record<
      number,
      {
        calculatedBalance: number;
        variance: number;
        validationStatus: BalanceValidationEnum;
      }
    > = {};
    const validationList = Array.isArray(balanceValidation)
      ? balanceValidation
      : [];
    for (const v of validationList) {
      if (v.accountId != null) {
        map[v.accountId] = {
          calculatedBalance: v.calculatedBalance ?? 0,
          variance: v.variance ?? 0,
          validationStatus:
            (v.validationStatus as BalanceValidationEnum) ?? "PENDING",
        };
      }
    }
    return map;
  }, [balanceValidation]);

  // --- Linked transactions for this shift ---
  const shiftTransactions: Transaction[] = useMemo(() => {
    return transactions
      .filter((t) => t.transactionTime?.startsWith(date) && t.shift === shift)
      .sort(
        (a, b) =>
          new Date(b.transactionTime || "").getTime() -
          new Date(a.transactionTime || "").getTime(),
      );
  }, [transactions, date, shift]);

  const onRefresh = async () => {
    if (!date || !shift || !backendUser?.companyId) return;
    setRefreshing(true);
    await Promise.all([
      dispatch(
        fetchReconciliationDetails({
          companyId: backendUser.companyId,
          date,
          shift,
        }),
      ),
      dispatch(
        fetchBalanceValidation({
          companyId: backendUser.companyId,
          date,
          shift,
        }),
      ),
      dispatch(
        fetchTransactions({
          companyId: backendUser.companyId,
          startDate: date,
          endDate: date,
          shift,
        }),
      ),
    ]);
    setRefreshing(false);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/balance");
    }
  };

  // Calculate/recalculate reconciliation
  const handleCalculate = async () => {
    if (!date || !shift || !backendUser?.companyId)
      return { success: false, error: "Missing date or shift" };

    try {
      await dispatch(
        calculateReconciliation({
          companyId: backendUser.companyId,
          date,
          shift,
          userId: backendUser?.id,
        }),
      ).unwrap();
      // Refresh to get updated data
      await dispatch(
        fetchReconciliationDetails({
          companyId: backendUser.companyId,
          date,
          shift,
        }),
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to calculate" };
    }
  };

  // Finalize reconciliation (lock it)
  const handleFinalize = async (forceWithDiscrepancies = false) => {
    if (!date || !shift || !backendUser?.id || !backendUser?.companyId) {
      return { success: false, error: "Missing required data" };
    }

    // If there are discrepancies and the user hasn't confirmed, warn them
    if (hasDiscrepancies && !forceWithDiscrepancies) {
      return {
        success: false,
        error: "HAS_DISCREPANCIES",
        discrepancyCount,
        totalDiscrepancyAmount,
      };
    }

    try {
      await dispatch(
        finalizeReconciliation({
          companyId: backendUser.companyId,
          date,
          shift,
          reconciledBy: backendUser.id,
          notes: notes.trim() || undefined,
          forceWithDiscrepancies: hasDiscrepancies ? true : undefined,
        }),
      ).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to finalize" };
    }
  };

  // Approve reconciliation (supervisor/admin only)
  const handleApprove = async () => {
    if (!date || !shift || !backendUser?.id || !canReview) {
      return { success: false, error: "Not authorized" };
    }

    try {
      await dispatch(
        approveReconciliation({
          date,
          shift,
          action: "APPROVED",
          approvedBy: backendUser.id,
        }),
      ).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to approve" };
    }
  };

  // Reject reconciliation (supervisor/admin only)
  const handleReject = async () => {
    if (!date || !shift || !backendUser?.id || !canReview) {
      return { success: false, error: "Not authorized" };
    }

    if (!notes.trim()) {
      return { success: false, error: "Rejection reason is required" };
    }

    try {
      await dispatch(
        approveReconciliation({
          date,
          shift,
          action: "REJECTED",
          approvedBy: backendUser.id,
          rejectionReason: notes.trim(),
        }),
      ).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to reject" };
    }
  };

  const getImageUri = (item: {
    imageData?: string | null;
    imageUrl?: string | null;
  }) => {
    if (item.imageData) {
      return `data:image/jpeg;base64,${item.imageData}`;
    }
    return item.imageUrl || undefined;
  };

  return {
    // State
    refreshing,
    isLoading,
    isFinalizing,
    isCalculating,
    error,
    selectedImage,
    setSelectedImage,
    notes,
    setNotes,
    date,
    shift,

    // User & permissions
    backendUser,
    canReview,

    // Data
    balances,
    cashCounts,
    commissions,
    reconciliation,
    totalFloat,
    totalCash,
    totalCommission,
    expectedClosing,
    actualClosing,
    variance,
    status,
    isFinalized,
    isApproved,

    // Balance validation
    balanceValidation,
    hasDiscrepancies,
    discrepancyCount,
    totalDiscrepancyAmount,
    validationByAccountId,

    // Linked transactions
    shiftTransactions,

    // Actions
    onRefresh,
    handleBack,
    handleCalculate,
    handleFinalize,
    handleApprove,
    handleReject,
    getImageUri,

    // Formatters
    formatCurrency,
    formatDate,
  };
}
