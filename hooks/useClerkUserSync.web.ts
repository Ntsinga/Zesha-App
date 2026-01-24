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

  const {
    user: backendUser,
    isSyncing,
    error,
  } = useAppSelector((state) => state.auth);

  const syncUser = useCallback(async () => {
    if (!clerkUser) {
      console.log("[UserSync Web] No Clerk user available");
      return;
    }

    // Mark this clerk user as synced to prevent duplicate syncs
    syncedClerkIdRef.current = clerkUser.id;

    console.log("[UserSync Web] Starting sync for Clerk user:", clerkUser.id);
    console.log(
      "[UserSync Web] Full Clerk publicMetadata:",
      JSON.stringify(clerkUser.publicMetadata, null, 2),
    );

    // Extract companyId and role from Clerk public metadata (set during invite)
    const publicMetadata = clerkUser.publicMetadata as
      | { company_id?: number; role?: RoleEnum }
      | undefined;

    console.log("[UserSync Web] Extracted publicMetadata:", publicMetadata);
    const companyId = publicMetadata?.company_id ?? null;
    const role = publicMetadata?.role ?? null;
    console.log(
      "[UserSync Web] Extracted companyId:",
      companyId,
      "(type:",
      typeof companyId,
      ")",
    );
    console.log("[UserSync Web] Extracted role:", role);

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

    console.log("[UserSync Web] Sync data:", JSON.stringify(syncData, null, 2));

    // Only sync if we have required data
    if (syncData.email && syncData.clerkUserId) {
      console.log("[UserSync Web] Dispatching syncUserWithBackend...");
      const result = await dispatch(syncUserWithBackend(syncData));
      console.log("[UserSync Web] Sync result:", result);
    } else {
      console.log(
        "[UserSync Web] Missing required data - email or clerkUserId",
      );
    }
  }, [clerkUser, dispatch]);

  useEffect(() => {
    // Wait for Clerk to load
    if (!isAuthLoaded || !isUserLoaded) {
      console.log("[UserSync Web] Waiting for Clerk to load...", {
        isAuthLoaded,
        isUserLoaded,
      });
      return;
    }

    // Wait for secure API to be initialized (needs token getter from Clerk)
    if (!isSecureApiInitialized()) {
      console.log("[UserSync Web] Waiting for secure API to initialize...");
      return;
    }

    console.log("[UserSync Web] Clerk loaded. Checking auth state...", {
      isSignedIn,
      hasClerkUser: !!clerkUser,
      hasBackendUser: !!backendUser,
      syncedClerkId: syncedClerkIdRef.current,
      clerkUserId: clerkUser?.id,
    });

    if (isSignedIn && clerkUser) {
      // Check if we already synced this clerk user (using ref to prevent loops)
      if (syncedClerkIdRef.current === clerkUser.id) {
        console.log("[UserSync Web] Already synced this clerk user, skipping");
        return;
      }

      // Don't sync if already syncing
      if (isSyncing) {
        console.log("[UserSync Web] Already syncing, skipping");
        return;
      }

      // Sync if: no backend user OR different clerk user
      const needsSync =
        !backendUser || backendUser.clerkUserId !== clerkUser.id;
      console.log("[UserSync Web] Needs sync?", needsSync);

      if (needsSync) {
        console.log("[UserSync Web] Triggering sync");
        syncUser();
      } else {
        // Backend user exists and matches - mark as synced
        syncedClerkIdRef.current = clerkUser.id;
        console.log("[UserSync Web] Backend user already synced");
      }
    } else if (!isSignedIn) {
      // User signed out, clear synced ref and local auth
      syncedClerkIdRef.current = null;
      if (backendUser) {
        console.log("[UserSync Web] User signed out, clearing local auth");
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
