import React, { useMemo } from "react";
import { useSelector } from "react-redux";
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
  const user = useSelector(selectUser);
  const role = useSelector(selectUserRole);

  // Memoize computed values to prevent unnecessary recalculations
  const { initials, displayName, roleLabel } = useMemo(() => {
    if (!user) return { initials: "", displayName: "", roleLabel: "" };

    const initials =
      user.firstName && user.lastName
        ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
        : user.email?.[0]?.toUpperCase() || "U";

    const displayName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.email || "User";

    // Proper text transformation for roles (handles snake_case)
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
