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
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";

import type {
  ShiftEnum,
  ReconciliationSubtypeEnum,
  Balance,
  Commission,
  CashCount,
  BalanceValidationEnum,
} from "../../types";

interface UseReconciliationScreenProps {
  date: string;
  shift: ShiftEnum;
  subtype: ReconciliationSubtypeEnum;
  autoRecalculate?: boolean;
  companyIdOverride?: number;
}

export function useReconciliationScreen({
  date,
  shift,
  subtype,
  autoRecalculate = false,
  companyIdOverride,
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
    isLoadingDetails,
    isFinalizing,
    isCalculating,
    error,
    balanceValidation,
  } = useAppSelector((state) => state.reconciliations);
  const { user: backendUser } = useAppSelector((state) => state.auth);
  const effectiveCompanyId = useAppSelector(selectEffectiveCompanyId);
  const resolvedCompanyId = companyIdOverride ?? effectiveCompanyId;

  // Check if user can review reconciliations (supervisor or admin)
  const canReview =
    backendUser?.role === "Agent Supervisor" ||
    backendUser?.role === "Administrator" ||
    backendUser?.role === "Super Administrator";

  // Fetch details on mount
  useEffect(() => {
    if (autoRecalculate) {
      return () => {
        dispatch(clearReconciliationDetails());
        dispatch(clearBalanceValidation());
      };
    }

    if (date && shift && resolvedCompanyId) {
      dispatch(
        fetchReconciliationDetails({
          companyId: resolvedCompanyId,
          date,
          shift,
          subtype,
        }),
      );
      dispatch(
        fetchBalanceValidation({
          companyId: resolvedCompanyId,
          date,
          shift,
          subtype,
        }),
      );
    }

    return () => {
      dispatch(clearReconciliationDetails());
      dispatch(clearBalanceValidation());
    };
  }, [dispatch, date, shift, subtype, resolvedCompanyId, autoRecalculate]);

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

  // Use reconciliation totals (pre-calculated on backend), fall back to
  // summing commissions array so the card is never blank after Calculate.
  const totalFloat = reconciliation?.totalFloat || 0;
  const totalCash = reconciliation?.totalCash || 0;
  // Always derive commission total from the loaded commissions array.
  // Fall back to the backend field only when the array is empty (not yet loaded).
  const commissionsSum = commissions.reduce(
    (sum, c) => sum + (c.amount || 0),
    0,
  );
  const totalCommission =
    commissionsSum > 0 ? commissionsSum : reconciliation?.totalCommissions || 0;
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

  const onRefresh = async () => {
    if (!date || !shift || !resolvedCompanyId) return;
    setRefreshing(true);
    await Promise.all([
      dispatch(
        fetchReconciliationDetails({
          companyId: resolvedCompanyId,
          date,
          shift,
          subtype,
        }),
      ),
      dispatch(
        fetchBalanceValidation({
          companyId: resolvedCompanyId,
          date,
          shift,
          subtype,
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
    if (!date || !shift || !resolvedCompanyId)
      return { success: false, error: "Missing date or shift" };

    try {
      await dispatch(
        calculateReconciliation({
          companyId: resolvedCompanyId,
          date,
          shift,
          subtype,
          userId: backendUser?.id,
        }),
      ).unwrap();
      // Refresh detail, validation and live float
      await Promise.all([
        dispatch(
          fetchReconciliationDetails({
            companyId: resolvedCompanyId,
            date,
            shift,
            subtype,
          }),
        ),
        dispatch(
          fetchBalanceValidation({
            companyId: resolvedCompanyId,
            date,
            shift,
            subtype,
          }),
        ),
        dispatch(
          fetchDashboard({
            companyId: resolvedCompanyId,
            forceRefresh: true,
          }),
        ),
      ]);
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
    if (!date || !shift || !backendUser?.id || !resolvedCompanyId) {
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
          companyId: resolvedCompanyId,
          date,
          shift,
          subtype,
          reconciledBy: backendUser.id,
          notes: notes.trim() || undefined,
          forceWithDiscrepancies: hasDiscrepancies ? true : undefined,
        }),
      ).unwrap();
      // Refresh live float after finalization
      dispatch(
        fetchDashboard({
          companyId: resolvedCompanyId,
          forceRefresh: true,
        }),
      );
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

  // Navigate to the add-balance screen to update floats for this reconciliation.
  const handleNavigateEditBalances = () => {
    router.push(
      `/add-balance?shift=${shift}&subtype=${subtype}&date=${date}&returnTo=reconciliation` as any,
    );
  };

  // Navigate to the add-cash-count screen to update cash count for this reconciliation.
  const handleNavigateEditCashCount = () => {
    router.push(
      `/add-cash-count?shift=${shift}&subtype=${subtype}&date=${date}&returnTo=reconciliation` as any,
    );
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
    isLoading: isLoadingDetails,
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
    // Actions
    onRefresh,
    handleBack,
    handleCalculate,
    handleFinalize,
    handleApprove,
    handleReject,
    handleNavigateEditBalances,
    handleNavigateEditCashCount,
    getImageUri,

    // Formatters
    formatCurrency,
    formatDate,
  };
}
