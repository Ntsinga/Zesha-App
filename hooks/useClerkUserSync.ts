import { useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { syncUserWithBackend, clearLocalAuth } from "../store/slices/authSlice";
import { resetBlockedItems } from "../store/slices/syncQueueSlice";
import { isSecureApiInitialized } from "../services/secureApi";
import { triggerSync } from "../services/syncEngine";
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
  // Tracks whether Clerk auth has just become available so blocked queue items
  // can resume even when the backend user is already cached for the same account.
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

    // Extract only the minimum invite metadata needed for first sync.
    const publicMetadata = clerkUser.publicMetadata as
      | { company_id?: number; role?: RoleEnum; invitation_type?: string }
      | undefined;
    const inviteMetadata = publicMetadata
      ? {
          ...(publicMetadata.company_id !== undefined
            ? { company_id: publicMetadata.company_id }
            : {}),
          ...(publicMetadata.role !== undefined
            ? { role: publicMetadata.role }
            : {}),
          ...(publicMetadata.invitation_type
            ? { invitation_type: publicMetadata.invitation_type }
            : {}),
        }
      : null;
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
      userMetadata: inviteMetadata ? JSON.stringify(inviteMetadata) : null,
      companyId: companyId,
      role: role,
    };

    // Only sync if we have required data
    if (syncData.email && syncData.clerkUserId) {
      try {
        const result = await dispatch(syncUserWithBackend(syncData));
        if (syncUserWithBackend.fulfilled.match(result)) {
          syncedClerkIdRef.current = clerkUser.id;
          // Re-auth succeeded — unblock any items that were stalled by a 401
          // so the sync engine picks them up on the next pass.
          resumeBlockedQueue();
        }
      } catch (err) {
        console.error("[UserSync] Sync error:", err);
      } finally {
        syncInProgressRef.current = false;
      }
    } else {
      syncInProgressRef.current = false;
    }
  }, [clerkUser, dispatch, resumeBlockedQueue]);

  useEffect(() => {
    // Wait for Clerk to load
    if (!isAuthLoaded || !isUserLoaded) {
      return;
    }

    // Wait for secure API to be initialized (needs token getter from Clerk)
    if (!isSecureApiInitialized()) {
      return;
    }

    const authBecameAvailable = isSignedIn && previousSignedInRef.current !== true;

    if (isSignedIn && clerkUser) {
      // Skip if we already synced this clerk user (prevents loops)
      if (syncedClerkIdRef.current === clerkUser.id) {
        if (
          authBecameAvailable &&
          backendUser?.clerkUserId === clerkUser.id
        ) {
          resumeBlockedQueue();
        }
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
        if (authBecameAvailable) {
          resumeBlockedQueue();
        }
      }
    } else if (!isSignedIn) {
      // User signed out, clear local auth data and reset ref
      if (backendUser) {
        dispatch(clearLocalAuth({ preserveSyncQueue: true }));
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
    resumeBlockedQueue,
    dispatch,
  ]);

  useEffect(() => {
    if (!isAuthLoaded) {
      return;
    }

    previousSignedInRef.current = isSignedIn;
  }, [isAuthLoaded, isSignedIn]);

  return {
    backendUser,
    clerkUser,
    isSyncing,
    error,
    syncUser, // Expose for manual sync if needed
  };
}

export default useClerkUserSync;
