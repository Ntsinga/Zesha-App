import "../global.css";
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import ErrorBoundary from "../components/ErrorBoundary";
import { store } from "../store";
import { useAppDispatch } from "../store/hooks";
import { initializeAuth } from "../store/slices/authSlice";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import { useClerkUserSync } from "../hooks/useClerkUserSync.web";
import { initializeSecureApi } from "../services/secureApi";

// Inner component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isSecureApiReady, setIsSecureApiReady] = useState(false);

  // Initialize secure API with Clerk token getter FIRST
  useEffect(() => {
    if (isLoaded && getToken) {
      initializeSecureApi(getToken);
      setIsSecureApiReady(true);
    }
  }, [isLoaded, getToken]);

  // Sync Clerk user with backend (only after secure API is ready)
  const { isSyncing } = useClerkUserSync();

  useEffect(() => {
    // Initialize auth state on app load
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded) return;

    const currentPath = window.location.pathname;
    const isOnSetPassword = currentPath.includes("/set-password");
    const isOnSignIn = currentPath.includes("/sign-in");
    const isOnSignUp = currentPath.includes("/sign-up");
    const isOnWelcome = currentPath.includes("/welcome");
    const isAuthPage =
      isOnSignIn || isOnSignUp || isOnWelcome || isOnSetPassword;

    // Check for invite ticket in URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasInviteTicket = urlParams.has("__clerk_ticket");

    // Redirect invite ticket to set-password
    if (hasInviteTicket && !isOnSetPassword) {
      router.replace(`/set-password${window.location.search}`);
      return;
    }

    // Not signed in - redirect to sign-in unless on auth page
    if (!isSignedIn) {
      if (!isAuthPage) {
        router.replace("/sign-in");
      }
      return;
    }

    // Signed in but no user object yet - wait
    if (!user) return;

    // Signed in without password - redirect to set-password
    if (!user.passwordEnabled) {
      if (!isOnSetPassword) {
        router.replace("/set-password");
      }
      return;
    }

    // Fully authenticated - redirect away from auth pages
    if (isAuthPage && !isOnSetPassword) {
      router.replace("/");
    }
  }, [isSignedIn, isLoaded, user?.id, user?.passwordEnabled, router]);

  // Determine if we're on an auth page
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const isOnAuthPage =
    currentPath.includes("/sign-in") ||
    currentPath.includes("/sign-up") ||
    currentPath.includes("/welcome") ||
    currentPath.includes("/set-password");

  // For auth pages: only block on Clerk loading (not secure API or syncing)
  // For app pages: block on everything
  if (!isLoaded) {
    // Clerk is still loading - show spinner with inline styles (CSS might not be loaded)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e5e7eb",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // For non-auth pages, also wait for secure API and sync to complete
  if (!isOnAuthPage && (!isSecureApiReady || isSyncing)) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "#f9fafb",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "4px solid #e5e7eb",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
