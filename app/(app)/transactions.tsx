import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import {
  Plus,
  SlidersHorizontal,
  RotateCcw,
  Wallet,
} from "lucide-react-native";
import { formatAmountInput, parseAmountInput } from "../../utils/formatters";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { ActionModal, AddTransactionForm } from "../../components/ActionModal";
import {
  fetchTransactions,
  reverseTransaction,
  invalidateTransactionsCache,
} from "../../store/slices/transactionsSlice";
import {
  resetToPending,
  dismissQueueItem,
  dismissDeadLetterItem,
  pruneDeadLetters,
  type QueueItem,
} from "../../store/slices/syncQueueSlice";
import { API_ENDPOINTS } from "../../config/api";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { triggerSync } from "../../services/syncEngine";
import { formatDate } from "../../utils/formatters";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import { generateIdempotencyKey } from "../../utils/idempotency";
import { queueOfflineMutation } from "../../utils/offlineQueue";
import type {
  TransactionRecord as Transaction,
  TransactionTypeEnum,
  ShiftEnum,
  CapitalInjectionCreate,
  CashCapitalInjectionCreate,
} from "../../types";
import type { Account } from "../../types";

type TypeFilter = "ALL" | TransactionTypeEnum;
type ShiftFilter = "ALL" | ShiftEnum;

const FINANCIAL_QUEUE_ENTITY_TYPES = new Set([
  "transaction",
  "floatPurchase",
  "capitalInjection",
  "cashCapitalInjection",
]);
const DEAD_LETTER_NOTICE_MAX_MINUTES = 10;

type PendingDisplayType =
  | "DEPOSIT"
  | "WITHDRAW"
  | "FLOAT_PURCHASE"
  | "CAPITAL_INJECTION";

function isFinancialQueueItem(item: QueueItem): boolean {
  return FINANCIAL_QUEUE_ENTITY_TYPES.has(item.entityType);
}

function getPendingDisplayType(item: QueueItem): PendingDisplayType {
  if (item.entityType === "transaction") {
    return item.payload?.transaction_type === "WITHDRAW"
      ? "WITHDRAW"
      : "DEPOSIT";
  }

  if (item.entityType === "floatPurchase") {
    return "FLOAT_PURCHASE";
  }

  return "CAPITAL_INJECTION";
}

function getPendingCompanyId(item: QueueItem): number | null {
  const companyId = item.payload?.company_id;
  return typeof companyId === "number" ? companyId : null;
}

function getPendingAccountIds(item: QueueItem): number[] {
  const payload = item.payload ?? {};

  if (
    item.entityType === "transaction" ||
    item.entityType === "capitalInjection"
  ) {
    return typeof payload.account_id === "number" ? [payload.account_id] : [];
  }

  if (item.entityType === "cashCapitalInjection") {
    return [];
  }

  const accountIds: number[] = [];

  if (typeof payload.destination_account_id === "number") {
    accountIds.push(payload.destination_account_id);
  }

  if (typeof payload.source_account_id === "number") {
    accountIds.push(payload.source_account_id);
  }

  return accountIds;
}

function matchesPendingFilters(
  item: QueueItem,
  {
    companyId,
    filterType,
    filterAccountId,
    filterShift,
  }: {
    companyId: number | null | undefined;
    filterType: TypeFilter;
    filterAccountId: number | undefined;
    filterShift: ShiftFilter;
  },
): boolean {
  if (companyId != null && getPendingCompanyId(item) !== companyId) {
    return false;
  }

  if (filterType !== "ALL" && getPendingDisplayType(item) !== filterType) {
    return false;
  }

  if (
    filterAccountId !== undefined &&
    !getPendingAccountIds(item).includes(filterAccountId)
  ) {
    return false;
  }

  // Pending writes do not carry the backend-derived shift value yet.
  if (filterShift !== "ALL") {
    return false;
  }

  return true;
}

function getPendingAccountLabel(item: QueueItem, accounts: Account[]): string {
  const payload = item.payload ?? {};

  if (
    item.entityType === "transaction" ||
    item.entityType === "capitalInjection"
  ) {
    const accountId =
      typeof payload.account_id === "number" ? payload.account_id : null;
    if (accountId == null) {
      return item.entityType === "capitalInjection"
        ? "Working capital"
        : "Pending account";
    }

    return (
      accounts.find((account) => account.id === accountId)?.name ??
      `Acct #${accountId}`
    );
  }

  if (item.entityType === "cashCapitalInjection") {
    return "Cash Working Capital";
  }

  const destinationAccountId =
    typeof payload.destination_account_id === "number"
      ? payload.destination_account_id
      : null;

  if (destinationAccountId == null) {
    return "Float transfer";
  }

  const destinationName =
    accounts.find((account) => account.id === destinationAccountId)?.name ??
    `Acct #${destinationAccountId}`;

  if (payload.float_source === "AGENT" || payload.float_source === "BANK") {
    return `${destinationName} top-up`;
  }

  const sourceAccountId =
    typeof payload.source_account_id === "number"
      ? payload.source_account_id
      : null;

  if (sourceAccountId == null) {
    return destinationName;
  }

  const sourceName =
    accounts.find((account) => account.id === sourceAccountId)?.name ??
    `Acct #${sourceAccountId}`;

  return `${sourceName} -> ${destinationName}`;
}

