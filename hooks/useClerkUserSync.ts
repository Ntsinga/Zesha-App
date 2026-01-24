import { useEffect, useCallback, useRef } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { syncUserWithBackend, clearLocalAuth } from "../store/slices/authSlice";
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

  const {
    user: backendUser,
    isSyncing,
    error,
  } = useAppSelector((state) => state.auth);

  const syncUser = useCallback(async () => {
    if (!clerkUser) {
      console.log("[UserSync] No Clerk user available");
      return;
    }

    console.log("[UserSync] Starting sync for Clerk user:", clerkUser.id);

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

    console.log("[UserSync] Sync data:", JSON.stringify(syncData, null, 2));

    // Only sync if we have required data
    if (syncData.email && syncData.clerkUserId) {
      console.log("[UserSync] Dispatching syncUserWithBackend...");
      const result = await dispatch(syncUserWithBackend(syncData));
      console.log("[UserSync] Sync result:", result);
      // Mark this clerk user as synced
      syncedClerkIdRef.current = clerkUser.id;
    } else {
      console.log("[UserSync] Missing required data - email or clerkUserId");
    }
  }, [clerkUser, dispatch]);

  useEffect(() => {
    // Wait for Clerk to load
    if (!isAuthLoaded || !isUserLoaded) {
      console.log("[UserSync] Waiting for Clerk to load...", {
        isAuthLoaded,
        isUserLoaded,
      });
      return;
    }

    console.log("[UserSync] Clerk loaded. Checking auth state...", {
      isSignedIn,
      hasClerkUser: !!clerkUser,
      hasBackendUser: !!backendUser,
    });

    if (isSignedIn && clerkUser) {
      // Skip if we already synced this clerk user (prevents loops)
      if (syncedClerkIdRef.current === clerkUser.id) {
        console.log("[UserSync] Already synced this clerk user, skipping");
        return;
      }

      // Skip if currently syncing
      if (isSyncing) {
        console.log("[UserSync] Already syncing, skipping");
        return;
      }

      // Check if we need to sync
      const needsSync =
        !backendUser || backendUser.clerkUserId !== clerkUser.id;

      if (needsSync) {
        console.log(
          "[UserSync] Triggering sync - no backend user or user changed",
        );
        syncUser();
      } else {
        // Backend user is already synced, mark it in the ref
        console.log("[UserSync] Backend user already synced");
        syncedClerkIdRef.current = clerkUser.id;
      }
    } else if (!isSignedIn) {
      // User signed out, clear local auth data and reset ref
      if (backendUser) {
        console.log("[UserSync] User signed out, clearing local auth");
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
