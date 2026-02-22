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

const SHOW_DURATION = 4000; // Show for 4 seconds
const RECONNECT_SHOW_DURATION = 2500; // Show "back online" for 2.5 seconds
const RE_SHOW_INTERVAL = 30000; // Re-show every 30s if still offline
const DEBOUNCE_MS = 3000; // Wait 3s before declaring offline (avoids startup flicker)

type ToastMode = "offline" | "online" | null;

export default function OfflineBanner() {
  const { isConnected, isInternetReachable, isStatusKnown } =
    useNetworkContext();
  const slideAnim = useRef(new Animated.Value(80)).current; // Start below screen
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isOfflineConfirmed, setIsOfflineConfirmed] = useState(false);
  const [toastMode, setToastMode] = useState<ToastMode>(null);
  const wasOfflineRef = useRef(false); // Track if we were previously offline
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reShowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine true offline: not connected OR connected to WiFi but no internet
  const actuallyOffline =
    isStatusKnown && (!isConnected || isInternetReachable === false);

  // Debounce the offline state to avoid false positives at startup
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (actuallyOffline) {
      debounceTimer.current = setTimeout(() => {
        setIsOfflineConfirmed(true);
      }, DEBOUNCE_MS);
    } else {
      setIsOfflineConfirmed(false);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [actuallyOffline]);

  // Show/hide the toast
  const showToast = (duration: number = SHOW_DURATION) => {
    // Slide up + fade in
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

    // Auto-hide after duration
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(hideToast, duration);
  };

  const hideToast = () => {
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

  useEffect(() => {
    if (isOfflineConfirmed) {
      // Going offline
      wasOfflineRef.current = true;
      setToastMode("offline");
      showToast();

      // Re-show periodically while still offline
      reShowTimer.current = setInterval(() => {
        showToast();
      }, RE_SHOW_INTERVAL);
    } else {
      // Clear offline re-show interval
      if (reShowTimer.current) clearInterval(reShowTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);

      if (wasOfflineRef.current) {
        // Was offline, now back online — show "Back online" toast
        wasOfflineRef.current = false;
        setToastMode("online");
        showToast(RECONNECT_SHOW_DURATION);
      } else {
        // Never was offline (initial state) — just hide
        hideToast();
      }
    }

    return () => {
      if (reShowTimer.current) clearInterval(reShowTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isOfflineConfirmed]);

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