function getPendingReference(item: QueueItem): string | null {
  const reference = item.payload?.reference;
  return typeof reference === "string" && reference.length > 0
    ? reference
    : null;
}

function getPendingNotes(item: QueueItem): string | null {
  const notes = item.payload?.notes;
  return typeof notes === "string" && notes.length > 0 ? notes : null;
}

function getPendingAmount(item: QueueItem): number {
  const amount = item.payload?.amount;
  return typeof amount === "number" ? amount : 0;
}

function getPendingTimestamp(item: QueueItem): string {
  const transactionTime = item.payload?.transaction_time;
  return typeof transactionTime === "string" && transactionTime.length > 0
    ? transactionTime
    : item.createdAt;
}

function isStalledPendingItem(item: QueueItem): boolean {
  return (
    item.status === "awaiting_confirmation" ||
    item.status === "failed" ||
    item.status === "blocked"
  );
}

function getPendingStatusLabel(item: QueueItem): string {
  return isStalledPendingItem(item) ? "Stalled" : "Pending";
}

function getPendingStatusColors(item: QueueItem) {
  if (isStalledPendingItem(item)) {
    return {
      bg: "#FEF3C7",
      text: "#B45309",
    };
  }

  return {
    bg: "#DBEAFE",
    text: "#1D4ED8",
  };
}

function canDismissPendingItem(item: QueueItem | null): boolean {
  const http = item?.lastHttpStatus;
  return (
    item?.status === "failed" &&
    http !== undefined &&
    http >= 400 &&
    http < 500 &&
    http !== 409
  );
}

function canRetryPendingItem(item: QueueItem | null): boolean {
  if (!item) return false;
  if (item.status === "awaiting_confirmation") return true;
  if (item.status === "failed") return !canDismissPendingItem(item);
  return false;
}

function isBlockedPendingItem(item: QueueItem | null): boolean {
  return item?.status === "blocked";
}

function getQueueEntityLabel(item: { entityType: string }): string {
  switch (item.entityType) {
    case "balance":
      return "balance";
    case "balanceBulk":
      return "balance batch";
    case "commission":
      return "commission";
    case "commissionBulk":
      return "commission batch";
    case "expense":
      return "expense";
    case "cashCount":
      return "cash count";
    case "cashCountBulk":
      return "cash count batch";
    case "transaction":
      return "transaction";
    case "floatPurchase":
      return "float purchase";
    case "capitalInjection":
      return "capital injection";
    case "cashCapitalInjection":
      return "cash capital injection";
    case "reconciliation":
      return "reconciliation";
    default:
      return item.entityType;
  }
}

function getTechnicalQueueStatusLabel(status: string): string {
  switch (status) {
    case "awaiting_confirmation":
      return "awaiting confirmation";
    case "synced":
      return "synced";
    default:
      return status;
  }
}

function getQueueHeadActionHint(item: QueueItem): string {
  if (isBlockedPendingItem(item)) {
    return item.lastHttpStatus === 401
      ? "Session expired. Redirecting."
      : "This item is blocked by an authorization error.";
  }

  if (canDismissPendingItem(item)) {
    return "Remove it to unblock later transactions.";
  }

  if (canRetryPendingItem(item)) {
    return "Retry it to resume syncing.";
  }

  return "It will continue automatically in queue order.";
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "DEPOSIT":
      return "Deposit";
    case "WITHDRAW":
      return "Withdraw";
    case "FLOAT_PURCHASE":
      return "Float Purchase";
    case "CAPITAL_INJECTION":
      return "Capital Injection";
    default:
      return type;
  }
}

function getTypeBadgeColors(type: string) {
  switch (type) {
    case "DEPOSIT":
      return { bg: "#dcfce7", text: "#16a34a" };
    case "WITHDRAW":
      return { bg: "#fee2e2", text: "#dc2626" };
    case "FLOAT_PURCHASE":
      return { bg: "#dbeafe", text: "#2563eb" };
    case "CAPITAL_INJECTION":
      return { bg: "#ccfbf1", text: "#0d9488" };
    default:
      return { bg: "#f3f4f6", text: "#6b7280" };
  }
}

function getAmountColor(type: string): string {
  switch (type) {
    case "DEPOSIT":
    case "CAPITAL_INJECTION":
      return "#16a34a";
    case "WITHDRAW":
      return "#dc2626";
    case "FLOAT_PURCHASE":
      return "#2563eb";
    default:
      return "#374151";
  }
}

function getAmountPrefix(type: string): string {
  switch (type) {
    case "DEPOSIT":
    case "CAPITAL_INJECTION":
      return "+";
    case "WITHDRAW":
      return "-";
    default:
      return "";
  }
}

