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
    if (!clerkUser) return;

    // Build sync request from Clerk user data
    const syncData: UserSyncRequest = {
      clerk_user_id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || "",
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      profile_image_url: clerkUser.imageUrl,
      phone_number: clerkUser.primaryPhoneNumber?.phoneNumber || null,
      metadata: null, // Can store additional Clerk metadata as JSON string
    };

    // Only sync if we have required data
    if (syncData.email && syncData.clerk_user_id) {
      await dispatch(syncUserWithBackend(syncData));
    }
  }, [clerkUser, dispatch]);

  useEffect(() => {
    // Wait for Clerk to load
    if (!isAuthLoaded || !isUserLoaded) return;

    if (isSignedIn && clerkUser) {
      // User is signed in, sync with backend
      // Only sync if we don't have a backend user or if Clerk user has changed
      if (!backendUser || backendUser.clerk_user_id !== clerkUser.id) {
        syncUser();
      }
    } else if (!isSignedIn && backendUser) {
      // User signed out, clear local auth data
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
