import { useState, useEffect } from "react";
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
} from "../../store/slices/reconciliationsSlice";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum, Balance, Commission, CashCount } from "../../types";

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
  const { reconciliationDetails, isLoading, isFinalizing, isCalculating, error } = useSelector(
    (state: RootState) => state.reconciliations
  );
  const { user: backendUser } = useSelector((state: RootState) => state.auth);

  // Check if user is supervisor or admin
  const canReview = backendUser?.role === "supervisor" || backendUser?.role === "admin";

  // Fetch details on mount
  useEffect(() => {
    if (date && shift) {
      dispatch(fetchReconciliationDetails({ date, shift }));
    }

    return () => {
      dispatch(clearReconciliationDetails());
    };
  }, [dispatch, date, shift]);

  // Sync notes from reconciliation when loaded
  useEffect(() => {
    if (reconciliationDetails?.reconciliation?.notes) {
      setNotes(reconciliationDetails.reconciliation.notes);
    }
  }, [reconciliationDetails?.reconciliation?.notes]);

  // Extract data from reconciliation detail
  const balances: Balance[] = reconciliationDetails?.balances || [];
  const cashCounts: CashCount[] = reconciliationDetails?.cash_counts || [];
  const commissions: Commission[] = reconciliationDetails?.commissions || [];
  const reconciliation = reconciliationDetails?.reconciliation;

  // Use reconciliation totals (pre-calculated on backend)
  const totalFloat = reconciliation?.total_float || 0;
  const totalCash = reconciliation?.total_cash || 0;
  const totalCommission = reconciliation?.total_commissions || 0;
  const expectedClosing = reconciliation?.expected_closing || 0;
  const actualClosing = reconciliation?.actual_closing || 0;
  const variance = reconciliation?.variance || 0;
  const status = reconciliation?.status || "FLAGGED";
  const isFinalized = reconciliation?.is_finalized || false;
  const isApproved = reconciliation?.is_approved || false;

  const onRefresh = async () => {
    if (!date || !shift) return;
    setRefreshing(true);
    await dispatch(fetchReconciliationDetails({ date, shift }));
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
    if (!date || !shift) return { success: false, error: "Missing date or shift" };

    try {
      await dispatch(
        calculateReconciliation({
          date,
          shift,
          user_id: backendUser?.id,
        })
      ).unwrap();
      // Refresh to get updated data
      await dispatch(fetchReconciliationDetails({ date, shift }));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to calculate" };
    }
  };

  // Finalize reconciliation (lock it)
  const handleFinalize = async () => {
    if (!date || !shift || !backendUser?.id) {
      return { success: false, error: "Missing required data" };
    }

    try {
      await dispatch(
        finalizeReconciliation({
          date,
          shift,
          reconciled_by: backendUser.id,
          notes: notes.trim() || undefined,
        })
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
          approved_by: backendUser.id,
        })
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
          approved_by: backendUser.id,
          rejection_reason: notes.trim(),
        })
      ).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Failed to reject" };
    }
  };

  const getImageUri = (item: {
    image_data?: string | null;
    image_url?: string | null;
  }) => {
    if (item.image_data) {
      return `data:image/jpeg;base64,${item.image_data}`;
    }
    return item.image_url || undefined;
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
