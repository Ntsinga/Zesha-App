import React, { useMemo, useEffect } from "react";
import { useSelector } from "react-redux";
import { useUser } from "@clerk/clerk-react";
import { selectUser, selectUserRole } from "../store/slices/authSlice";
import "../styles/web.css";

/**
 * Modern top bar component showing user name and role
 * Web version
 *
 * Design Principles:
 * - Semantic HTML for accessibility
 * - Memoized calculations for performance
 * - ARIA labels for screen readers
 * - Keyboard navigation support
 * - Proper color contrast (WCAG AA compliant)
 */
export default function TopBarWeb() {
  const backendUser = useSelector(selectUser);
  const role = useSelector(selectUserRole);
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();

  // Debug: Log user state
  useEffect(() => {
    console.log("[TopBar Web] Backend user:", backendUser);
    console.log("[TopBar Web] Clerk user:", clerkUser?.id);
    console.log("[TopBar Web] Role:", role);
  }, [backendUser, clerkUser, role]);

  // Memoize computed values to prevent unnecessary recalculations
  // Use backend user if available, otherwise fall back to Clerk user
  const { initials, displayName, roleLabel, hasUser } = useMemo(() => {
    // Prefer backend user, fall back to Clerk user
    if (backendUser) {
      const initials =
        backendUser.firstName && backendUser.lastName
          ? `${backendUser.firstName[0]}${backendUser.lastName[0]}`.toUpperCase()
          : backendUser.email?.[0]?.toUpperCase() || "U";

      const displayName =
        backendUser.firstName && backendUser.lastName
          ? `${backendUser.firstName} ${backendUser.lastName}`
          : backendUser.email || "User";

      const roleLabel = role
        ? role
            .split("_")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(" ")
        : "";

      return { initials, displayName, roleLabel, hasUser: true };
    }

    // Fall back to Clerk user if backend user not synced yet
    if (clerkUser) {
      const initials =
        clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName[0]}${clerkUser.lastName[0]}`.toUpperCase()
          : clerkUser.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ||
            "U";

      const displayName =
        clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.primaryEmailAddress?.emailAddress || "User";

      // Get role from Clerk public metadata if available
      const clerkRole = (clerkUser.publicMetadata as { role?: string })?.role;
      const roleLabel = clerkRole
        ? clerkRole
            .split("_")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(" ")
        : "";

      return { initials, displayName, roleLabel, hasUser: true };
    }

    return { initials: "", displayName: "", roleLabel: "", hasUser: false };
  }, [backendUser, clerkUser, role]);

  if (!hasUser) return null;

  return (
    <header className="topbar" role="banner" aria-label="User information bar">
      <div className="topbar-container">
        {/* Left side - Reserved for breadcrumbs or page title */}
        <nav className="topbar-left" aria-label="Breadcrumb navigation">
          {/* Empty for now, can add breadcrumbs later */}
        </nav>

        {/* Right side - User info */}
        <div className="topbar-right">
          <div
            className="topbar-user-info"
            role="contentinfo"
            aria-label="Current user information"
          >
            <div className="topbar-user-details">
              <span
                className="topbar-user-name"
                title={displayName}
                aria-label={`User: ${displayName}`}
              >
                {displayName}
              </span>
              {roleLabel && (
                <span
                  className="topbar-user-role"
                  title={`Role: ${roleLabel}`}
                  aria-label={`Role: ${roleLabel}`}
                >
                  {roleLabel}
                </span>
              )}
            </div>

            {/* Avatar with semantic meaning */}
            <div
              className="topbar-avatar"
              role="img"
              aria-label={`${displayName}'s avatar with initials ${initials}`}
              title={displayName}
            >
              <span aria-hidden="true">{initials}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