export default function Transactions() {
  const dispatch = useAppDispatch();
  const { formatCurrency } = useCurrencyFormatter();
  const insets = useSafeAreaInsets();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<TypeFilter>("ALL");
  const [filterShift, setFilterShift] = useState<ShiftFilter>("ALL");
  const [filterAccountId, setFilterAccountId] = useState<number | undefined>(
    undefined,
  );
  const syncFetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [isReversing, setIsReversing] = useState(false);
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [injectionForm, setInjectionForm] = useState({
    injectionType: "FLOAT" as "FLOAT" | "CASH",
    accountId: undefined as number | undefined,
    amount: "",
    reference: "",
    notes: "",
  });
  const [isSubmittingInjection, setIsSubmittingInjection] = useState(false);
  const capitalInjectionRequestKeyRef = useRef<string | null>(null);
  const { items: transactions, isLoading } = useAppSelector(
    (state) => state.transactions,
  );
  const queueItems = useAppSelector((state) => state.syncQueue.items);
  const deadLetters = useAppSelector((state) => state.syncQueue.deadLetters);
  const recentSyncHistory = useAppSelector(
    (state) => state.syncQueue.recentHistory,
  );
  const syncErrorLog = useAppSelector((state) => state.syncQueue.errorLog);
  const currentCompanyId = useAppSelector(
    (state) => state.auth.viewingAgencyId || state.auth.user?.companyId,
  );
  const accounts = useAppSelector((state) => state.accounts.items);
  const backendUser = useAppSelector((state) => state.auth.user);
  const canInjectCapital = backendUser?.role !== "Agent";
  const lastSyncedAt = useAppSelector((state) => state.syncQueue.lastSyncedAt);
  const [refreshing, setRefreshing] = useState(false);

  const pendingFinancialWrites = queueItems.filter(
    (item) =>
      isFinancialQueueItem(item) &&
      matchesPendingFilters(item, {
        companyId: currentCompanyId,
        filterType,
        filterAccountId,
        filterShift,
      }),
  );
  const pendingFinancialWritesIgnoringShift = queueItems.filter(
    (item) =>
      isFinancialQueueItem(item) &&
      matchesPendingFilters(item, {
        companyId: currentCompanyId,
        filterType,
        filterAccountId,
        filterShift: "ALL",
      }),
  );
  const oldestPendingFinancialWrite = pendingFinancialWrites[0] ?? null;
  const queueHeadItem = queueItems[0] ?? null;
  const queueHeadBlocksFinancialWrites =
    pendingFinancialWritesIgnoringShift.length > 0 &&
    queueHeadItem !== null &&
    !isFinancialQueueItem(queueHeadItem);
  const actionablePendingItem = queueHeadBlocksFinancialWrites
    ? queueHeadItem
    : oldestPendingFinancialWrite;
  const hiddenPendingCount =
    filterShift !== "ALL"
      ? pendingFinancialWritesIgnoringShift.length
      : Math.max(
          pendingFinancialWritesIgnoringShift.length -
            pendingFinancialWrites.length,
          0,
        );
  const queueHeadBlockerMessage =
    queueHeadBlocksFinancialWrites && queueHeadItem
      ? `Transactions are ${getPendingStatusLabel(queueHeadItem).toLowerCase()} behind an earlier ${getQueueEntityLabel(queueHeadItem)}.${queueHeadItem.lastError ? ` Last error: ${queueHeadItem.lastError}.` : ""} ${getQueueHeadActionHint(queueHeadItem)}`
      : null;
  const latestDeadLetterItem = deadLetters[0] ?? null;
  const latestSyncHistoryItem = recentSyncHistory[0] ?? null;
  const latestSyncError = syncErrorLog[0] ?? null;
  const showQueueDiagnostics =
    queueHeadItem !== null && isStalledPendingItem(queueHeadItem);
  const seenDeadLetterIdsRef = useRef<Set<string>>(
    new Set(deadLetters.map((item) => item.id)),
  );

  useEffect(() => {
    dispatch(fetchAccounts({}));
  }, [dispatch]);

  useEffect(() => {
    const pruneExpiredDeadLetters = () => {
      const cutoffIso = new Date(
        Date.now() - DEAD_LETTER_NOTICE_MAX_MINUTES * 60 * 1000,
      ).toISOString();
      dispatch(pruneDeadLetters({ cutoffIso }));
    };

    pruneExpiredDeadLetters();
    const intervalId = setInterval(pruneExpiredDeadLetters, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!latestDeadLetterItem) {
      return;
    }

    if (seenDeadLetterIdsRef.current.has(latestDeadLetterItem.id)) {
      return;
    }

    seenDeadLetterIdsRef.current.add(latestDeadLetterItem.id);
    Alert.alert(
      "Queued item removed",
      `A queued ${getQueueEntityLabel(latestDeadLetterItem)} was removed from automatic sync so later items can continue. ${latestDeadLetterItem.deadLetterReason}`,
    );
  }, [latestDeadLetterItem]);

  const handleDismissDeadLetter = useCallback(() => {
    if (!latestDeadLetterItem) {
      return;
    }

    dispatch(dismissDeadLetterItem(latestDeadLetterItem.id));
  }, [dispatch, latestDeadLetterItem]);

  // Re-fetch transactions after sync activity settles (debounced) so a large
  // queue flushing over a restored network only triggers one fetch, not one
  // per synced item.
  useEffect(() => {
    if (!lastSyncedAt) return;

    if (syncFetchDebounceRef.current) {
      clearTimeout(syncFetchDebounceRef.current);
    }

    syncFetchDebounceRef.current = setTimeout(() => {
      dispatch(invalidateTransactionsCache());
      dispatch(
        fetchTransactions({
          transactionType:
            filterType !== "ALL"
              ? (filterType as TransactionTypeEnum)
              : undefined,
          shift: filterShift !== "ALL" ? (filterShift as ShiftEnum) : undefined,
          accountId: filterAccountId,
        }),
      );
    }, 1500);

    return () => {
      if (syncFetchDebounceRef.current) {
        clearTimeout(syncFetchDebounceRef.current);
      }
    };
  }, [lastSyncedAt, dispatch, filterType, filterShift, filterAccountId]);

  const buildFilters = () => ({
    transactionType:
      filterType !== "ALL" ? (filterType as TransactionTypeEnum) : undefined,
    shift: filterShift !== "ALL" ? (filterShift as ShiftEnum) : undefined,
    accountId: filterAccountId,
  });

  useEffect(() => {
    dispatch(fetchTransactions(buildFilters()));
  }, [dispatch, filterType, filterShift, filterAccountId]);

  useEffect(() => {
    capitalInjectionRequestKeyRef.current = null;
  }, [
    injectionForm.injectionType,
    injectionForm.accountId,
    injectionForm.amount,
    injectionForm.reference,
    injectionForm.notes,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchTransactions(buildFilters()));
    setRefreshing(false);
  };

  const activeFilterCount =
    (filterType !== "ALL" ? 1 : 0) +
    (filterShift !== "ALL" ? 1 : 0) +
    (filterAccountId !== undefined ? 1 : 0);

  const handleFormSuccess = () => {
    // Post-queue refresh is handled by the lastSyncedAt watcher above,
    // which fires after the sync engine confirms the item with the server.
  };

  const handleRetryOldestPending = useCallback(() => {
    if (!actionablePendingItem || !canRetryPendingItem(actionablePendingItem)) {
      return;
    }

    dispatch(resetToPending(actionablePendingItem.id));
    void triggerSync();
  }, [actionablePendingItem, dispatch]);

  const handleDismissItem = useCallback(
    (item: QueueItem) => {
      if (!canDismissPendingItem(item)) return;
      Alert.alert(
        "Remove Transaction",
        `The server rejected this transaction${
          item.lastError ? ": " + item.lastError : "."
        } Remove it from the queue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => dispatch(dismissQueueItem(item.id)),
          },
        ],
      );
    },
    [dispatch],
  );

  const handleCreateCapitalInjection = useCallback(async () => {
    if (!injectionForm.amount) return;
    const companyId = currentCompanyId;
    if (!companyId) return;

    try {
      setIsSubmittingInjection(true);
      const requestKey =
        capitalInjectionRequestKeyRef.current ??
        generateIdempotencyKey("capital-native");
      capitalInjectionRequestKeyRef.current = requestKey;

      if (injectionForm.injectionType === "FLOAT") {
        if (!injectionForm.accountId) return;
        const data: CapitalInjectionCreate = {
          companyId,
          accountId: injectionForm.accountId,
          amount: parseFloat(injectionForm.amount),
          transactionTime: new Date().toISOString(),
          reference: injectionForm.reference || undefined,
          notes: injectionForm.notes || undefined,
          idempotencyKey: requestKey,
        };
        await queueOfflineMutation({
          clientMutationId: requestKey,
          idempotencyKey: requestKey,
          entityType: "capitalInjection",
          method: "POST",
          endpoint: API_ENDPOINTS.transactions.capitalInjection,
          payload: data as unknown as Record<string, unknown>,
        });
      } else {
        const data: CashCapitalInjectionCreate = {
          companyId,
          amount: parseFloat(injectionForm.amount),
          transactionTime: new Date().toISOString(),
          reference: injectionForm.reference || undefined,
          notes: injectionForm.notes || undefined,
          idempotencyKey: requestKey,
        };
        await queueOfflineMutation({
          clientMutationId: requestKey,
          idempotencyKey: requestKey,
          entityType: "cashCapitalInjection",
          method: "POST",
          endpoint: API_ENDPOINTS.transactions.cashCapitalInjection,
          payload: data as unknown as Record<string, unknown>,
        });
      }

      void triggerSync();
      capitalInjectionRequestKeyRef.current = null;
      setShowInjectionModal(false);
      setInjectionForm({
        injectionType: "FLOAT",
        accountId: undefined,
        amount: "",
        reference: "",
        notes: "",
      });
      Alert.alert(
        "Saved as pending",
        "This capital injection was saved locally and will sync in order automatically.",
      );
    } catch (err) {
      Alert.alert(
        "Injection Failed",
        typeof err === "string"
          ? err
          : "Could not record capital injection. Please try again.",
      );
    } finally {
      setIsSubmittingInjection(false);
    }
  }, [currentCompanyId, injectionForm]);

  const handleReverse = useCallback(
    (tx: Transaction) => {
      Alert.alert(
        "Reverse Transaction",
        `Are you sure you want to reverse this ${getTypeLabel(tx.transactionType).toLowerCase()} of ${formatCurrency(tx.amount)} for ${tx.account?.name || `Acct #${tx.accountId}`}?\n\nThis will create a reversing entry and cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reverse",
            style: "destructive",
            onPress: async () => {
              try {
                setIsReversing(true);
                await dispatch(
                  reverseTransaction({ id: tx.id, companyId: tx.companyId }),
                ).unwrap();
                dispatch(fetchTransactions(buildFilters()));
              } catch (err) {
                Alert.alert(
                  "Reversal Failed",
                  typeof err === "string"
                    ? err
                    : err instanceof Error
                      ? err.message
                      : "Could not reverse this transaction. Please try again.",
                );
              } finally {
                setIsReversing(false);
              }
            },
          },
        ],
      );
    },
    [dispatch, formatCurrency, buildFilters],
  );

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  const pendingRows = pendingFinancialWrites.map((item) => {
    const displayType = getPendingDisplayType(item);
    return {
      id: item.id,
      accountLabel: getPendingAccountLabel(item, accounts),
      amount: getPendingAmount(item),
      displayType,
      reference: getPendingReference(item),
      notes: getPendingNotes(item),
      transactionTime: getPendingTimestamp(item),
      statusLabel: getPendingStatusLabel(item),
      statusColors: getPendingStatusColors(item),
      canRetry:
        actionablePendingItem?.id === item.id &&
        canRetryPendingItem(actionablePendingItem),
      canDismiss:
        actionablePendingItem?.id === item.id &&
        canDismissPendingItem(actionablePendingItem),
      isHeadOfLine:
        !queueHeadBlocksFinancialWrites &&
        oldestPendingFinancialWrite?.id === item.id,
    };
  });
  const displayedRowCount = pendingRows.length + transactions.length;

  return (
    <View className="flex-1 bg-brand-bg">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-6 mt-4">
          <Text className="text-3xl font-bold text-brand-red">
            Transactions
          </Text>
        </View>

        {(pendingFinancialWrites.length > 0 || hiddenPendingCount > 0) && (
          <View
            className="mb-4 rounded-2xl border px-4 py-3"
            style={{
              backgroundColor: "#eff6ff",
              borderColor: "#93c5fd",
            }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 pr-3">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: "#1d4ed8" }}
                >
                  {pendingFinancialWrites.length + hiddenPendingCount} waiting
                  to sync
                </Text>
                {queueHeadBlockerMessage ? (
                  <Text className="mt-1 text-xs" style={{ color: "#1e40af" }}>
                    {queueHeadBlockerMessage}
                  </Text>
                ) : null}
              </View>
              {canRetryPendingItem(actionablePendingItem) && (
                <TouchableOpacity
                  onPress={handleRetryOldestPending}
                  className="rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: "#1d4ed8" }}
                >
                  <Text className="text-xs font-semibold text-white">
                    Retry
                  </Text>
                </TouchableOpacity>
              )}
              {canDismissPendingItem(actionablePendingItem) && (
                <TouchableOpacity
                  onPress={() => handleDismissItem(actionablePendingItem!)}
                  className="rounded-lg px-3 py-1.5"
                  style={{ backgroundColor: "#fee2e2" }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: "#b91c1c" }}
                  >
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {showQueueDiagnostics && queueHeadItem && (
          <View
            className="mb-4 rounded-2xl border px-4 py-3"
            style={{ backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: "#92400E" }}
            >
              Sync stalled
            </Text>
            <View className="mt-2 gap-1">
              <Text className="text-xs" style={{ color: "#92400E" }}>
                {getQueueEntityLabel(queueHeadItem)} ·{" "}
                {getTechnicalQueueStatusLabel(queueHeadItem.status)}
                {queueHeadItem.lastHttpStatus
                  ? ` · HTTP ${queueHeadItem.lastHttpStatus}`
                  : ""}
              </Text>
              {queueHeadItem.lastError ? (
                <Text className="text-xs" style={{ color: "#B45309" }}>
                  {queueHeadItem.lastError}
                </Text>
              ) : null}
            </View>

            {latestSyncError ? (
              <Text className="mt-2 text-xs" style={{ color: "#B45309" }}>
                Log: {getQueueEntityLabel(latestSyncError)}{" "}
                {getTechnicalQueueStatusLabel(latestSyncError.status)}
                {latestSyncError.httpStatus
                  ? ` (${latestSyncError.httpStatus})`
                  : ""}
                {` · ${latestSyncError.message}`}
              </Text>
            ) : null}

            {latestSyncHistoryItem ? (
              <Text className="mt-2 text-xs" style={{ color: "#B45309" }}>
                Last sync: {getQueueEntityLabel(latestSyncHistoryItem)} on{" "}
                {formatDate(latestSyncHistoryItem.archivedAt, "short")}
                {latestSyncHistoryItem.serverResponseSummary
                  ? ` · ${latestSyncHistoryItem.serverResponseSummary}`
                  : ""}
              </Text>
            ) : null}
          </View>
        )}

        {latestDeadLetterItem ? (
          <View
            className="mb-4 rounded-2xl border px-4 py-3"
            style={{ backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <Text
                className="flex-1 text-sm font-semibold"
                style={{ color: "#991B1B" }}
              >
                Queued item removed from sync
              </Text>
              <TouchableOpacity
                onPress={handleDismissDeadLetter}
                className="rounded-lg px-3 py-1.5"
                style={{ backgroundColor: "#FEE2E2" }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: "#B91C1C" }}
                >
                  Dismiss
                </Text>
              </TouchableOpacity>
            </View>
            <View className="mt-2 gap-1">
              <Text className="text-xs" style={{ color: "#991B1B" }}>
                {getQueueEntityLabel(latestDeadLetterItem)}
                {latestDeadLetterItem.lastHttpStatus
                  ? ` · HTTP ${latestDeadLetterItem.lastHttpStatus}`
                  : ""}
                {` · ${formatDate(latestDeadLetterItem.deadLetteredAt, "short")}`}
              </Text>
              <Text className="text-xs" style={{ color: "#B91C1C" }}>
                {latestDeadLetterItem.deadLetterReason}
              </Text>
              <Text className="text-xs" style={{ color: "#B91C1C" }}>
                This notice clears in {DEAD_LETTER_NOTICE_MAX_MINUTES} minutes.
              </Text>
              {deadLetters.length > 1 ? (
                <Text className="text-xs" style={{ color: "#B91C1C" }}>
                  {deadLetters.length - 1} more item
                  {deadLetters.length - 1 !== 1 ? "s" : ""} also removed.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Filter row */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-sm text-gray-500">
            {displayedRowCount} transaction
            {displayedRowCount !== 1 ? "s" : ""}
            {activeFilterCount > 0
              ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active`
              : ""}
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg border"
            style={{
              backgroundColor:
                showFilters || activeFilterCount > 0 ? "#FEF2F2" : "#FFFFFF",
              borderColor:
                showFilters || activeFilterCount > 0 ? "#DC2626" : "#E5E7EB",
            }}
          >
            <SlidersHorizontal
              size={16}
              color={
                showFilters || activeFilterCount > 0 ? "#DC2626" : "#9CA3AF"
              }
            />
            <Text
              className="text-xs font-medium ml-1"
              style={{
                color:
                  showFilters || activeFilterCount > 0 ? "#DC2626" : "#6B7280",
              }}
            >
              Filters
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible filter panel */}
        {showFilters && (
          <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
            {/* Transaction type */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Type
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {(
                [
                  "ALL",
                  "DEPOSIT",
                  "WITHDRAW",
                  "FLOAT_PURCHASE",
                  "CAPITAL_INJECTION",
                ] as TypeFilter[]
              ).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setFilterType(t)}
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: filterType === t ? "#DC2626" : "#F9FAFB",
                    borderColor: filterType === t ? "#DC2626" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: filterType === t ? "#FFFFFF" : "#374151" }}
                  >
                    {t === "ALL" ? "All" : getTypeLabel(t)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Shift */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Shift
            </Text>
            <View className="flex-row gap-2 mb-4">
              {(["ALL", "AM", "PM"] as ShiftFilter[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFilterShift(s)}
                  className="px-4 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: filterShift === s ? "#DC2626" : "#F9FAFB",
                    borderColor: filterShift === s ? "#DC2626" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{ color: filterShift === s ? "#FFFFFF" : "#374151" }}
                  >
                    {s === "ALL" ? "All Shifts" : s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Account */}
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Account
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-1"
            >
              <View className="flex-row gap-2 px-1 pb-1">
                <TouchableOpacity
                  onPress={() => setFilterAccountId(undefined)}
                  className="px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor:
                      filterAccountId === undefined ? "#DC2626" : "#F9FAFB",
                    borderColor:
                      filterAccountId === undefined ? "#DC2626" : "#E5E7EB",
                  }}
                >
                  <Text
                    className="text-xs font-medium"
                    style={{
                      color:
                        filterAccountId === undefined ? "#FFFFFF" : "#374151",
                    }}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {accounts.map((acc) => (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() =>
                      setFilterAccountId(
                        filterAccountId === acc.id ? undefined : acc.id,
                      )
                    }
                    className="px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor:
                        filterAccountId === acc.id ? "#DC2626" : "#F9FAFB",
                      borderColor:
                        filterAccountId === acc.id ? "#DC2626" : "#E5E7EB",
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color:
                          filterAccountId === acc.id ? "#FFFFFF" : "#374151",
                      }}
                    >
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setFilterType("ALL");
                  setFilterShift("ALL");
                  setFilterAccountId(undefined);
                }}
                className="mt-3 self-end"
              >
                <Text className="text-xs text-red-500 font-medium">
                  Clear filters
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <Text className="text-lg font-bold text-brand-red mb-4">
            Recent Activity
          </Text>

          {transactions.length === 0 && pendingRows.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-400">
                {hiddenPendingCount > 0
                  ? "Pending transactions are hidden by the active shift filter"
                  : "No transactions yet"}
              </Text>
            </View>
          ) : (
            <>
              {pendingRows.map((row) => {
                const badgeColors = getTypeBadgeColors(row.displayType);
                return (
                  <View
                    key={`pending-${row.id}`}
                    className="border-b border-gray-100 py-4 flex-row justify-between items-center"
                  >
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center mb-1">
                        <Text className="font-bold text-gray-700 mr-2">
                          {row.accountLabel}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {formatDate(row.transactionTime, "short")}
                        </Text>
                      </View>
                      {row.reference ? (
                        <Text className="text-gray-600 font-medium">
                          {row.reference}
                        </Text>
                      ) : null}
                      {row.notes ? (
                        <Text className="text-xs text-gray-400 mt-0.5">
                          {row.notes}
                        </Text>
                      ) : null}
                      <View
                        className="self-start px-2 py-0.5 rounded mt-1"
                        style={{ backgroundColor: badgeColors.bg }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: badgeColors.text }}
                        >
                          {getTypeLabel(row.displayType)}
                        </Text>
                      </View>
                      <View
                        className="self-start px-2 py-0.5 rounded mt-1"
                        style={{ backgroundColor: row.statusColors.bg }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: row.statusColors.text }}
                        >
                          {row.statusLabel}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text
                        className="font-bold text-base"
                        style={{ color: getAmountColor(row.displayType) }}
                      >
                        {getAmountPrefix(row.displayType)}
                        {formatCurrency(Math.abs(row.amount))}
                      </Text>
                      {row.canRetry && (
                        <TouchableOpacity
                          onPress={handleRetryOldestPending}
                          className="mt-2 px-2 py-1 rounded"
                          style={{ backgroundColor: "#DBEAFE" }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: "#1D4ED8" }}
                          >
                            Retry
                          </Text>
                        </TouchableOpacity>
                      )}
                      {row.canDismiss && (
                        <TouchableOpacity
                          onPress={() =>
                            handleDismissItem(
                              pendingFinancialWrites.find(
                                (i) => i.id === row.id,
                              )!,
                            )
                          }
                          className="mt-2 px-2 py-1 rounded"
                          style={{ backgroundColor: "#FEE2E2" }}
                        >
                          <Text
                            className="text-xs font-medium"
                            style={{ color: "#B91C1C" }}
                          >
                            Remove
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {transactions.map((tx: Transaction, idx: number) => {
                const badgeColors = getTypeBadgeColors(tx.transactionType);
                return (
                  <View
                    key={tx.id || `tx-${idx}`}
                    className="border-b border-gray-100 py-4 flex-row justify-between items-center"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center mb-1">
                        <Text className="font-bold text-gray-700 mr-2">
                          {tx.account?.name || `Acct #${tx.accountId}`}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {formatDate(tx.transactionTime, "short")} · {tx.shift}
                        </Text>
                      </View>
                      {tx.reference ? (
                        <Text className="text-gray-600 font-medium">
                          {tx.reference}
                        </Text>
                      ) : null}
                      {tx.notes ? (
                        <Text className="text-xs text-gray-400 mt-0.5">
                          {tx.notes}
                        </Text>
                      ) : null}
                      <View
                        className="self-start px-2 py-0.5 rounded mt-1"
                        style={{ backgroundColor: badgeColors.bg }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{ color: badgeColors.text }}
                        >
                          {getTypeLabel(tx.transactionType)}
                        </Text>
                      </View>
                      {!tx.isConfirmed && (
                        <View className="self-start bg-yellow-100 px-2 py-0.5 rounded mt-1">
                          <Text className="text-xs font-medium text-yellow-700">
                            ⚠ Unconfirmed
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="items-end">
                      <Text
                        className="font-bold text-base"
                        style={{ color: getAmountColor(tx.transactionType) }}
                      >
                        {getAmountPrefix(tx.transactionType)}
                        {formatCurrency(Math.abs(tx.amount))}
                      </Text>
                      {tx.expectedCommission && (
                        <Text className="text-xs text-purple-600 mt-0.5">
                          Commission:{" "}
                          {formatCurrency(
                            tx.expectedCommission.commissionAmount,
                          )}
                        </Text>
                      )}
                      {!tx.reconciliationId && !tx.floatSource && (
                        <TouchableOpacity
                          onPress={() => handleReverse(tx)}
                          disabled={isReversing}
                          className="flex-row items-center mt-2 px-2 py-1 rounded"
                          style={{ backgroundColor: "#FEF2F2" }}
                        >
                          <RotateCcw size={12} color="#DC2626" />
                          <Text className="text-xs font-medium text-red-600 ml-1">
                            Reverse
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Capital Injection FAB — visible for non-Agent roles only */}
      {canInjectCapital && (
        <TouchableOpacity
          onPress={() => setShowInjectionModal(true)}
          className="absolute w-14 h-14 rounded-full items-center justify-center"
          style={{
            right: 88,
            bottom: insets.bottom + 80,
            backgroundColor: "#0d9488",
            elevation: 8,
            shadowColor: "#0d9488",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          }}
        >
          <Wallet color="white" size={24} />
        </TouchableOpacity>
      )}

      {/* Add Transaction FAB */}
      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        className="absolute right-5 w-14 h-14 bg-brand-red rounded-full items-center justify-center"
        style={{
          bottom: insets.bottom + 80,
          elevation: 8,
          shadowColor: "#DC2626",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>

      <ActionModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Transaction"
      >
        <AddTransactionForm
          onSuccess={handleFormSuccess}
          onClose={() => setIsModalOpen(false)}
          visible={isModalOpen}
        />
      </ActionModal>

      {/* Capital Injection Modal */}
      <ActionModal
        visible={showInjectionModal}
        onClose={() => {
          setShowInjectionModal(false);
          setInjectionForm({
            injectionType: "FLOAT",
            accountId: undefined,
            amount: "",
            reference: "",
            notes: "",
          });
        }}
        title="Capital Injection"
      >
        <View className="px-4 pb-6">
          <Text className="text-xs text-gray-500 mb-4">
            Record additional capital being injected into the business.
          </Text>

          {/* Injection type toggle */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Injection Type *
          </Text>
          <View className="flex-row gap-2 mb-4">
            {(["FLOAT", "CASH"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() =>
                  setInjectionForm((f) => ({
                    ...f,
                    injectionType: t,
                    accountId: undefined,
                  }))
                }
                className="flex-1 py-2.5 rounded-xl border items-center"
                style={{
                  backgroundColor:
                    injectionForm.injectionType === t ? "#0d9488" : "#F9FAFB",
                  borderColor:
                    injectionForm.injectionType === t ? "#0d9488" : "#E5E7EB",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color:
                      injectionForm.injectionType === t ? "#FFFFFF" : "#374151",
                  }}
                >
                  {t === "FLOAT" ? "E-Float Account" : "Cash (Physical)"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Account picker — only for float injections */}
          {injectionForm.injectionType === "FLOAT" && (
            <>
              <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Account *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                <View className="flex-row gap-2 pb-1">
                  {accounts
                    .filter((a: Account) => a.isActive)
                    .map((acc: Account) => (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() =>
                          setInjectionForm((f) => ({ ...f, accountId: acc.id }))
                        }
                        className="px-3 py-2 rounded-xl border"
                        style={{
                          backgroundColor:
                            injectionForm.accountId === acc.id
                              ? "#0d9488"
                              : "#F9FAFB",
                          borderColor:
                            injectionForm.accountId === acc.id
                              ? "#0d9488"
                              : "#E5E7EB",
                        }}
                      >
                        <Text
                          className="text-sm font-medium"
                          style={{
                            color:
                              injectionForm.accountId === acc.id
                                ? "#FFFFFF"
                                : "#374151",
                          }}
                        >
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </ScrollView>
            </>
          )}

          {/* Amount */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Amount *
          </Text>
          <TextInput
            value={formatAmountInput(injectionForm.amount)}
            onChangeText={(v) => {
              const clean = parseAmountInput(v);
              if (clean !== null)
                setInjectionForm((f) => ({ ...f, amount: clean }));
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-white mb-4"
          />

          {/* Reference */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Reference
          </Text>
          <TextInput
            value={injectionForm.reference}
            onChangeText={(v) =>
              setInjectionForm((f) => ({ ...f, reference: v }))
            }
            placeholder="Optional reference"
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-white mb-4"
          />

          {/* Notes */}
          <Text className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Notes
          </Text>
          <TextInput
            value={injectionForm.notes}
            onChangeText={(v) => setInjectionForm((f) => ({ ...f, notes: v }))}
            placeholder="Optional notes"
            multiline
            numberOfLines={3}
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-800 bg-white mb-6"
            style={{ textAlignVertical: "top", minHeight: 80 }}
          />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleCreateCapitalInjection}
            disabled={
              isSubmittingInjection ||
              !injectionForm.amount ||
              (injectionForm.injectionType === "FLOAT" &&
                !injectionForm.accountId)
            }
            className="py-4 rounded-xl items-center"
            style={{
              backgroundColor:
                isSubmittingInjection ||
                !injectionForm.amount ||
                (injectionForm.injectionType === "FLOAT" &&
                  !injectionForm.accountId)
                  ? "#99f6e4"
                  : "#0d9488",
            }}
          >
            <Text className="text-white font-semibold text-base">
              {isSubmittingInjection ? "Recording..." : "Record Injection"}
            </Text>
          </TouchableOpacity>
        </View>
      </ActionModal>
    </View>
  );
}
