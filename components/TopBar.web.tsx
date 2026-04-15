import React, { useMemo, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { useUser } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import { useAppSelector } from "../store/hooks";
import {
  selectUser,
  selectUserRole,
  selectViewingAgencyId,
  selectViewingAgencyName,
} from "../store/slices/authSlice";
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
  const backendUser = useAppSelector(selectUser);
  const role = useAppSelector(selectUserRole);
  const viewingAgencyId = useAppSelector(selectViewingAgencyId);
  const viewingAgencyName = useAppSelector(selectViewingAgencyName);
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        avatarRef.current &&
        !avatarRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAvatarClick = () => {
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setDropdownOpen((o) => !o);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const isSuperAdmin = role === "Super Administrator";
  const isViewingAgency = viewingAgencyId !== null;

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

            {/* Avatar with dropdown */}
            <div
              className="topbar-avatar-wrapper"
              style={{ position: "relative" }}
            >
              <button
                ref={avatarRef}
                className="topbar-avatar"
                onClick={handleAvatarClick}
                aria-label={`${displayName}'s avatar — click to open menu`}
                title={displayName}
                style={{ cursor: "pointer" }}
              >
                <span aria-hidden="true">{initials}</span>
              </button>
            </div>

            {/* Dropdown rendered via portal to escape overflow:hidden ancestors */}
            {dropdownOpen &&
              typeof document !== "undefined" &&
              ReactDOM.createPortal(
                <div
                  ref={dropdownRef}
                  style={{
                    position: "fixed",
                    top: dropdownPos.top,
                    right: dropdownPos.right,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    minWidth: 160,
                    zIndex: 99999,
                    overflow: "hidden",
                  }}
                >
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleSignOut();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "12px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 14,
                      color: "#1e293b",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "none")
                    }
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span style={{ color: "#dc2626" }}>Logout</span>
                  </button>
                </div>,
                document.body,
              )}
          </div>
        </div>
      </div>
    </header>
  );
}
