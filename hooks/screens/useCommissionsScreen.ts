import { useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, useFocusEffect } from "expo-router";
import { fetchCommissions } from "../../store/slices/commissionsSlice";
import { useCurrencyFormatter } from "../useCurrency";
import { formatDate } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";
import type { Commission, ShiftEnum } from "../../types";

export interface DailyCommissionGroup {
  date: string;
  amCommissions: Commission[];
  pmCommissions: Commission[];
  amTotal: number;
  pmTotal: number;
  dailyTotal: number;
}

export function useCommissionsScreen() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const { items: commissions, isLoading } = useSelector(
    (state: RootState) => state.commissions,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [filterShift, setFilterShift] = useState<ShiftEnum | "ALL">("ALL");

  // Refresh commissions when screen gains focus
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCommissions({ forceRefresh: true }));
    }, [dispatch]),
  );

  // Refresh handler - forces cache bypass
  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchCommissions({ forceRefresh: true }));
    setRefreshing(false);
  };

  // Group commissions by date
  const groupedCommissions = useMemo(() => {
    const groups: Map<string, DailyCommissionGroup> = new Map();

    commissions.forEach((commission) => {
      const dateKey = commission.date.split("T")[0];

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          date: dateKey,
          amCommissions: [],
          pmCommissions: [],
          amTotal: 0,
          pmTotal: 0,
          dailyTotal: 0,
        });
      }

      const group = groups.get(dateKey)!;
      if (commission.shift === "AM") {
        group.amCommissions.push(commission);
        group.amTotal += commission.amount;
      } else {
        group.pmCommissions.push(commission);
        group.pmTotal += commission.amount;
      }
      group.dailyTotal += commission.amount;
    });

    // Sort by date descending
    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [commissions]);

  // Filtered commissions for table view
  const filteredCommissions = useMemo(() => {
    if (filterShift === "ALL") {
      return [...commissions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }
    return commissions
      .filter((c) => c.shift === filterShift)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [commissions, filterShift]);

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const getImageUri = (commission: Commission) => {
    if (commission.imageData) {
      return `data:image/jpeg;base64,${commission.imageData}`;
    }
    return commission.imageUrl;
  };

  // Calculate overall totals
  const overallTotal = groupedCommissions.reduce(
    (sum, g) => sum + g.dailyTotal,
    0,
  );

  const amTotal = groupedCommissions.reduce((sum, g) => sum + g.amTotal, 0);
  const pmTotal = groupedCommissions.reduce((sum, g) => sum + g.pmTotal, 0);

  const handleBack = () => {
    router.back();
  };

  const handleAddCommission = () => {
    router.push("/add-commission");
  };

  return {
    // State
    isLoading,
    refreshing,
    selectedImage,
    setSelectedImage,
    expandedDates,
    filterShift,
    setFilterShift,

    // Data
    commissions,
    groupedCommissions,
    filteredCommissions,

    // Totals
    overallTotal,
    amTotal,
    pmTotal,

    // Actions
    onRefresh,
    toggleExpand,
    getImageUri,
    handleBack,
    handleAddCommission,

    // Utils
    formatCurrency,
    formatDate,
  };
}
