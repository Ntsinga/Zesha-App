import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import {
  LayoutDashboard,
  History,
  ArrowRightLeft,
  CreditCard,
  PieChart,
  Building2,
  Settings,
  Banknote,
  LogOut,
} from "lucide-react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useAppDispatch } from "../store/hooks";
import { clearLocalAuth } from "../store/slices/authSlice";
import { Colors } from "../constants/theme";

const CustomDrawerContent = (props: DrawerContentComponentProps) => {
  const { state, navigation } = props;
  const { signOut } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();

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
      route: "/balance",
      routeName: "balance",
      label: "Daily Reconciliation",
      icon: CreditCard,
    },
    {
      route: "/history",
      routeName: "history",
      label: "Reconciliation History",
      icon: History,
    },
    {
      route: "/commissions",
      routeName: "commissions",
      label: "Commissions",
      icon: Banknote,
    },
    {
      route: "/expenses",
      routeName: "expenses",
      label: "Expenses",
      icon: PieChart,
    },
    {
      route: "/accounts",
      routeName: "accounts",
      label: "Accounts",
      icon: Building2,
    },
    {
      route: "/settings",
      routeName: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(clearLocalAuth());
            await signOut();
            router.replace("/(auth)/sign-in");
          } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Teleba</Text>
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
                <item.icon size={20} color={isActive ? Colors.primary.main : Colors.secondary.light} />
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

          {/* Sign Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.menuItem, styles.signOutButton]}
          >
            <LogOut size={20} color={Colors.secondary.light} />
            <Text style={styles.menuItemText}>Sign Out</Text>
          </TouchableOpacity>
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
    backgroundColor: Colors.primary.main,
  },
  header: {
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary.dark,
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
  signOutButton: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.primary.dark,
    paddingTop: 24,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
    color: Colors.secondary.light,
  },
  menuItemTextActive: {
    color: Colors.primary.main,
  },
  footer: {
    padding: 16,
    marginBottom: 16,
  },
  footerCard: {
    backgroundColor: Colors.primary.dark,
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
    backgroundColor: Colors.secondary.dark,
    borderRadius: 9999,
  },
  footerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.secondary.light,
  },
  footerSubtitle: {
    fontSize: 12,
    color: Colors.secondary.light,
  },
});

export default CustomDrawerContent;
