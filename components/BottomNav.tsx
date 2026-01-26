import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppSelector } from "../store/hooks";
import {
  selectUserRole,
  selectViewingAgencyId,
} from "../store/slices/authSlice";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const userRole = useAppSelector(selectUserRole);
  const viewingAgencyId = useAppSelector(selectViewingAgencyId);
  const isSuperAdmin = userRole === "Super Administrator";
  const isViewingAgency = viewingAgencyId !== null;

  // Superadmin-only tabs (when NOT viewing an agency)
  const superAdminTabs = [
    {
      name: "Agencies",
      icon: "business-outline",
      activeIcon: "business",
      route: "/agencies",
    },
    {
      name: "Profile",
      icon: "person-outline",
      activeIcon: "person",
      route: "/settings",
    },
  ];

  // Regular tabs (for regular users OR superadmin viewing agency)
  const regularTabs = [
    { name: "Home", icon: "home-outline", activeIcon: "home", route: "/" },
    {
      name: "Reconcile",
      icon: "calculator-outline",
      activeIcon: "calculator",
      route: "/balance",
    },
    {
      name: "Expenses",
      icon: "receipt-outline",
      activeIcon: "receipt",
      route: "/expenses",
    },
    {
      name: "Profile",
      icon: "person-outline",
      activeIcon: "person",
      route: "/settings",
    },
  ];

  // Choose tabs based on superadmin status and agency view
  const tabs =
    isSuperAdmin && !isViewingAgency ? superAdminTabs : regularTabs;

  const isActive = (route: string) => {
    if (route === "/") return pathname === "/index" || pathname === "/";
    // Handle balance route - also match add-balance, add-cash-count, reconciliation
    if (route === "/balance") {
      return (
        pathname.includes("/balance") ||
        pathname.includes("/add-balance") ||
        pathname.includes("/add-cash-count") ||
        pathname.includes("/reconciliation")
      );
    }
    return pathname.includes(route);
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      {tabs.map((tab) => {
        const active = isActive(tab.route);

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={() => router.push(tab.route as any)}
            style={styles.tab}
            accessible={true}
            accessibilityLabel={tab.name}
            accessibilityRole="button"
          >
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as any}
              size={24}
              color={active ? "#DC2626" : "#9CA3AF"}
            />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "space-around",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#DC2626",
    fontWeight: "600",
  },
});
