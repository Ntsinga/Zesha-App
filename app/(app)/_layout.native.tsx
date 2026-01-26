import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, usePathname } from "expo-router";
import { Building2, LogIn } from "lucide-react-native";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  selectUserRole,
  selectViewingAgencyId,
  selectViewingAgencyName,
  exitAgency,
} from "../../store/slices/authSlice";
import TopBar from "../../components/TopBar";
import BottomNav from "../../components/BottomNav";

export default function AppLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector(selectUserRole);
  const viewingAgencyId = useAppSelector(selectViewingAgencyId);
  const viewingAgencyName = useAppSelector(selectViewingAgencyName);
  const isSuperAdmin = userRole === "Super Administrator";
  const isViewingAgency = viewingAgencyId !== null;

  // Redirect superadmin to agencies page if they try to access agency-specific pages without viewing an agency
  useEffect(() => {
    if (isSuperAdmin && !isViewingAgency && pathname !== "/agencies" && pathname !== "/agency-form" && pathname !== "/settings") {
      router.replace("/agencies");
    }
  }, [isSuperAdmin, isViewingAgency, pathname, router]);

  const handleExitAgency = () => {
    dispatch(exitAgency());
    router.push("/agencies");
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        {/* Agency Viewing Banner - only for superadmins */}
        {isSuperAdmin && isViewingAgency && (
          <View style={styles.agencyBanner}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <Building2 size={16} color="#fff" />
              </View>
              <Text style={styles.bannerText}>
                Viewing: <Text style={styles.bannerBold}>{viewingAgencyName}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleExitAgency}
            >
              <LogIn
                size={14}
                color="#fff"
                style={{ transform: [{ scaleX: -1 }] }}
              />
              <Text style={styles.exitButtonText}>Exit</Text>
            </TouchableOpacity>
          </View>
        )}

        <TopBar />
        <View style={styles.contentContainer}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="history" />
            <Stack.Screen name="transactions" />
            <Stack.Screen name="expenses" />
            <Stack.Screen name="balance" />
            <Stack.Screen name="add-balance" />
            <Stack.Screen name="add-cash-count" />
            <Stack.Screen name="reconciliation" />
            <Stack.Screen name="commissions" />
            <Stack.Screen name="add-commission" />
            <Stack.Screen name="accounts" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="agencies" />
          </Stack>
        </View>
        <BottomNav />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentContainer: {
    flex: 1,
  },
  agencyBanner: {
    backgroundColor: "#C62828",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerText: {
    color: "#fff",
    fontSize: 13,
  },
  bannerBold: {
    fontWeight: "600",
  },
  exitButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  exitButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
});
