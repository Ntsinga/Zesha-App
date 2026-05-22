import { useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { syncUserWithBackend, clearLocalAuth } from "../store/slices/authSlice";
import { resetBlockedItems } from "../store/slices/syncQueueSlice";
import { isSecureApiInitialized } from "../services/secureApi";
import { triggerSync } from "../services/syncEngine";
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
  // Tracks when auth becomes available again so blocked items can resume even
  // if the backend user was already restored from local state.
  const previousSignedInRef = useRef<boolean | null>(null);

  const {
    user: backendUser,
    isSyncing,
    error,
  } = useAppSelector((state) => state.auth);

  const resumeBlockedQueue = useCallback(() => {
    dispatch(resetBlockedItems());
    void triggerSync();
  }, [dispatch]);

  const syncUser = useCallback(async () => {
    if (!clerkUser) {
      return;
    }

    // Prevent multiple simultaneous sync calls
    if (syncInProgressRef.current) {
      return;
    }

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
        const result = await dispatch(syncUserWithBackend(syncData));
        if (syncUserWithBackend.fulfilled.match(result)) {
          syncedClerkIdRef.current = clerkUser.id;
          resumeBlockedQueue();
        }
      } catch (err) {
        console.error("[UserSync Web] Sync failed:", err);
      } finally {
        syncInProgressRef.current = false;
      }
    } else {
      syncInProgressRef.current = false;
    }
  }, [clerkUser, dispatch, resumeBlockedQueue]);

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) return;
    if (!isSecureApiInitialized()) return;

    const authBecameAvailable = isSignedIn && previousSignedInRef.current !== true;

    if (isSignedIn && clerkUser) {
      // Skip if already synced
      if (syncedClerkIdRef.current === clerkUser.id) {
        if (
          authBecameAvailable &&
          backendUser?.clerkUserId === clerkUser.id
        ) {
          resumeBlockedQueue();
        }
        return;
      }
      if (isSyncing) return;

      // Sync if no backend user or different clerk user
      const needsSync =
        !backendUser || backendUser.clerkUserId !== clerkUser.id;

      if (needsSync) {
        syncUser();
      } else {
        syncedClerkIdRef.current = clerkUser.id;
        if (authBecameAvailable) {
          resumeBlockedQueue();
        }
      }
    } else if (!isSignedIn) {
      syncedClerkIdRef.current = null;
      if (backendUser) {
        dispatch(clearLocalAuth({ preserveSyncQueue: true }));
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
    resumeBlockedQueue,
    dispatch,
  ]);

  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }

    previousSignedInRef.current = isSignedIn;
  }, [isAuthLoaded, isSignedIn]);

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
