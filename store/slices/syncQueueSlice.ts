/**
 * Sync Queue Slice
 *
 * Manages a persistent queue of mutations (creates/updates/deletes) that were
 * made while offline. Items are processed FIFO by the sync engine when
 * connectivity is restored.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const MAX_RECENT_HISTORY = 50;
const MAX_ERROR_LOG = 100;
const MAX_DEAD_LETTER_ITEMS = 50;

// Supported entity types for offline writes
export type SyncEntityType =
  | "balance"
  | "balanceBulk"
  | "commission"
  | "commissionBulk"
  | "expense"
  | "cashCount"
  | "cashCountBulk"
  | "transaction"
  | "floatPurchase"
  | "capitalInjection"
  | "cashCapitalInjection"
  | "reconciliation";

export type SyncMethod = "POST" | "PATCH" | "DELETE";

export type SyncQueueItemStatus =
  | "pending"
  | "syncing"
  | "awaiting_confirmation"
  | "failed"
  | "blocked";

export interface QueueItem {
  /** Unique identifier (UUID-like) */
  id: string;
  /** Stable client-side mutation identifier for support/debug tracing */
  clientMutationId: string;
  /** Optional server-side replay key used to confirm ambiguous outcomes */
  idempotencyKey?: string;
  /** Which entity type this mutation targets */
  entityType: SyncEntityType;
  /** HTTP method */
  method: SyncMethod;
  /** API endpoint to call */
  endpoint: string;
  /** JSON-serializable payload (already mapped to snake_case) */
  payload: Record<string, unknown> | null;
  /** ISO timestamp of when the item was queued */
  createdAt: string;
  /** ISO timestamp of the last sync attempt */
  lastAttemptAt: string | null;
  /** ISO timestamp of a confirmed sync */
  syncedAt: string | null;
  /** ISO timestamp of the latest non-success outcome */
  failureAt: string | null;
  /** Number of sync attempts so far */
  retryCount: number;
  /** Current processing status */
  status: SyncQueueItemStatus;
  /** Last error message if failed */
  lastError?: string;
  /** Last HTTP status captured from the sync attempt */
  lastHttpStatus?: number;
  /** Optional record id recovered from a successful server response */
  serverRecordId?: string | number | null;
  /** Short text summary of the latest server-confirmed outcome */
  serverResponseSummary?: string | null;
  /** Local image URIs that need uploading before/with this item */
  localImageUris?: string[];
}

export interface SyncHistoryItem extends Omit<QueueItem, "status"> {
  status: "synced";
  archivedAt: string;
}

export interface SyncDeadLetterItem extends Omit<QueueItem, "status"> {
  status: "dead_letter";
  deadLetteredAt: string;
  deadLetterReason: string;
}

export interface SyncErrorLogEntry {
  id: string;
  queueItemId: string;
  clientMutationId: string;
  entityType: SyncEntityType;
  endpoint: string;
  status: SyncQueueItemStatus;
  message: string;
  timestamp: string;
  httpStatus?: number;
}

interface AddToQueuePayload {
  clientMutationId?: string;
  idempotencyKey?: string;
  entityType: SyncEntityType;
  method: SyncMethod;
  endpoint: string;
  payload: Record<string, unknown> | null;
  localImageUris?: string[];
}

interface QueueOutcomePayload {
  id: string;
  status: Extract<
    SyncQueueItemStatus,
    "awaiting_confirmation" | "failed" | "blocked"
  >;
  error: string;
  httpStatus?: number;
}

interface ArchiveSyncedPayload {
  id: string;
  httpStatus?: number;
  serverRecordId?: string | number | null;
  serverResponseSummary?: string | null;
}

interface AppendErrorLogPayload {
  id: string;
  status?: SyncQueueItemStatus;
  message: string;
  httpStatus?: number;
}

interface DeadLetterQueueItemPayload {
  id: string;
  reason: string;
  httpStatus?: number;
}

interface PruneDeadLettersPayload {
  cutoffIso: string;
}

export interface SyncQueueState {
  items: QueueItem[];
  recentHistory: SyncHistoryItem[];
  deadLetters: SyncDeadLetterItem[];
  errorLog: SyncErrorLogEntry[];
  /** Whether the sync engine is currently processing */
  isSyncing: boolean;
  /** Timestamp of the latest confirmed successful sync outcome */
  lastSyncedAt: string | null;
}

const initialState: SyncQueueState = {
  items: [],
  recentHistory: [],
  deadLetters: [],
  errorLog: [],
  isSyncing: false,
  lastSyncedAt: null,
};

