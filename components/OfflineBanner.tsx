/**
 * Offline Banner Component (Mobile Only)
 *
 * Displays an animated toast at the BOTTOM of the screen when the device is offline.
 * Slides up when offline, auto-fades after a few seconds, and re-shows periodically
 * if still offline. Shows a brief "Back online" toast when reconnected.
 * Uses debounced detection to avoid false positives on WiFi.
 */

import React, { useEffect, useRef, useState } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import { useNetworkContext } from "@/hooks/useNetworkStatus";

const OFFLINE_DURATION = 4000; // Show offline toast for 4s
const ONLINE_DURATION = 2500; // Show "back online" toast for 2.5s
const RESHOW_INTERVAL = 30000; // Re-show every 30s while still offline
const DEBOUNCE_MS = 3000; // Wait 3s before declaring offline

type ToastMode = "offline" | "online";

export default function OfflineBanner() {
  const { isConnected, isInternetReachable, isStatusKnown } =
    useNetworkContext();
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [toastMode, setToastMode] = useState<ToastMode>("offline");

  // All mutable state lives in refs so closures inside timers always read current values
  const wasOfflineRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reshowIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const actuallyOffline =
    isStatusKnown && (!isConnected || isInternetReachable === false);

  const slideIn = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const slideOut = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 80,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const clearTimers = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (reshowIntervalRef.current) {
      clearInterval(reshowIntervalRef.current);
      reshowIntervalRef.current = null;
    }
  };

  // Single effect — debounce handled via the cleanup return value
  useEffect(() => {
    if (!isStatusKnown) return;

    if (actuallyOffline) {
      // Start debounce. If the device comes back online before 3 s, the
      // cleanup cancels this timer — no toast is ever shown.
      const debounceTimer = setTimeout(() => {
        wasOfflineRef.current = true;
        clearTimers();
        setToastMode("offline");
        slideIn();
        hideTimerRef.current = setTimeout(slideOut, OFFLINE_DURATION);

        // Re-show periodically while still offline
        reshowIntervalRef.current = setInterval(() => {
          if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
          slideIn();
          hideTimerRef.current = setTimeout(slideOut, OFFLINE_DURATION);
        }, RESHOW_INTERVAL);
      }, DEBOUNCE_MS);

      return () => clearTimeout(debounceTimer);
    } else {
      // Device is (back) online
      clearTimers();

      if (wasOfflineRef.current) {
        // Confirmed back online after a real offline period
        wasOfflineRef.current = false;
        setToastMode("online");
        slideIn();
        hideTimerRef.current = setTimeout(slideOut, ONLINE_DURATION);
      }
    }
  }, [actuallyOffline, isStatusKnown]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isStatusKnown) return null;

  const isOnlineToast = toastMode === "online";

  return (
    <Animated.View
      style={[
        styles.container,
        isOnlineToast && styles.containerOnline,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
      pointerEvents="none"
    >
      <View style={styles.inner}>
        <Text style={styles.icon}>{isOnlineToast ? "✓" : "⚡"}</Text>
        <Text style={styles.text}>
          {isOnlineToast
            ? "Back online. Syncing your changes..."
            : "You're offline. Changes will sync when reconnected."}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 32,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  containerOnline: {
    backgroundColor: "#16a34a",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
