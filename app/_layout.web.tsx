import "../global.css";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import ErrorBoundary from "../components/ErrorBoundary";
import { store } from "../store";
import { useAppDispatch } from "../store/hooks";
import { initializeAuth } from "../store/slices/authSlice";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import { useClerkUserSync } from "../hooks/useClerkUserSync.web";

// Inner component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  // Sync Clerk user with backend
  const { isSyncing } = useClerkUserSync();

  useEffect(() => {
    // Initialize auth state on app load
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded) return;

    const currentPath = window.location.pathname;
    const hasInviteTicket = window.location.search.includes("__clerk_ticket");

    const inAuthGroup =
      currentPath.includes("/sign-in") ||
      currentPath.includes("/sign-up") ||
      currentPath.includes("/welcome") ||
      currentPath.includes("/set-password");

    // Don't redirect if user has an invite ticket - let them complete signup
    if (hasInviteTicket) {
      return;
    }

    // Check if authenticated user needs to set password
    if (isSignedIn && user && !user.passwordEnabled) {
      // Force password setup for users without passwords
      if (!currentPath.includes("/set-password")) {
        router.replace("/set-password");
      }
      return;
    }

    if (!isSignedIn && !inAuthGroup) {
      // Redirect to sign-in if not authenticated and not in auth group
      router.replace("/sign-in");
    } else if (isSignedIn && user?.passwordEnabled && inAuthGroup) {
      // Redirect to app if authenticated with password and in auth group
      router.replace("/");
    }
  }, [isSignedIn, isLoaded, user, router]);

  // Show loading while Clerk is loading or syncing user
  if (!isLoaded || isSyncing) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

export default function RootLayoutWeb() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ErrorBoundary>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </ErrorBoundary>
    </ClerkProvider>
  );
}
