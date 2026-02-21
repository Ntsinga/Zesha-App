import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppSelector } from "@/store/hooks";
import { selectUserRole } from "@/store/slices/authSlice";
import { Colors } from "@/constants/theme";

interface SuperAdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A guard component that only renders children if the user is a Super Administrator.
 * Use this to wrap superadmin-only UI elements or screens.
 */
export function SuperAdminGuard({ children, fallback }: SuperAdminGuardProps) {
  const role = useAppSelector(selectUserRole);
  const isSuperAdmin = role === "Super Administrator";

  if (!isSuperAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Access Denied</Text>
        <Text style={styles.subtext}>
          You need Super Administrator privileges to access this area.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check if current user is a Super Administrator
 */
export function useSuperAdmin() {
  const role = useAppSelector(selectUserRole);
  return role === "Super Administrator";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.status.error.main,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

export default SuperAdminGuard;
