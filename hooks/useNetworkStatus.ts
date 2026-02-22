/**
 * Network Status Hook (Mobile Only)
 *
 * Provides real-time connectivity information using @react-native-community/netinfo.
 * Exposes isConnected, isInternetReachable, and connectionType.
 */

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import NetInfo, {
  NetInfoState,
  NetInfoStateType,
} from "@react-native-community/netinfo";

export interface NetworkStatus {
  /** Whether the device has an active network connection */
  isConnected: boolean;
  /** Whether internet is actually reachable (not just connected to WiFi). null = unknown */
  isInternetReachable: boolean | null;
  /** Connection type (wifi, cellular, etc.) */
  connectionType: NetInfoStateType;
  /** Whether network status has been determined at least once */
  isStatusKnown: boolean;
}

const defaultStatus: NetworkStatus = {
  isConnected: true, // Assume connected until proven otherwise
  isInternetReachable: null, // null = unknown, avoids false "offline" at startup
  connectionType: NetInfoStateType.unknown,
  isStatusKnown: false,
};

// Context for sharing network status across the app
export const NetworkContext = createContext<NetworkStatus>(defaultStatus);

export function useNetworkContext(): NetworkStatus {
  return useContext(NetworkContext);
}

/**
 * Hook that subscribes to NetInfo and returns current network status.
 * Should be used once at the app root level, with the value passed via NetworkContext.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(defaultStatus);

  const handleNetInfoChange = useCallback((state: NetInfoState) => {
    setStatus({
      isConnected: state.isConnected ?? true,
      isInternetReachable: state.isInternetReachable, // Keep null when unknown
      connectionType: state.type,
      isStatusKnown: true,
    });
  }, []);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(handleNetInfoChange);

    // Also fetch current state immediately
    NetInfo.fetch().then(handleNetInfoChange);

    return () => {
      unsubscribe();
    };
  }, [handleNetInfoChange]);

  return status;
}
