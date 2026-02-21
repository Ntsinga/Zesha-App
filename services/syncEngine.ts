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
  markSyncing,
  removeFromQueue,
  markFailed,
  setSyncing,
  setLastSyncedAt,
  type QueueItem,
} from "@/store/slices/syncQueueSlice";
import { secureApiRequest, isSecureApiInitialized } from "@/services/secureApi";
import { readImageAsBase64, deleteLocalImage } from "@/utils/localImageStore";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1_000; // 1 second
const MAX_DELAY_MS = 30_000; // 30 seconds

// Transient HTTP status codes worth retrying
const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let netInfoUnsubscribe: (() => void) | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
let isProcessing = false;
let isStarted = false;

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

// ---------------------------------------------------------------------------
// Core sync logic
// ---------------------------------------------------------------------------

/**
 * Process a single queue item — make the API call and handle the result.
 * Returns true if the item was successfully synced and removed, false otherwise.
 */
async function processItem(item: QueueItem): Promise<boolean> {
  const dispatch = store.dispatch;

  // Mark item as syncing
  dispatch(markSyncing(item.id));

  try {
    // 1. Resolve local images if any
    let finalPayload = item.payload;
    if (item.localImageUris && item.localImageUris.length > 0) {
      const imageMap = await resolveLocalImages(item.localImageUris);
      finalPayload = injectImagesIntoPayload(
        item.payload,
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
    await secureApiRequest(item.endpoint, options);

    // 4. Success — remove from queue and clean up local images
    dispatch(removeFromQueue(item.id));

    if (item.localImageUris && item.localImageUris.length > 0) {
      for (const uri of item.localImageUris) {
        try {
          await deleteLocalImage(uri);
        } catch {
          // Non-critical — orphaned images will be cleaned up later
        }
      }
    }

    return true;
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
        markFailed({
          id: item.id,
          error: `Auth error (${status}): ${errorMessage}`,
        }),
      );
      return false;
    }

    // Check if we should retry
    const isRetryable =
      status === 0 || RETRY_STATUS_CODES.has(status);
    const canRetry = item.retryCount < MAX_RETRIES - 1; // -1 because markFailed increments

    if (isRetryable && canRetry) {
      dispatch(
        markFailed({
          id: item.id,
          error: errorMessage,
        }),
      );
      // Delay before next item (backoff for this item's next attempt)
      await delay(getBackoffDelay(item.retryCount));
    } else {
      // Max retries exceeded or non-retryable error → mark permanently failed
      dispatch(
        markFailed({
          id: item.id,
          error: `Permanent failure after ${item.retryCount + 1} attempts: ${errorMessage}`,
        }),
      );
    }

    return false;
  }
}

/**
 * Process all pending items in the queue sequentially (FIFO).
 * Stops early if connectivity is lost or all items are processed.
 */
async function processQueue(): Promise<void> {
  if (isProcessing) return;

  const dispatch = store.dispatch;

  // Pre-check: is secure API initialized?
  if (!isSecureApiInitialized()) {
    if (__DEV__) {
      console.warn("[SyncEngine] Secure API not initialized, skipping sync");
    }
    return;
  }

  // Pre-check: is there anything to sync?
  const state = store.getState();
  const pendingItems = state.syncQueue.items.filter(
    (i: QueueItem) => i.status === "pending" || i.status === "failed",
  );

  if (pendingItems.length === 0) return;

  isProcessing = true;
  dispatch(setSyncing(true));

  try {
    // Re-read items each iteration so we pick up status changes
    let hasMore = true;
    while (hasMore) {
      // Check connectivity before each item
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || !netState.isInternetReachable) {
        if (__DEV__) {
          console.warn("[SyncEngine] Lost connectivity, pausing sync");
        }
        break;
      }

      // Get the next processable item (pending, or failed items ready for retry)
      const currentState = store.getState();
      const nextItem = currentState.syncQueue.items.find(
        (i: QueueItem) =>
          i.status === "pending" ||
          (i.status === "failed" && i.retryCount < MAX_RETRIES),
      );

      if (!nextItem) {
        hasMore = false;
        break;
      }

      await processItem(nextItem);

      // Small delay between items to avoid hammering the server
      await delay(200);
    }

    // Update last synced timestamp if no pending items remain
    const finalState = store.getState();
    const remaining = finalState.syncQueue.items.filter(
      (i: QueueItem) => i.status === "pending" || i.status === "syncing",
    );
    if (remaining.length === 0) {
      dispatch(setLastSyncedAt(new Date().toISOString()));
    }
  } finally {
    isProcessing = false;
    dispatch(setSyncing(false));
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
  const isOnline = state.isConnected && (state.isInternetReachable ?? true);

  if (isOnline && !isProcessing) {
    // Small delay to let the connection stabilize
    setTimeout(() => {
      processQueue();
    }, 1_500);
  }
}

/**
 * Handle app state changes (background → foreground).
 * Re-triggers sync when app comes back to foreground.
 */
function handleAppStateChange(nextState: AppStateStatus): void {
  if (nextState === "active" && !isProcessing) {
    // Check connectivity and sync if online
    NetInfo.fetch().then((state) => {
      if (state.isConnected && (state.isInternetReachable ?? true)) {
        processQueue();
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
  appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
  isStarted = true;

  // Initial sync attempt on start
  NetInfo.fetch().then((state) => {
    if (state.isConnected && (state.isInternetReachable ?? true)) {
      processQueue();
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
  if (state.isConnected && (state.isInternetReachable ?? true)) {
    await processQueue();
  }
}

/**
 * Check whether the sync engine is currently running.
 */
export function isSyncEngineStarted(): boolean {
  return isStarted;
}
