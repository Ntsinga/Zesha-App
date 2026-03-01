import { useState, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
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

import type {
  ShiftEnum,
  ReconciliationSubtypeEnum,
  Balance,
  Commission,
  CashCount,
  BalanceValidationEnum,
} from "../../types";
import type { Transaction } from "../../types/transaction";

interface UseReconciliationScreenProps {
  date: string;
  shift: ShiftEnum;
  subtype: ReconciliationSubtypeEnum;
}

export function useReconciliationScreen({
  date,
  shift,
  subtype,
}: UseReconciliationScreenProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
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
  } = useAppSelector((state) => state.reconciliations);
  const { user: backendUser } = useAppSelector((state) => state.auth);
  const { items: transactions } = useAppSelector(
    (state) => state.transactions,
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
          subtype,
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
          subtype,
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
          subtype,
          userId: backendUser?.id,
        }),
      ).unwrap();
      // Refresh to get updated data
      await dispatch(
        fetchReconciliationDetails({
          companyId: backendUser.companyId,
          date,
          shift,
          subtype,
        }),
      );
      return { success: true };
    } catch (error: unknown) {
      const msg =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Failed to calculate";
      return { success: false, error: msg };
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
          subtype,
          reconciledBy: backendUser.id,
          notes: notes.trim() || undefined,
          forceWithDiscrepancies: hasDiscrepancies ? true : undefined,
        }),
      ).unwrap();
      return { success: true };
    } catch (error: unknown) {
      const msg =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Failed to finalize";
      return { success: false, error: msg };
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
          subtype,
          action: "APPROVED",
          approvedBy: backendUser.id,
        }),
      ).unwrap();
      return { success: true };
    } catch (error: unknown) {
      const msg =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Failed to approve";
      return { success: false, error: msg };
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
          subtype,
          action: "REJECTED",
          approvedBy: backendUser.id,
          rejectionReason: notes.trim(),
        }),
      ).unwrap();
      return { success: true };
    } catch (error: unknown) {
      const msg =
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "Failed to reject";
      return { success: false, error: msg };
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
    subtype,
    isOpening: subtype === "OPENING",

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
    shiftOpeningBalance: reconciliation?.shiftOpeningBalance ?? null,
    shiftVariance: reconciliation?.shiftVariance ?? null,
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
