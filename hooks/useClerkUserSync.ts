import { useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-expo";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  syncUserWithBackend,
  clearLocalAuth,
  UserSyncRequest,
} from "../store/slices/authSlice";

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

    // Extract company_id and role from Clerk public metadata (set during invite)
    const publicMetadata = clerkUser.publicMetadata as
      | { company_id?: number; role?: string }
      | undefined;
    const companyId = publicMetadata?.company_id || null;
    const role = (publicMetadata?.role as any) || null;

    // Build sync request from Clerk user data
    const syncData: UserSyncRequest = {
      clerk_user_id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      profile_image_url: clerkUser.imageUrl,
      phone_number: clerkUser.primaryPhoneNumber?.phoneNumber || null,
      user_metadata: clerkUser.publicMetadata
        ? JSON.stringify(clerkUser.publicMetadata)
        : null,
      company_id: companyId,
      role: role,
    };

    console.log("[UserSync] Sync data:", JSON.stringify(syncData, null, 2));

    // Only sync if we have required data
    if (syncData.email && syncData.clerk_user_id) {
      console.log("[UserSync] Dispatching syncUserWithBackend...");
      const result = await dispatch(syncUserWithBackend(syncData));
      console.log("[UserSync] Sync result:", result);
    } else {
      console.log("[UserSync] Missing required data - email or clerk_user_id");
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
      // User is signed in, sync with backend
      // Only sync if we don't have a backend user or if Clerk user has changed
      if (!backendUser || backendUser.clerk_user_id !== clerkUser.id) {
        console.log(
          "[UserSync] Triggering sync - no backend user or user changed",
        );
        syncUser();
      } else {
        console.log("[UserSync] Backend user already synced");
      }
    } else if (!isSignedIn && backendUser) {
      // User signed out, clear local auth data
      console.log("[UserSync] User signed out, clearing local auth");
      dispatch(clearLocalAuth());
    }
  }, [
    isSignedIn,
    isAuthLoaded,
    isUserLoaded,
    clerkUser,
    backendUser,
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