/** Generate a simple unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function pushErrorLogEntry(
  state: SyncQueueState,
  item: QueueItem,
  message: string,
  status: SyncQueueItemStatus,
  httpStatus?: number,
): void {
  const latestEntry = state.errorLog[0];
  if (
    latestEntry &&
    latestEntry.queueItemId === item.id &&
    latestEntry.status === status &&
    latestEntry.message === message &&
    latestEntry.httpStatus === httpStatus
  ) {
    return;
  }

  state.errorLog.unshift({
    id: generateId(),
    queueItemId: item.id,
    clientMutationId: item.clientMutationId,
    entityType: item.entityType,
    endpoint: item.endpoint,
    status,
    message,
    timestamp: new Date().toISOString(),
    httpStatus,
  });
  state.errorLog = state.errorLog.slice(0, MAX_ERROR_LOG);
}

const syncQueueSlice = createSlice({
  name: "syncQueue",
  initialState,
  reducers: {
    /** Add a new item to the sync queue */
    addToQueue(state, action: PayloadAction<AddToQueuePayload>) {
      const queueId = generateId();
      state.items.push({
        ...action.payload,
        id: queueId,
        clientMutationId: action.payload.clientMutationId ?? queueId,
        createdAt: new Date().toISOString(),
        lastAttemptAt: null,
        syncedAt: null,
        failureAt: null,
        retryCount: 0,
        status: "pending",
        serverRecordId: null,
        serverResponseSummary: null,
      });
    },

    /** Mark an item as currently being synced */
    markSyncing(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.status = "syncing";
        item.lastAttemptAt = new Date().toISOString();
        item.lastError = undefined;
      }
    },

    /** Archive an item after a confirmed successful sync */
    archiveSyncedItem(state, action: PayloadAction<ArchiveSyncedPayload>) {
      const itemIndex = state.items.findIndex(
        (i) => i.id === action.payload.id,
      );
      if (itemIndex === -1) {
        return;
      }

      const archivedAt = new Date().toISOString();
      const item = state.items[itemIndex];
      const historyItem: SyncHistoryItem = {
        ...item,
        status: "synced",
        syncedAt: archivedAt,
        lastHttpStatus: action.payload.httpStatus,
        serverRecordId: action.payload.serverRecordId ?? item.serverRecordId,
        serverResponseSummary:
          action.payload.serverResponseSummary ?? item.serverResponseSummary,
        archivedAt,
      };

      state.items.splice(itemIndex, 1);
      state.recentHistory.unshift(historyItem);
      state.recentHistory = state.recentHistory.slice(0, MAX_RECENT_HISTORY);
      state.lastSyncedAt = archivedAt;
    },

    /** Mark an item with a non-success sync outcome */
    markQueueOutcome(state, action: PayloadAction<QueueOutcomePayload>) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.status = action.payload.status;
        item.retryCount += 1;
        item.lastError = action.payload.error;
        item.lastHttpStatus = action.payload.httpStatus;
        item.failureAt = new Date().toISOString();
        pushErrorLogEntry(
          state,
          item,
          action.payload.error,
          action.payload.status,
          action.payload.httpStatus,
        );
      }
    },

    /** Reset a failed item back to pending for retry */
    resetToPending(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.status = "pending";
      }
    },

    /** Recover in-flight items after app termination or restart */
    recoverSyncingItems(state) {
      const recoveredAt = new Date().toISOString();
      state.items.forEach((item) => {
        if (item.status === "syncing") {
          item.status = "awaiting_confirmation";
          item.failureAt = recoveredAt;
          item.lastError =
            item.lastError ??
            "Sync was interrupted before confirmation was received.";
          pushErrorLogEntry(
            state,
            item,
            item.lastError,
            "awaiting_confirmation",
            item.lastHttpStatus,
          );
        }
      });
    },

    appendErrorLog(state, action: PayloadAction<AppendErrorLogPayload>) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (!item) {
        return;
      }

      pushErrorLogEntry(
        state,
        item,
        action.payload.message,
        action.payload.status ?? item.status,
        action.payload.httpStatus ?? item.lastHttpStatus,
      );
    },

    /** Remove a definitively failed non-critical item from the active queue */
    deadLetterQueueItem(
      state,
      action: PayloadAction<DeadLetterQueueItemPayload>,
    ) {
      const itemIndex = state.items.findIndex((i) => i.id === action.payload.id);
      if (itemIndex === -1) {
        return;
      }

      const deadLetteredAt = new Date().toISOString();
      const item = state.items[itemIndex];
      const deadLetterItem: SyncDeadLetterItem = {
        ...item,
        retryCount: item.retryCount + 1,
        status: "dead_letter",
        failureAt: deadLetteredAt,
        lastError: action.payload.reason,
        lastHttpStatus: action.payload.httpStatus ?? item.lastHttpStatus,
        deadLetteredAt,
        deadLetterReason: action.payload.reason,
      };

      pushErrorLogEntry(
        state,
        item,
        action.payload.reason,
        "failed",
        action.payload.httpStatus ?? item.lastHttpStatus,
      );

      state.items.splice(itemIndex, 1);
      state.deadLetters.unshift(deadLetterItem);
      state.deadLetters = state.deadLetters.slice(0, MAX_DEAD_LETTER_ITEMS);
    },

    dismissDeadLetterItem(state, action: PayloadAction<string>) {
      state.deadLetters = state.deadLetters.filter(
        (item) => item.id !== action.payload,
      );
    },

    pruneDeadLetters(state, action: PayloadAction<PruneDeadLettersPayload>) {
      const cutoff = Date.parse(action.payload.cutoffIso);
      if (Number.isNaN(cutoff)) {
        return;
      }

      state.deadLetters = state.deadLetters.filter((item) => {
        const deadLetteredAt = Date.parse(item.deadLetteredAt);
        return Number.isNaN(deadLetteredAt) || deadLetteredAt >= cutoff;
      });
    },

    /** Set syncing flag */
    setSyncing(state, action: PayloadAction<boolean>) {
      state.isSyncing = action.payload;
    },

    /** Update last synced timestamp */
    setLastSyncedAt(state, action: PayloadAction<string>) {
      state.lastSyncedAt = action.payload;
    },

    /** Clear all failed items (manual user action) */
    clearFailedItems(state) {
      state.items = state.items.filter((i) => i.status !== "failed");
    },

    /** Dismiss a single queue item by ID (only safe for definitively-rejected items) */
    dismissQueueItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },

    /** Clear recent synced history (manual user action or logout) */
    clearRecentHistory(state) {
      state.recentHistory = [];
    },

    /** Clear entire queue (e.g., on logout) */
    clearQueue(state) {
      state.items = [];
      state.recentHistory = [];
      state.deadLetters = [];
      state.errorLog = [];
      state.isSyncing = false;
      state.lastSyncedAt = null;
    },
  },
});

