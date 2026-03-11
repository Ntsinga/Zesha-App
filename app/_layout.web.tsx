import "../global.css";
import "../styles/web.css";
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import ErrorBoundary from "../components/ErrorBoundary";
import { store } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { initializeAuth } from "../store/slices/authSlice";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { useRouter } from "expo-router";
import { useClerkUserSync } from "../hooks/useClerkUserSync.web";
import { initializeSecureApi } from "../services/secureApi";
import AnimatedSplash from "../components/AnimatedSplash";

// Inner component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const [isSecureApiReady, setIsSecureApiReady] = useState(false);
  const [animatedSplashDone, setAnimatedSplashDone] = useState(false);

  // Initialize secure API with Clerk token getter FIRST
  useEffect(() => {
    if (isLoaded && getToken) {
      initializeSecureApi(getToken);
      setIsSecureApiReady(true);
    }
  }, [isLoaded, getToken]);

  // Sync Clerk user with backend (only after secure API is ready)
  const { isSyncing, backendUser: syncedUser } = useClerkUserSync();

  // Also read the Redux auth state directly (populated by initializeAuth from cache)
  const cachedUser = useAppSelector((state) => state.auth.user);
  const isAuthInitialized = useAppSelector((state) => state.auth.isInitialized);

  useEffect(() => {
    // Initialize auth state on app load (reads from localStorage cache)
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
    return <AnimatedSplash onFinish={() => setAnimatedSplashDone(true)} />;
  }

  // For non-auth pages, wait for secure API and auth initialization.
  // Once we have a cached user from localStorage (via initializeAuth), proceed immediately.
  // Don't block on backend sync — the cached user has role info needed for routing.
  const hasUserData = !!cachedUser || !!syncedUser;
  const shouldBlockRendering =
    !isSecureApiReady || (!hasUserData && !isAuthInitialized);

  if (!isOnAuthPage && shouldBlockRendering) {
    return <AnimatedSplash onFinish={() => setAnimatedSplashDone(true)} />;
  }

  if (!animatedSplashDone) {
    return <AnimatedSplash onFinish={() => setAnimatedSplashDone(true)} />;
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
