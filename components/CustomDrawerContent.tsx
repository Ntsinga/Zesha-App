import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  LayoutDashboard,
  History,
  ArrowRightLeft,
  CreditCard,
  PieChart,
} from "lucide-react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { state, navigation } = props;

  // Get current route name from drawer state
  const currentRoute = state.routes[state.index]?.name || "index";
  const pathname = currentRoute === "index" ? "/" : "/" + currentRoute;

  const menuItems = [
    {
      route: "/",
      routeName: "index",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      route: "/history",
      routeName: "history",
      label: "Balance History",
      icon: History,
    },
    {
      route: "/transactions",
      routeName: "transactions",
      label: "Transactions",
      icon: ArrowRightLeft,
    },
    {
      route: "/expenses",
      routeName: "expenses",
      label: "Expenses",
      icon: PieChart,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Zesha App</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => {
            const isActive =
              pathname === item.route ||
              (item.route !== "/" && pathname.startsWith(item.route));

            return (
              <TouchableOpacity
                key={item.route}
                onPress={() => {
                  navigation.navigate(item.routeName as never);
                }}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
              >
                <item.icon size={20} color={isActive ? "#C62828" : "#FECACA"} />
                <Text
                  style={[
                    styles.menuItemText,
                    isActive && styles.menuItemTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerCard}>
          <View style={styles.footerCardHeader}>
            <View style={styles.footerIconContainer}>
              <CreditCard size={16} color="white" />
            </View>
            <Text style={styles.footerTitle}>Pro Plan Active</Text>
          </View>
          <Text style={styles.footerSubtitle}>Next billing: Aug 1, 2024</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C62828",
  },
  header: {
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#991B1B",
    paddingTop: 32,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  menuContainer: {
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  menuItemActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
    color: "#FECACA",
  },
  menuItemTextActive: {
    color: "#C62828",
  },
  footer: {
    padding: 16,
    marginBottom: 16,
  },
  footerCard: {
    backgroundColor: "#991B1B",
    borderRadius: 12,
    padding: 16,
  },
  footerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  footerIconContainer: {
    padding: 4,
    backgroundColor: "#7F1D1D",
    borderRadius: 9999,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FECACA",
  },
  footerSubtitle: {
    fontSize: 12,
    color: "#FECACA",
  },
});

export default CustomDrawerContent;
