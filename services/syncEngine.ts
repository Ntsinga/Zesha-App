/**
 * Sync Engine Service
 *
 * Orchestrates background synchronization of offline mutations when connectivity
 * is restored. Processes the sync queue in FIFO order with exponential backoff.
 *
 * This is a module-level service (not a React hook) that interacts with the
 * Redux store directly and listens to NetInfo for connectivity transitions.
 */

import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { AppState, AppStateStatus } from "react-native";
import { store } from "@/store";
import {
  archiveSyncedItem,
  appendErrorLog,
  markSyncing,
  markQueueOutcome,
  recoverSyncingItems,
  setSyncing,
  setLastSyncedAt,
  type QueueItem,
  type SyncQueueItemStatus,
} from "@/store/slices/syncQueueSlice";
import { secureApiRequest, isSecureApiInitialized } from "@/services/secureApi";
import { readImageAsBase64, deleteLocalImage } from "@/utils/localImageStore";
import { captureSyncStall, addSyncBreadcrumb } from "@/config/sentry";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 500; // 500ms
const MAX_DELAY_MS = 8_000; // 8 seconds
const RECOVERY_POLL_MS = 30_000;

// Transient HTTP status codes worth retrying
const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

type ProcessItemResult =
  | "synced"
  | "retryable_failure"
  | "failed"
  | "blocked"
  | "awaiting_confirmation";

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let netInfoUnsubscribe: (() => void) | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null =
  null;
let recoveryInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;
let isStarted = false;
let currentAppState: AppStateStatus = AppState.currentState;

// ---------------------------------------------------------------------------
// Backoff helpers
// ---------------------------------------------------------------------------

/** Calculate delay with exponential backoff + jitter, capped at MAX_DELAY_MS */
function getBackoffDelay(retryCount: number): number {
  const exponential = BASE_DELAY_MS * Math.pow(2, retryCount);
  const capped = Math.min(exponential, MAX_DELAY_MS);
  // Add ±25% jitter to avoid thundering herd
  const jitter = capped * (0.75 + Math.random() * 0.5);
  return Math.round(jitter);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Image upload helpers
// ---------------------------------------------------------------------------

/**
 * Resolve local image URIs to base64 strings for inclusion in the API payload.
 * Returns a map of original URI → base64 data.
 */
async function resolveLocalImages(
  uris: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const uri of uris) {
    try {
      const base64 = await readImageAsBase64(uri);
      map.set(uri, base64);
    } catch {
      // If image read fails, skip it — server will handle missing image gracefully
      if (__DEV__) {
        console.warn(`[SyncEngine] Failed to read image: ${uri}`);
      }
    }
  }
  return map;
}

/**
 * Inject base64 image data into the payload.
 * Convention: the payload field `image_data` will receive the base64 string
 * from the first local image URI. For bulk endpoints, `images` array is replaced.
 */
function injectImagesIntoPayload(
  payload: Record<string, unknown> | null,
  imageMap: Map<string, string>,
  localImageUris: string[],
): Record<string, unknown> | null {
  if (!payload || imageMap.size === 0) return payload;

  const updated = { ...payload };

  if (localImageUris.length === 1) {
    // Single image → inject into image_data field
    const base64 = imageMap.get(localImageUris[0]);
    if (base64) {
      updated.image_data = base64;
    }
  } else if (localImageUris.length > 1) {
    // Multiple images → inject as array
    updated.images = localImageUris
      .map((uri) => imageMap.get(uri))
      .filter(Boolean);
  }

  return updated;
}

function injectIdempotencyKey(
  payload: Record<string, unknown> | null,
  idempotencyKey?: string,
): Record<string, unknown> | null {
  if (!payload || !idempotencyKey) {
    return payload;
  }

  if (typeof payload.idempotency_key === "string" && payload.idempotency_key) {
    return payload;
  }

  return {
    ...payload,
    idempotency_key: idempotencyKey,
  };
}

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

