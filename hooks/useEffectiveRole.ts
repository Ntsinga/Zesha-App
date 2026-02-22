import { useUser } from "@clerk/clerk-expo";
import { useAppSelector } from "@/store/hooks";
import { selectUserRole } from "@/store/slices/authSlice";
import type { RoleEnum } from "@/types";

/**
 * Returns the user's effective role, falling back to Clerk publicMetadata
 * when the backend user is unavailable (e.g. backend is unreachable).
 *
 * Priority:
 *   1. Backend user role (from Redux state)
 *   2. Clerk publicMetadata.role (set during invite)
 */
export function useEffectiveRole(): RoleEnum | string | null {
  const backendRole = useAppSelector(selectUserRole);
  const { user: clerkUser } = useUser();

  if (backendRole) return backendRole;

  // Fallback to Clerk metadata
  const clerkMetadataRole = (
    clerkUser?.publicMetadata as { role?: string } | undefined
  )?.role;

  return clerkMetadataRole ?? null;
}

/**
 * Convenience: returns true when the effective role is Super Administrator.
 */
export function useIsSuperAdmin(): boolean {
  const role = useEffectiveRole();
  return role === "Super Administrator";
}