export const {
  addToQueue,
  markSyncing,
  archiveSyncedItem,
  markQueueOutcome,
  resetToPending,
  recoverSyncingItems,
  appendErrorLog,
  deadLetterQueueItem,
  dismissDeadLetterItem,
  pruneDeadLetters,
  setSyncing,
  setLastSyncedAt,
  clearFailedItems,
  clearRecentHistory,
  clearQueue,
  dismissQueueItem,
} = syncQueueSlice.actions;

export default syncQueueSlice.reducer;

// Selectors
export const selectPendingCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.filter((i) => i.status === "pending").length;

export const selectFailedCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.filter((i) => i.status === "failed").length;

export const selectAwaitingConfirmationCount = (state: {
  syncQueue: SyncQueueState;
}) =>
  state.syncQueue.items.filter((i) => i.status === "awaiting_confirmation")
    .length;

export const selectBlockedCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.filter((i) => i.status === "blocked").length;

export const selectNeedsAttentionCount = (state: {
  syncQueue: SyncQueueState;
}) =>
  state.syncQueue.items.filter(
    (i) =>
      i.status === "awaiting_confirmation" ||
      i.status === "failed" ||
      i.status === "blocked",
  ).length + state.syncQueue.deadLetters.length;

export const selectOutstandingSyncCount = (state: {
  syncQueue: SyncQueueState;
}) =>
  state.syncQueue.items.filter(
    (i) =>
      i.status === "pending" ||
      i.status === "syncing" ||
      i.status === "awaiting_confirmation" ||
      i.status === "blocked",
  ).length;

export const selectTotalQueueCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.length;

export const selectIsSyncing = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.isSyncing;

export const selectNextPendingItem = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.find(
    (i) => i.status === "pending" || i.status === "failed",
  ) ?? null;

export const selectQueueItems = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items;

export const selectSyncErrorLog = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.errorLog;

export const selectRecentSyncHistory = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.recentHistory;

export const selectDeadLetterItems = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.deadLetters;

export const selectDeadLetterCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.deadLetters.length;
