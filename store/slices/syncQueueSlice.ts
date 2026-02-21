/**
 * Sync Queue Slice
 *
 * Manages a persistent queue of mutations (creates/updates/deletes) that were
 * made while offline. Items are processed FIFO by the sync engine when
 * connectivity is restored.
 */

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Supported entity types for offline writes
export type SyncEntityType =
  | "balance"
  | "balanceBulk"
  | "commission"
  | "commissionBulk"
  | "expense"
  | "cashCount"
  | "cashCountBulk"
  | "reconciliation";

export type SyncMethod = "POST" | "PATCH" | "DELETE";

export interface QueueItem {
  /** Unique identifier (UUID-like) */
  id: string;
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
  /** Number of sync attempts so far */
  retryCount: number;
  /** Current processing status */
  status: "pending" | "syncing" | "failed";
  /** Last error message if failed */
  lastError?: string;
  /** Local image URIs that need uploading before/with this item */
  localImageUris?: string[];
}

export interface SyncQueueState {
  items: QueueItem[];
  /** Whether the sync engine is currently processing */
  isSyncing: boolean;
  /** Timestamp of last successful full sync */
  lastSyncedAt: string | null;
}

const initialState: SyncQueueState = {
  items: [],
  isSyncing: false,
  lastSyncedAt: null,
};

/** Generate a simple unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const syncQueueSlice = createSlice({
  name: "syncQueue",
  initialState,
  reducers: {
    /** Add a new item to the sync queue */
    addToQueue(
      state,
      action: PayloadAction<
        Omit<QueueItem, "id" | "createdAt" | "retryCount" | "status">
      >,
    ) {
      state.items.push({
        ...action.payload,
        id: generateId(),
        createdAt: new Date().toISOString(),
        retryCount: 0,
        status: "pending",
      });
    },

    /** Mark an item as currently being synced */
    markSyncing(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.status = "syncing";
      }
    },

    /** Remove an item after successful sync */
    removeFromQueue(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },

    /** Mark an item as failed and increment retry count */
    markFailed(state, action: PayloadAction<{ id: string; error: string }>) {
      const item = state.items.find((i) => i.id === action.payload.id);
      if (item) {
        item.status = "failed";
        item.retryCount += 1;
        item.lastError = action.payload.error;
      }
    },

    /** Reset a failed item back to pending for retry */
    resetToPending(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) {
        item.status = "pending";
      }
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

    /** Clear entire queue (e.g., on logout) */
    clearQueue(state) {
      state.items = [];
      state.isSyncing = false;
    },
  },
});

export const {
  addToQueue,
  markSyncing,
  removeFromQueue,
  markFailed,
  resetToPending,
  setSyncing,
  setLastSyncedAt,
  clearFailedItems,
  clearQueue,
} = syncQueueSlice.actions;

export default syncQueueSlice.reducer;

// Selectors
export const selectPendingCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.filter((i) => i.status === "pending").length;

export const selectFailedCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.filter((i) => i.status === "failed").length;

export const selectTotalQueueCount = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.length;

export const selectIsSyncing = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.isSyncing;

export const selectNextPendingItem = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items.find((i) => i.status === "pending") ?? null;

export const selectQueueItems = (state: { syncQueue: SyncQueueState }) =>
  state.syncQueue.items;
