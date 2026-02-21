/**
 * Offline Check Utility
 *
 * Provides a lightweight async check for device connectivity,
 * intended for use in Redux async thunks to short-circuit API calls when offline.
 * Mobile-only — on web always reports online.
 */

import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";

/**
 * Returns true if the device is currently offline.
 * On web, always returns false (offline mode is mobile-only).
 */
export async function isDeviceOffline(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    const state = await NetInfo.fetch();
    return !state.isConnected || state.isInternetReachable === false;
  } catch {
    // If NetInfo fails, assume online to avoid blocking the user
    return false;
  }
}
