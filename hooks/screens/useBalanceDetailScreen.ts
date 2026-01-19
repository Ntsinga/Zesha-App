import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDate } from "../../utils/formatters";
import { API_BASE_URL, API_ENDPOINTS } from "../../config/api";
import type { ReconciliationDetail, ShiftEnum } from "../../types";

interface UseBalanceDetailScreenProps {
  date: string;
  shift: ShiftEnum;
}

export function useBalanceDetailScreen({
  date,
  shift,
}: UseBalanceDetailScreenProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrencyFormatter();

  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [data, setData] = useState<ReconciliationDetail | null>(null);

  // Extract data from reconciliation detail
  const balances = data?.balances || [];
  const cashCounts = data?.cash_counts || [];
  const commissions = data?.commissions || [];
  const reconciliation = data?.reconciliation;

  // Use reconciliation totals (pre-calculated on backend)
  const totalFloat = reconciliation?.total_float || 0;
  const totalCash = reconciliation?.total_cash || 0;
  const totalCommission = reconciliation?.total_commissions || 0;
  const expectedClosing = reconciliation?.expected_closing || 0;
  const actualClosing = reconciliation?.actual_closing || 0;
  const variance = reconciliation?.variance || 0;
  const status = reconciliation?.status || "FLAGGED";

  useEffect(() => {
    loadData();
  }, [date, shift]);

  const loadData = async () => {
    try {
      setError(null);
      const endpoint = API_ENDPOINTS.reconciliations.details(date, shift);
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Failed to load" }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const detail: ReconciliationDetail = await response.json();
      setData(detail);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load reconciliation details"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleBack = () => {
    router.back();
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
    error,
    selectedImage,
    setSelectedImage,
    date,
    shift,

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

    // Actions
    onRefresh,
    handleBack,
    getImageUri,

    // Formatters
    formatCurrency,
    formatDate,
  };
}
