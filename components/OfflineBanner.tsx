/**
 * Offline Banner Component (Mobile Only)
 *
 * Displays an animated banner at the top of the screen when the device is offline.
 * Slides down when offline, slides up when back online.
 */

import React, { useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import { useNetworkContext } from "@/hooks/useNetworkStatus";

export default function OfflineBanner() {
  const { isConnected, isStatusKnown } = useNetworkContext();
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (!isStatusKnown) return;

    Animated.timing(slideAnim, {
      toValue: isConnected ? -50 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isConnected, isStatusKnown, slideAnim]);

  // Don't render anything until we know the status
  if (!isStatusKnown) return null;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="none"
    >
      <View style={styles.inner}>
        <Text style={styles.icon}>⚡</Text>
        <Text style={styles.text}>
          You are offline. Changes will sync when reconnected.
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#F59E0B",
    paddingTop: 44, // Safe area for notch
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 14,
    marginRight: 6,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
