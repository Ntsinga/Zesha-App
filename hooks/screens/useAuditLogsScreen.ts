import { useEffect, useMemo, useState } from "react";

import { fetchAuditLogs } from "@/store/slices/auditLogsSlice";
import { useCurrencyFormatter } from "@/hooks/useCurrency";
import { formatDate } from "@/utils/formatters";
import type { AuditLogEntry } from "@/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type ActionFilter = "ALL" | AuditLogEntry["action"];

export function useAuditLogsScreen() {
  const dispatch = useAppDispatch();
  const { formatCurrency } = useCurrencyFormatter();
  const { items, total, isLoading, error } = useAppSelector(
    (state) => state.auditLogs,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);

  useEffect(() => {
    void dispatch(fetchAuditLogs({ limit: 50 }));
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(
      fetchAuditLogs({
        limit: 50,
        action: actionFilter === "ALL" ? undefined : actionFilter,
        entityType: entityTypeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    );
    setRefreshing(false);
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesAction =
        actionFilter === "ALL" || item.action === actionFilter;
      const matchesEntity =
        !entityTypeFilter ||
        item.entityType.toLowerCase().includes(entityTypeFilter.toLowerCase());
      const matchesFrom = !dateFrom || item.occurredAt.slice(0, 10) >= dateFrom;
      const matchesTo = !dateTo || item.occurredAt.slice(0, 10) <= dateTo;
      return matchesAction && matchesEntity && matchesFrom && matchesTo;
    });
  }, [actionFilter, dateFrom, dateTo, entityTypeFilter, items]);

  const selectedLog =
    filteredItems.find((item) => item.id === selectedLogId) ??
    filteredItems[0] ??
    null;

  return {
    items: filteredItems,
    total,
    isLoading,
    error,
    refreshing,
    actionFilter,
    entityTypeFilter,
    dateFrom,
    dateTo,
    selectedLog,
    selectedLogId,
    setSelectedLogId,
    setActionFilter,
    setEntityTypeFilter,
    setDateFrom,
    setDateTo,
    onRefresh,
    formatCurrency,
    formatDate,
  };
}
