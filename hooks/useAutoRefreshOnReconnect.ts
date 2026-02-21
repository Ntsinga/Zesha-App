/**
 * useAutoRefreshOnReconnect Hook
 *
 * Automatically dispatches a refresh action when the device transitions from
 * offline → online AND the sync queue has finished processing.
 * Useful for screens that need fresh data after queued mutations are synced.
 */

import { useEffect, useRef } from "react";
import { useNetworkContext } from "@/hooks/useNetworkStatus";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  selectIsSyncing,
  selectTotalQueueCount,
} from "@/store/slices/syncQueueSlice";
import type { AsyncThunkAction } from "@reduxjs/toolkit";

/**
 * Watches for offline → online + sync-complete transitions and dispatches
 * the provided refresh action.
 *
 * @param refreshAction - A thunk action creator call to dispatch on reconnect
 *                        e.g., `() => fetchBalances({ forceRefresh: true })`
 * @param enabled - Optional flag to disable the hook (defaults to true)
 */
export function useAutoRefreshOnReconnect(
  refreshAction: () => AsyncThunkAction<
    unknown,
    unknown,
    Record<string, unknown>
  >,
  enabled = true,
): void {
  const dispatch = useAppDispatch();
  const { isConnected, isStatusKnown } = useNetworkContext();
  const isSyncing = useAppSelector(selectIsSyncing);
  const queueCount = useAppSelector(selectTotalQueueCount);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!enabled || !isStatusKnown) return;

    // Track offline → online transitions
    if (!isConnected) {
      wasOffline.current = true;
      return;
    }

    // We're online now — if we were previously offline and syncing is done
    if (wasOffline.current && !isSyncing && queueCount === 0) {
      wasOffline.current = false;
      dispatch(refreshAction());
    }
  }, [
    isConnected,
    isStatusKnown,
    isSyncing,
    queueCount,
    dispatch,
    refreshAction,
    enabled,
  ]);
}
