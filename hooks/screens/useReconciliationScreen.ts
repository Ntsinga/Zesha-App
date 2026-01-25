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
  const {
    reconciliationDetails,
    isLoading,
    isFinalizing,
    isCalculating,
    error,
  } = useSelector((state: RootState) => state.reconciliations);
  const { user: backendUser } = useSelector((state: RootState) => state.auth);

  // Check if user is supervisor or admin
  const canReview =
    backendUser?.role === "manager" || backendUser?.role === "admin";

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
    }

    return () => {
      dispatch(clearReconciliationDetails());
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

  const onRefresh = async () => {
    if (!date || !shift || !backendUser?.companyId) return;
    setRefreshing(true);
    await dispatch(
      fetchReconciliationDetails({
        companyId: backendUser.companyId,
        date,
        shift,
      }),
    );
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
  const handleFinalize = async () => {
    if (!date || !shift || !backendUser?.id || !backendUser?.companyId) {
      return { success: false, error: "Missing required data" };
    }

    try {
      await dispatch(
        finalizeReconciliation({
          companyId: backendUser.companyId,
          date,
          shift,
          reconciledBy: backendUser.id,
          notes: notes.trim() || undefined,
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
