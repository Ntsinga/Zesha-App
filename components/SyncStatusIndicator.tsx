/**
 * Sync Status Indicator (Mobile Only)
 *
 * Displays the number of pending offline mutations and a sync spinner
 * when the sync engine is actively processing. Compact badge for use
 * in TopBar or navigation headers.
 */

import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useAppSelector } from "@/store/hooks";
import {
  selectAwaitingConfirmationCount,
  selectBlockedCount,
  selectNeedsAttentionCount,
  selectPendingCount,
  selectIsSyncing,
} from "@/store/slices/syncQueueSlice";
import { triggerSync } from "@/services/syncEngine";

interface SyncStatusIndicatorProps {
  /** Whether to show a compact badge (true) or full label (false) */
  compact?: boolean;
}

export default function SyncStatusIndicator({
  compact = true,
}: SyncStatusIndicatorProps) {
  // Hooks must always be called in the same order (Rules of Hooks)
  const pendingCount = useAppSelector(selectPendingCount);
  const awaitingConfirmationCount = useAppSelector(
    selectAwaitingConfirmationCount,
  );
  const blockedCount = useAppSelector(selectBlockedCount);
  const needsAttentionCount = useAppSelector(selectNeedsAttentionCount);
  const isSyncing = useAppSelector(selectIsSyncing);
  const totalCount = pendingCount + needsAttentionCount;

  // Only render on mobile
  if (Platform.OS === "web") return null;

  // Nothing to show if queue is empty and not syncing
  if (totalCount === 0 && !isSyncing) return null;

  return (
    <>
      {compact ? (
        <TouchableOpacity
          onPress={() => triggerSync()}
          style={styles.compactContainer}
          accessibilityLabel={`${pendingCount} pending, ${needsAttentionCount} needing attention`}
          accessibilityRole="button"
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.icon}>↑</Text>
              <Text style={styles.countText}>{totalCount}</Text>
            </>
          )}
          {needsAttentionCount > 0 && !isSyncing && (
            <View style={styles.errorDot} />
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={() => triggerSync()}
          style={styles.fullContainer}
          accessibilityLabel={`${pendingCount} pending, ${needsAttentionCount} needing attention. Tap to retry sync.`}
          accessibilityRole="button"
        >
          {isSyncing ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.fullText}>Syncing...</Text>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.fullIcon}>↑</Text>
              <Text style={styles.fullText}>
                {pendingCount > 0 && `${pendingCount} pending`}
                {pendingCount > 0 && needsAttentionCount > 0 && " · "}
                {needsAttentionCount > 0 &&
                  `${needsAttentionCount} need attention`}
                {awaitingConfirmationCount > 0 &&
                  ` (${awaitingConfirmationCount} awaiting confirmation)`}
                {blockedCount > 0 && ` (${blockedCount} blocked)`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    justifyContent: "center",
    position: "relative",
  },
  icon: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginRight: 2,
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  errorDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  fullContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fullIcon: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "700",
  },
  fullText: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "500",
  },
});