/**
 * Process a single queue item — make the API call and handle the result.
 * Returns the resulting sync outcome for queue control flow.
 */
function extractServerRecordId(response: unknown): string | number | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  if ("id" in response) {
    const value = response.id;
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  if ("reconciliationId" in response) {
    const value = response.reconciliationId;
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return null;
}

function summarizeResponse(response: unknown): string | null {
  if (!response || typeof response !== "object") {
    return "Synced successfully";
  }

  if ("message" in response && typeof response.message === "string") {
    return response.message;
  }

  if ("status" in response && typeof response.status === "string") {
    return `Synced (${response.status})`;
  }

  return "Synced successfully";
}

function hasReplayKey(item: QueueItem): boolean {
  if (
    typeof item.idempotencyKey === "string" &&
    item.idempotencyKey.length > 0
  ) {
    return true;
  }

  return (
    typeof item.payload?.idempotency_key === "string" &&
    item.payload.idempotency_key.length > 0
  );
}

function isOnlineState(
  state: Pick<NetInfoState, "isConnected" | "isInternetReachable">,
): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

function canAutoRetryFailedItem(item: QueueItem): boolean {
  return (
    item.status === "failed" &&
    typeof item.lastHttpStatus === "number" &&
    RETRY_STATUS_CODES.has(item.lastHttpStatus) &&
    item.retryCount < MAX_RETRIES
  );
}

function isInFlightIdempotentConflict(
  status: number,
  errorMessage: string,
  item: QueueItem,
): boolean {
  return (
    status === 409 &&
    hasReplayKey(item) &&
    errorMessage.toLowerCase().includes("already being processed")
  );
}

function isProcessableItem(item: QueueItem): boolean {
  return (
    item.status === "pending" ||
    canAutoRetryFailedItem(item) ||
    (item.status === "awaiting_confirmation" && hasReplayKey(item))
  );
}

function hasRecoverableQueueHead(): boolean {
  const state = store.getState();
  const queueHead = state.syncQueue.items[0] as QueueItem | undefined;
  return !!queueHead && isProcessableItem(queueHead);
}

async function processItem(item: QueueItem): Promise<ProcessItemResult> {
  const dispatch = store.dispatch;

  // Mark item as syncing
  dispatch(markSyncing(item.id));

  try {
    // 1. Resolve local images if any
    let finalPayload = injectIdempotencyKey(item.payload, item.idempotencyKey);
    if (item.localImageUris && item.localImageUris.length > 0) {
      const imageMap = await resolveLocalImages(item.localImageUris);
      finalPayload = injectImagesIntoPayload(
        finalPayload,
        imageMap,
        item.localImageUris,
      );
    }

    // 2. Build request options
    const options: RequestInit = {
      method: item.method,
    };

    if (finalPayload && (item.method === "POST" || item.method === "PATCH")) {
      options.body = JSON.stringify(finalPayload);
    }

    // 3. Make authenticated API call
    const response = await secureApiRequest<unknown>(item.endpoint, options);

    // 4. Success — remove from queue and clean up local images
    dispatch(
      archiveSyncedItem({
        id: item.id,
        httpStatus: 200,
        serverRecordId: extractServerRecordId(response),
        serverResponseSummary: summarizeResponse(response),
      }),
    );
    addSyncBreadcrumb("Item synced", {
      entityType: item.entityType,
      endpoint: item.endpoint,
    });

    if (item.localImageUris && item.localImageUris.length > 0) {
      for (const uri of item.localImageUris) {
        try {
          await deleteLocalImage(uri);
        } catch {
          // Non-critical — orphaned images will be cleaned up later
        }
      }
    }

    return "synced";
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown sync error";
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : 0;

    // Don't retry auth errors — user needs to re-authenticate
    if (status === 401 || status === 403) {
      dispatch(
        markQueueOutcome({
          id: item.id,
          status: "blocked",
          error: `Auth error (${status}): ${errorMessage}`,
          httpStatus: status,
        }),
      );
      captureSyncStall({
        entityType: item.entityType,
        endpoint: item.endpoint,
        method: item.method,
        status: "blocked",
        httpStatus: status,
        error: errorMessage,
        retryCount: item.retryCount,
        queueItemId: item.id,
        idempotencyKey: item.idempotencyKey,
      });
      return "blocked";
    }

    if (status === 0) {
      dispatch(
        markQueueOutcome({
          id: item.id,
          status: "awaiting_confirmation",
          error: errorMessage,
          httpStatus: status,
        }),
      );
      return "awaiting_confirmation";
    }

    if (isInFlightIdempotentConflict(status, errorMessage, item)) {
      dispatch(
        markQueueOutcome({
          id: item.id,
          status: "awaiting_confirmation",
          error: errorMessage,
          httpStatus: status,
        }),
      );
      return "awaiting_confirmation";
    }

    // Check if we should retry
    const isRetryable = RETRY_STATUS_CODES.has(status);
    const canRetry = item.retryCount < MAX_RETRIES - 1; // -1 because markFailed increments

    if (isRetryable && canRetry) {
      dispatch(
        markQueueOutcome({
          id: item.id,
          status: "failed",
          error: errorMessage,
          httpStatus: status,
        }),
      );
      // Delay before next item (backoff for this item's next attempt)
      await delay(getBackoffDelay(item.retryCount));
      return "retryable_failure";
    } else {
      // Max retries exceeded or non-retryable error → mark permanently failed
      dispatch(
        markQueueOutcome({
          id: item.id,
          status: "failed",
          error: `Permanent failure after ${item.retryCount + 1} attempts: ${errorMessage}`,
          httpStatus: status,
        }),
      );
      captureSyncStall({
        entityType: item.entityType,
        endpoint: item.endpoint,
        method: item.method,
        status: "failed",
        httpStatus: status,
        error: errorMessage,
        retryCount: item.retryCount + 1,
        queueItemId: item.id,
        idempotencyKey: item.idempotencyKey,
      });
      return "failed";
    }
  }
}

/**
 * Process all pending items in the queue sequentially (FIFO).
 * Stops early if connectivity is lost or all items are processed.
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;

  const dispatch = store.dispatch;
  dispatch(recoverSyncingItems());

  // Pre-check: is secure API initialized?
  if (!isSecureApiInitialized()) {
    if (__DEV__) {
      console.warn("[SyncEngine] Secure API not initialized, skipping sync");
    }
    return;
  }

  // Pre-check: is there anything to sync?
  const state = store.getState();
  const pendingItems = state.syncQueue.items[0]
    ? [state.syncQueue.items[0]].filter((i: QueueItem) => isProcessableItem(i))
    : [];

  if (pendingItems.length === 0) return;

  isProcessing = true;
  dispatch(setSyncing(true));

  try {
    // Re-read items each iteration so we pick up status changes
    let hasMore = true;
    while (hasMore) {
      // Check connectivity before each item
      const netState = await NetInfo.fetch();
      if (!isOnlineState(netState)) {
        if (__DEV__) {
          console.warn("[SyncEngine] Lost connectivity, pausing sync");
        }
        break;
      }

      // Respect FIFO ordering. Blocked items stop the queue, but ambiguous items
      // should be retried in place so the backend can confirm them idempotently.
      const currentState = store.getState();
      const nextItem = currentState.syncQueue.items[0] as QueueItem | undefined;

      if (!nextItem || !isProcessableItem(nextItem)) {
        if (
          nextItem?.status === "awaiting_confirmation" &&
          !hasReplayKey(nextItem)
        ) {
          dispatch(
            appendErrorLog({
              id: nextItem.id,
              status: "awaiting_confirmation",
              message:
                "This queued item cannot be auto-confirmed because it was saved without an idempotency key.",
            }),
          );
        }
        hasMore = false;
        break;
      }

      const result = await processItem(nextItem);

      if (
        result === "blocked" ||
        result === "awaiting_confirmation" ||
        result === "failed"
      ) {
        hasMore = false;
      }

      // Small delay between items to avoid hammering the server
      if (hasMore) {
        await delay(200);
      }
    }

    // Update last synced timestamp only when the active queue is fully clear.
    const finalState = store.getState();
    const remaining = finalState.syncQueue.items.filter(
      (i: QueueItem) =>
        i.status === "pending" ||
        i.status === "syncing" ||
        i.status === "awaiting_confirmation",
    );
    if (remaining.length === 0 && finalState.syncQueue.items.length === 0) {
      dispatch(setLastSyncedAt(new Date().toISOString()));
    }
  } finally {
    isProcessing = false;
    dispatch(setSyncing(false));
  }
}

async function retryRecoverableQueue(): Promise<void> {
  if (!isStarted || isProcessing || currentAppState !== "active") {
    return;
  }

  if (!hasRecoverableQueueHead()) {
    return;
  }

  const state = await NetInfo.fetch();
  if (isOnlineState(state)) {
    await processQueue();
  }
}

// ---------------------------------------------------------------------------
// NetInfo & AppState listeners
// ---------------------------------------------------------------------------

/**
 * Handle network state changes.
 * Triggers queue processing when transitioning to online.
 */
function handleNetInfoChange(state: NetInfoState): void {
  const isOnline = isOnlineState(state);

  if (isOnline && !isProcessing) {
    // Small delay to let the connection stabilize
    setTimeout(() => {
      void processQueue();
    }, 1_500);
  }
}

/**
 * Handle app state changes (background → foreground).
 * Re-triggers sync when app comes back to foreground.
 */
function handleAppStateChange(nextState: AppStateStatus): void {
  currentAppState = nextState;
  if (nextState === "active" && !isProcessing) {
    // Check connectivity and sync if online
    NetInfo.fetch().then((state) => {
      if (isOnlineState(state)) {
        void processQueue();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start the sync engine — subscribes to NetInfo and AppState.
 * Should be called once when the app initializes (after auth is ready).
 * Safe to call multiple times; subsequent calls are no-ops.
 */
export function startSyncEngine(): void {
  if (isStarted) return;

  netInfoUnsubscribe = NetInfo.addEventListener(handleNetInfoChange);
  appStateSubscription = AppState.addEventListener(
    "change",
    handleAppStateChange,
  );
  recoveryInterval = setInterval(() => {
    void retryRecoverableQueue();
  }, RECOVERY_POLL_MS);
  isStarted = true;

  // Initial sync attempt on start
  NetInfo.fetch().then((state) => {
    if (isOnlineState(state)) {
      void processQueue();
    }
  });

  if (__DEV__) {
    console.info("[SyncEngine] Started");
  }
}

/**
 * Stop the sync engine — unsubscribes from all listeners.
 * Should be called on logout or app teardown.
 */
export function stopSyncEngine(): void {
  if (!isStarted) return;

  netInfoUnsubscribe?.();
  netInfoUnsubscribe = null;

  appStateSubscription?.remove();
  appStateSubscription = null;

  if (recoveryInterval) {
    clearInterval(recoveryInterval);
    recoveryInterval = null;
  }

  isStarted = false;

  if (__DEV__) {
    console.info("[SyncEngine] Stopped");
  }
}

/**
 * Manually trigger a sync cycle (e.g., after user pulls to refresh).
 * No-op if already processing or offline.
 */
export async function triggerSync(): Promise<void> {
  if (isProcessing) return;

  const state = await NetInfo.fetch();
  if (isOnlineState(state)) {
    await processQueue();
  }
}

/**
 * Check whether the sync engine is currently running.
 */
export function isSyncEngineStarted(): boolean {
  return isStarted;
}
