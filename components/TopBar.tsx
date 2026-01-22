import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useSelector } from "react-redux";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { selectUser, selectUserRole } from "../store/slices/authSlice";

/**
 * Modern top bar component showing user name and role
 * Native (mobile) version
 *
 * Design Principles:
 * - Memoized calculations for performance
 * - Proper React Native spacing (no space-x utilities)
 * - Accessible text with proper contrast
 * - Graceful fallbacks for missing data
 */

interface TopBarProps {
  onMenuPress?: () => void;
}

export default function TopBar({ onMenuPress }: TopBarProps) {
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);
  const router = useRouter();

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
    }
  };

  // Memoize computed values to prevent unnecessary recalculations
  const { initials, displayName, roleLabel } = useMemo(() => {
    if (!user) return { initials: "", displayName: "", roleLabel: "" };

    const initials =
      user.first_name && user.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
        : user.email?.[0]?.toUpperCase() || "U";

    const displayName =
      user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`
        : user.email || "User";

    // Proper text transformation for roles
    const roleLabel = role
      ? role
          .split("_")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ")
      : "";

    return { initials, displayName, roleLabel };
  }, [user, role]);

  if (!user) return null;

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="header"
      accessibilityLabel="User information bar"
    >
      <View style={styles.content}>
        {/* Left side - User info */}
        <View style={styles.userSection}>
          {/* Avatar */}
          <View
            style={styles.avatar}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={`${displayName}'s avatar`}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {/* User Details */}
          <View style={styles.userDetails}>
            {roleLabel && (
              <Text
                style={styles.roleText}
                numberOfLines={1}
                accessible={true}
                accessibilityLabel={`Role: ${roleLabel}`}
              >
                {roleLabel}
              </Text>
            )}
            <Text
              style={styles.userName}
              numberOfLines={1}
              accessible={true}
              accessibilityLabel={`User: ${displayName}`}
            >
              {displayName}
            </Text>
          </View>
        </View>

        {/* Right side - Actions */}
        <View style={styles.actionsSection}>
          {/* Notification Bell */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {}}
            accessible={true}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <Ionicons name="notifications-outline" size={24} color="#6B7280" />
          </TouchableOpacity>

          {/* Menu Button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleMenuPress}
            accessible={true}
            accessibilityLabel="Open menu"
            accessibilityRole="button"
          >
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// StyleSheet for proper React Native styling (better performance than inline styles)
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 1000,
    // Elevation for Android, shadow for iOS
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userDetails: {
    maxWidth: 180,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    textTransform: "capitalize",
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  actionsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
