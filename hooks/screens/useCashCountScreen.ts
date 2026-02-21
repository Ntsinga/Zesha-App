import { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  createManyCashCounts,
  fetchCashCounts,
  deleteCashCount,
} from "../../store/slices/cashCountSlice";
import { useNetworkContext } from "@/hooks/useNetworkStatus";
import { queueOfflineMutation } from "@/utils/offlineQueue";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
import { useCurrencyFormatter } from "../useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum, CashCountCreate } from "../../types";

// Denomination values
export const DENOMINATIONS = [
  { value: 50000, label: "50,000", displayValue: 50000 },
  { value: 20000, label: "20,000", displayValue: 20000 },
  { value: 10000, label: "10,000", displayValue: 10000 },
  { value: 5000, label: "5,000", displayValue: 5000 },
  { value: 2000, label: "2,000", displayValue: 2000 },
  { value: 1000, label: "1,000 (Note)", displayValue: 1000, isNote: true },
  { value: 1000, label: "1,000 (Coin)", displayValue: 1000, isCoin: true },
  { value: 500, label: "500", displayValue: 500 },
  { value: 200, label: "200", displayValue: 200 },
  { value: 100, label: "100", displayValue: 100 },
];

export interface DenominationEntry {
  denomination: number;
  label: string;
  displayValue: number;
  quantity: string;
  isCoin?: boolean;
  isNote?: boolean;
}

export function useCashCountScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const companyId = useSelector(selectEffectiveCompanyId);
  const { isConnected } = useNetworkContext();
  const params = useLocalSearchParams();

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Shift is passed from the balance menu screen - use it as-is
  const shift: ShiftEnum = (params.shift as ShiftEnum) || "AM";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [entries, setEntries] = useState<DenominationEntry[]>(
    DENOMINATIONS.map((d) => ({
      denomination: d.value,
      label: d.label,
      displayValue: d.displayValue,
      quantity: "",
      isCoin: d.isCoin,
      isNote: d.isNote,
    })),
  );

  // Get cash counts from Redux
  const { items: cashCounts, isLoading } = useSelector(
    (state: RootState) => state.cashCount,
  );

  // Fetch cash counts on mount
  useEffect(() => {
    dispatch(
      fetchCashCounts({
        companyId: companyId || 0,
        dateFrom: today,
        dateTo: today,
      }),
    );
  }, [dispatch, today, companyId]);

  // Pre-populate entries when shift changes or cash counts are loaded
  useEffect(() => {
    const shiftCounts = cashCounts.filter(
      (cc) => cc.date === today && cc.shift === shift,
    );

    if (shiftCounts.length > 0) {
      setIsEditing(true);

      const usedCounts = new Set<number>();

      setEntries((prev) =>
        prev.map((entry) => {
          const match = shiftCounts.find((cc) => {
            if (usedCounts.has(cc.id)) return false;
            const ccDenom = parseFloat(String(cc.denomination));
            if (ccDenom === entry.denomination) {
              usedCounts.add(cc.id);
              return true;
            }
            return false;
          });

          if (match) {
            return { ...entry, quantity: String(match.quantity) };
          }
          return { ...entry, quantity: "" };
        }),
      );
    } else {
      setIsEditing(false);
      setEntries((prev) => prev.map((e) => ({ ...e, quantity: "" })));
    }
  }, [cashCounts, shift, today]);

  const updateQuantity = (index: number, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;

    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, quantity: value } : entry,
      ),
    );
  };

  const incrementQuantity = (index: number) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? { ...entry, quantity: String(parseInt(entry.quantity || "0") + 1) }
          : entry,
      ),
    );
  };

  const decrementQuantity = (index: number) => {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const current = parseInt(entry.quantity || "0");
        return { ...entry, quantity: current > 0 ? String(current - 1) : "" };
      }),
    );
  };

  // Calculate totals
  const { totalAmount, totalNotes, filledEntries } = useMemo(() => {
    let amount = 0;
    let notes = 0;
    let filled = 0;

    entries.forEach((entry) => {
      const qty = parseInt(entry.quantity || "0");
      if (qty > 0) {
        amount += entry.displayValue * qty;
        notes += qty;
        filled++;
      }
    });

    return { totalAmount: amount, totalNotes: notes, filledEntries: filled };
  }, [entries]);

  const hasDataForShift = (s: ShiftEnum) => {
    return cashCounts.some((cc) => cc.date === today && cc.shift === s);
  };

  const handleSubmit = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    const validEntries = entries.filter(
      (entry) => parseInt(entry.quantity || "0") > 0,
    );

    if (validEntries.length === 0) {
      return {
        success: false,
        message: "Please enter at least one denomination quantity.",
      };
    }

    if (!companyId) {
      return {
        success: false,
        message: "Company not found. Please log in again.",
      };
    }

    // Offline queue — only supports creating new entries (not edit mode)
    if (!isConnected) {
      if (isEditing) {
        return {
          success: false,
          message: "Editing cash counts requires an internet connection.",
        };
      }

      const cashCountData = validEntries.map((entry) => ({
        companyId,
        denomination: entry.denomination,
        quantity: parseInt(entry.quantity),
        amount: entry.displayValue * parseInt(entry.quantity),
        date: today,
        shift,
      }));

      try {
        await queueOfflineMutation({
          entityType: "cashCountBulk",
          method: "POST",
          endpoint: "/cash-counts/bulk",
          payload: { cashCounts: cashCountData },
        });
        return {
          success: true,
          message: `Cash count queued for sync when back online. Total: ${formatCurrency(totalAmount)}`,
        };
      } catch {
        return { success: false, message: "Failed to queue cash count for offline sync." };
      }
    }

    setIsSubmitting(true);

    try {
      // If editing, delete existing cash counts for this shift first
      if (isEditing) {
        const existingCounts = cashCounts.filter(
          (cc) => cc.date === today && cc.shift === shift,
        );

        await Promise.all(
          existingCounts.map((cc) => dispatch(deleteCashCount(cc.id)).unwrap()),
        );
      }

      const cashCountData: CashCountCreate[] = validEntries.map((entry) => ({
        companyId: companyId,
        denomination: entry.denomination,
        quantity: parseInt(entry.quantity),
        amount: entry.displayValue * parseInt(entry.quantity),
        date: today,
        shift,
      }));

      await dispatch(createManyCashCounts(cashCountData)).unwrap();

      // Refresh dashboard and cash counts
      dispatch(fetchDashboard({}));
      dispatch(
        fetchCashCounts({
          companyId: companyId,
          dateFrom: today,
          dateTo: today,
        }),
      );

      return {
        success: true,
        message: `Cash count ${
          isEditing ? "updated" : "saved"
        }! Total: ${formatCurrency(totalAmount)}`,
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to save cash count",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearAll = () => {
    setEntries((prev) => prev.map((e) => ({ ...e, quantity: "" })));
  };

  const handleBack = () => {
    router.back();
  };

  return {
    // State
    shift,
    entries,
    isSubmitting,
    isEditing,
    isLoading,
    today,
    formatCurrency,

    // Calculated values
    totalAmount,
    totalNotes,
    filledEntries,

    // Actions
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    handleSubmit,
    clearAll,
    handleBack,
  };
}
