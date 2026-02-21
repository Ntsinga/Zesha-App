import { useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { syncUserWithBackend, clearLocalAuth } from "../store/slices/authSlice";
import { isSecureApiInitialized } from "../services/secureApi";
import type { UserSyncRequest, RoleEnum } from "@/types";

/**
 * Hook to sync Clerk user data with the backend.
 * Should be used in the root layout or a component that's always mounted when authenticated.
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

  // Ref to track which clerk user ID we've already synced - prevents sync loops
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

    // Extract companyId and role from Clerk public metadata (set during invite)
    const publicMetadata = clerkUser.publicMetadata as
      | { company_id?: number; role?: RoleEnum }
      | undefined;
    const companyId = publicMetadata?.company_id ?? null;
    const role = publicMetadata?.role ?? null;

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
        console.error("[UserSync] Sync error:", err);
      } finally {
        syncInProgressRef.current = false;
      }
    } else {
      syncInProgressRef.current = false;
    }
  }, [clerkUser, dispatch]);

  useEffect(() => {
    // Wait for Clerk to load
    if (!isAuthLoaded || !isUserLoaded) {
      return;
    }

    // Wait for secure API to be initialized (needs token getter from Clerk)
    if (!isSecureApiInitialized()) {
      return;
    }

    if (isSignedIn && clerkUser) {
      // Skip if we already synced this clerk user (prevents loops)
      if (syncedClerkIdRef.current === clerkUser.id) {
        return;
      }

      // Skip if currently syncing
      if (isSyncing) {
        return;
      }

      // Check if we need to sync
      const needsSync =
        !backendUser || backendUser.clerkUserId !== clerkUser.id;

      if (needsSync) {
        syncUser();
      } else {
        // Backend user is already synced, mark it in the ref
        syncedClerkIdRef.current = clerkUser.id;
      }
    } else if (!isSignedIn) {
      // User signed out, clear local auth data and reset ref
      if (backendUser) {
        dispatch(clearLocalAuth());
      }
      syncedClerkIdRef.current = null;
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

  return {
    backendUser,
    clerkUser,
    isSyncing,
    error,
    syncUser, // Expose for manual sync if needed
  };
}

export default useClerkUserSync;
