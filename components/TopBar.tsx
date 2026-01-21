import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSelector } from "react-redux";
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
export default function TopBar() {
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);

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
        {/* Left side - Reserved for future breadcrumbs/navigation */}
        <View style={styles.leftSection} />

        {/* Right side - User info */}
        <View style={styles.userSection}>
          <View style={styles.userDetails}>
            <Text
              style={styles.userName}
              numberOfLines={1}
              accessible={true}
              accessibilityLabel={`User: ${displayName}`}
            >
              {displayName}
            </Text>
            {roleLabel && (
              <View style={styles.roleBadge}>
                <Text
                  style={styles.roleText}
                  numberOfLines={1}
                  accessible={true}
                  accessibilityLabel={`Role: ${roleLabel}`}
                >
                  {roleLabel}
                </Text>
              </View>
            )}
          </View>

          {/* Avatar with proper touch target size (44x44 minimum) */}
          <View
            style={styles.avatar}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={`${displayName}'s avatar`}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
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
  leftSection: {
    flex: 1,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12, // Modern gap property for spacing
  },
  userDetails: {
    alignItems: "flex-end",
    maxWidth: 200, // Prevent overflow on small screens
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    lineHeight: 20,
  },
  roleBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#DC2626",
    textTransform: "capitalize",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    // Proper shadow for both platforms
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
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
