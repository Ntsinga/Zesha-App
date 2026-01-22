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

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: "Home", icon: "grid-outline", activeIcon: "grid", route: "/" },
    {
      name: "Insights",
      icon: "bar-chart-outline",
      activeIcon: "bar-chart",
      route: "/insights",
    },
    { name: "add", icon: "add", activeIcon: "add", route: "/balance" }, // Center button
    {
      name: "History",
      icon: "time-outline",
      activeIcon: "time",
      route: "/history",
    },
    {
      name: "Profile",
      icon: "settings-outline",
      activeIcon: "settings",
      route: "/settings",
    },
  ];

  const isActive = (route: string) => {
    if (route === "/") return pathname === "/index" || pathname === "/";
    return pathname.includes(route);
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      {tabs.map((tab, index) => {
        const active = isActive(tab.route);

        // Center add button
        if (tab.name === "add") {
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.route as any)}
              style={styles.addButton}
              accessible={true}
              accessibilityLabel="Add new item"
              accessibilityRole="button"
            >
              <Ionicons name={tab.icon as any} size={28} color="#FFFFFF" />
            </TouchableOpacity>
          );
        }

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
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    ...Platform.select({
      ios: {
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
