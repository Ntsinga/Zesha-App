import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "expo-router";
import {
  fetchReconciliationDetails,
  calculateReconciliation,
  finalizeReconciliation,
  clearCalculatedResult,
} from "../../store/slices/reconciliationsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum } from "../../types";

interface UseReconcileReviewScreenProps {
  date: string;
  shift: ShiftEnum;
}

export function useReconcileReviewScreen({
  date,
  shift,
}: UseReconcileReviewScreenProps) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // Redux state
  const {
    calculatedResult,
    reconciliationDetails,
    isLoading,
    isCalculating,
    isFinalizing,
    error,
  } = useSelector((state: RootState) => state.reconciliations);

  const { user: backendUser } = useSelector((state: RootState) => state.auth);

  // Fetch details on mount
  useEffect(() => {
    if (date && shift) {
      dispatch(fetchReconciliationDetails({ date, shift }));
    }

    return () => {
      dispatch(clearCalculatedResult());
    };
  }, [dispatch, date, shift]);

  // Get reconciliation data
  const reconciliation =
    calculatedResult?.data || reconciliationDetails?.reconciliation;

  // Handler to recalculate reconciliation
  const handleRecalculate = async () => {
    if (!date || !shift) return;

    try {
      await dispatch(
        calculateReconciliation({
          date,
          shift,
          user_id: backendUser?.id,
        })
      ).unwrap();

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to recalculate reconciliation",
      };
    }
  };

  // Handler to finalize reconciliation
  const handleFinalize = async () => {
    if (!date || !shift || !backendUser?.id) return;

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
      return {
        success: false,
        error: error.message || "Failed to finalize reconciliation",
      };
    }
  };

  // Handler to navigate back
  const handleBack = () => {
    router.back();
  };

  // Get status display data
  const getStatusDisplay = () => {
    if (!reconciliation) return null;

    const statusMap: Record<
      string,
      {
        icon: string;
        color: string;
        bgColor: string;
        label: string;
        description: string;
      }
    > = {
      PASSED: {
        icon: "CheckCircle",
        color: "#10B981",
        bgColor: "#D1FAE5",
        label: "Reconciliation Passed",
        description: "All balances match expected values",
      },
      FLAGGED: {
        icon: "AlertTriangle",
        color: "#F59E0B",
        bgColor: "#FEF3C7",
        label: "Reconciliation Flagged",
        description: "Minor discrepancies detected - review recommended",
      },
      FAILED: {
        icon: "XCircle",
        color: "#EF4444",
        bgColor: "#FEE2E2",
        label: "Reconciliation Failed",
        description: "Significant discrepancies - action required",
      },
      CALCULATED: {
        icon: "AlertTriangle",
        color: "#3B82F6",
        bgColor: "#DBEAFE",
        label: "Reconciliation Calculated",
        description: "Ready for review and finalization",
      },
    };

    return statusMap[reconciliation.status] || statusMap.CALCULATED;
  };

  return {
    // State
    notes,
    setNotes,
    showNotes,
    setShowNotes,
    reconciliation,
    isLoading,
    isCalculating,
    isFinalizing,
    error,
    formatCurrency,

    // Handlers
    handleRecalculate,
    handleFinalize,
    handleBack,

    // Helpers
    getStatusDisplay,
  };
}
