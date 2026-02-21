import { useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { syncUserWithBackend, clearLocalAuth } from "../store/slices/authSlice";
import { isSecureApiInitialized } from "../services/secureApi";
import type { UserSyncRequest, RoleEnum } from "@/types";

/**
 * Hook to sync Clerk user data with the backend.
 * Web version - uses @clerk/clerk-react
 *
 * This hook:
 * 1. Watches for Clerk user changes
 * 2. Syncs user data to backend on sign-in
 * 3. Clears local auth data on sign-out
 */
export function useClerkUserSync() {
  const dispatch = useAppDispatch();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();

  // Ref to track if we've already synced for the current Clerk user
  const syncedClerkIdRef = useRef<string | null>(null);
  // Ref to prevent multiple sync attempts
  const syncInProgressRef = useRef<boolean>(false);

  const {
    user: backendUser,
    isSyncing,
    error,
  } = useAppSelector((state) => state.auth);

  const syncUser = useCallback(async () => {
    if (!clerkUser) {
      return;
    }

    // Prevent multiple simultaneous sync calls
    if (syncInProgressRef.current) {
      return;
    }

    // Mark this clerk user as synced to prevent duplicate syncs
    syncedClerkIdRef.current = clerkUser.id;
    syncInProgressRef.current = true;

    // Extract companyId and role from Clerk metadata (set during invite)
    // Try publicMetadata first, then unsafeMetadata as fallback
    const publicMetadata = clerkUser.publicMetadata as
      | { company_id?: number; role?: RoleEnum }
      | undefined;
    const unsafeMetadata = clerkUser.unsafeMetadata as
      | { company_id?: number; role?: RoleEnum }
      | undefined;

    const companyId =
      publicMetadata?.company_id ?? unsafeMetadata?.company_id ?? null;
    const role = publicMetadata?.role ?? unsafeMetadata?.role ?? null;

    // Build sync request from Clerk user data
    const syncData: UserSyncRequest = {
      clerkUserId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      profileImageUrl: clerkUser.imageUrl,
      phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber || null,
      userMetadata: clerkUser.publicMetadata
        ? JSON.stringify(clerkUser.publicMetadata)
        : null,
      companyId: companyId,
      role: role,
    };

    // Only sync if we have required data
    if (syncData.email && syncData.clerkUserId) {
      try {
        await dispatch(syncUserWithBackend(syncData));
      } catch (err) {
        console.error("[UserSync Web] Sync failed:", err);
      } finally {
        syncInProgressRef.current = false;
      }
    } else {
      syncInProgressRef.current = false;
    }
  }, [clerkUser, dispatch]);

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) return;
    if (!isSecureApiInitialized()) return;

    if (isSignedIn && clerkUser) {
      // Skip if already synced
      if (syncedClerkIdRef.current === clerkUser.id) return;
      if (isSyncing) return;

      // Sync if no backend user or different clerk user
      const needsSync =
        !backendUser || backendUser.clerkUserId !== clerkUser.id;

      if (needsSync) {
        syncUser();
      } else {
        syncedClerkIdRef.current = clerkUser.id;
      }
    } else if (!isSignedIn) {
      syncedClerkIdRef.current = null;
      if (backendUser) {
        dispatch(clearLocalAuth());
      }
    }
  }, [
    isSignedIn,
    isAuthLoaded,
    isUserLoaded,
    clerkUser?.id,
    backendUser?.clerkUserId,
    isSyncing,
    syncUser,
    dispatch,
  ]);

  // Clear synced ref when user changes
  useEffect(() => {
    if (!isSignedIn) {
      syncedClerkIdRef.current = null;
    }
  }, [isSignedIn]);

  return {
    backendUser,
    clerkUser,
    isSyncing,
    error,
    syncUser, // Expose for manual sync if needed
  };
}

export default useClerkUserSync;
