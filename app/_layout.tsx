import "../global.css";
import React, { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import ErrorBoundary from "../components/ErrorBoundary";
import OfflineBanner from "../components/OfflineBanner";
import { store, persistor } from "../store";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { clearLocalAuth, initializeAuth } from "../store/slices/authSlice";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import {
  useRouter,
  useSegments,
  useLocalSearchParams,
  usePathname,
  useNavigationContainerRef,
} from "expo-router";
import { View } from "react-native";
import { useClerkUserSync } from "../hooks/useClerkUserSync";
import AnimatedSplash from "../components/AnimatedSplash";
import {
  initializeSecureApi,
  registerAuthRecoveryHandler,
} from "../services/secureApi";
import { startSyncEngine, stopSyncEngine } from "../services/syncEngine";
import { useNetworkStatus, NetworkContext } from "../hooks/useNetworkStatus";
import {
  initSentry,
  registerSentryNavigationContainer,
  setCurrentRouteContext,
  setCurrentUserContext,
  Sentry,
} from "../config/sentry";

initSentry();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Inner component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const navigationContainerRef = useNavigationContainerRef();
  const [isSecureApiReady, setIsSecureApiReady] = useState(false);
  const initialNavDoneRef = React.useRef(false);
  const authRecoveryInProgressRef = React.useRef(false);
  const [initialNavDone, setInitialNavDone] = useState(false);

  useEffect(() => {
    registerSentryNavigationContainer(navigationContainerRef);
  }, [navigationContainerRef]);

  useEffect(() => {
    setCurrentRouteContext(pathname);
  }, [pathname]);

  // Initialize secure API with Clerk token getter FIRST
  useEffect(() => {
    if (isLoaded && getToken) {
      initializeSecureApi(getToken);
      setIsSecureApiReady(true);
    }
  }, [isLoaded, getToken]);

  // Start sync engine once secure API is ready and user is signed in
  useEffect(() => {
    if (isSecureApiReady && isSignedIn) {
      startSyncEngine();
    }
    // Always stop on cleanup — avoids stale closure where the previous
    // render's isSignedIn (true) prevents stopSyncEngine from running.
    return () => {
      stopSyncEngine();
    };
  }, [isSecureApiReady, isSignedIn]);

  // Sync Clerk user with backend (only after secure API is ready)
  const { backendUser, clerkUser } = useClerkUserSync();
  const cachedUser = useAppSelector((state) => state.auth.user);

  // Keep a live ref to the current pathname so the auth recovery handler can
  // check it without capturing a stale closure value.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  });

  useEffect(() => {
    registerAuthRecoveryHandler(async () => {
      if (!isLoaded || authRecoveryInProgressRef.current) {
        return;
      }

      authRecoveryInProgressRef.current = true;

      try {
        await dispatch(clearLocalAuth({ preserveSyncQueue: true }));
        if (isSignedIn) {
          await signOut();
        }
      } catch (error) {
        console.error(
          "[AuthRecovery] Failed to redirect after session expiry:",
          error,
        );
      } finally {
        // Only redirect when not already on an auth page. Calling
        // router.replace("/(auth)/sign-in") from the sign-in page fires a
        // navigation event that can cause React Navigation's update-depth loop
        // on mount, especially on low-end devices.
        const currentPath = pathnameRef.current;
        const alreadyOnAuthPage =
          currentPath.includes("/sign-in") ||
          currentPath.includes("/sign-up") ||
          currentPath.includes("/welcome") ||
          currentPath.includes("/forgot-password") ||
          currentPath.includes("/set-password");
        if (!alreadyOnAuthPage) {
          router.replace("/(auth)/sign-in");
        }
      }
    });

    return () => {
      registerAuthRecoveryHandler(null);
      authRecoveryInProgressRef.current = false;
    };
    // router is a stable singleton — do NOT add it to deps. It changes reference
    // on every navigation state change, so including it would cause the cleanup to
    // run (and reset authRecoveryInProgressRef) on every navigation event, allowing
    // the handler to fire multiple times in rapid succession and re-enter the loop.
  }, [dispatch, isLoaded, isSignedIn, signOut]);

  useEffect(() => {
    const effectiveUser = backendUser ?? cachedUser;
    setCurrentUserContext(
      effectiveUser
        ? {
            id: effectiveUser.id,
            clerkUserId: effectiveUser.clerkUserId,
            email: effectiveUser.email,
            role: effectiveUser.role,
            companyId: effectiveUser.companyId,
          }
        : clerkUser
          ? {
              clerkUserId: clerkUser.id,
              email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
            }
          : null,
    );
  }, [backendUser, cachedUser, clerkUser]);

  useEffect(() => {
    // Initialize auth state on app load
    dispatch(initializeAuth());
  }, [dispatch]);

  // Stable derived values from segments — useSegments() returns a new array reference
  // on every render, so using `segments` directly in useEffect deps causes the effect
  // to fire every render. Booleans have value equality and are safe as deps.
  const inAuthGroup = segments[0] === "(auth)";
  const isOnSetPassword = pathname.includes("/set-password");
  const isOnWelcome = pathname.includes("/welcome");
  const isOnSignUp = pathname.includes("/sign-up");
  const isOnSignIn = pathname.includes("/sign-in");
  const isOnForgotPassword = pathname.includes("/forgot-password");
  const isOnAuthPage =
    isOnSignIn ||
    isOnSignUp ||
    isOnWelcome ||
    isOnSetPassword ||
    isOnForgotPassword ||
    inAuthGroup;
  const hasInviteTicket = !!params.__clerk_ticket;
  const inviteTicket = params.__clerk_ticket as string | undefined;

  useEffect(() => {
    if (!isLoaded) return;

    // Don't make routing decisions while user object is still loading after sign-in
    if (isSignedIn && !user) return;

    // If there's an invite ticket and not on set-password, redirect to set-password.
    // Invited users are already created in Clerk - they just need to set their password.
    // Do NOT set initialNavDone here — the deep link target (e.g. sign-up) would flash
    // for a frame before router.replace takes effect. Keep rendering null until the
    // navigation lands on set-password and the effect re-fires via the normal path.
    if (hasInviteTicket && !isOnSetPassword) {
      router.replace({
        pathname: "/(auth)/set-password",
        params: { __clerk_ticket: inviteTicket! },
      });
      return;
    }

    // Allow unauthenticated access to auth screens for invite and recovery flows.
    if (!isSignedIn && isOnAuthPage) {
      if (!initialNavDoneRef.current) {
        initialNavDoneRef.current = true;
        setInitialNavDone(true);
      }
      return;
    }

    // Check if authenticated user needs to set password
    if (isSignedIn && user && !user.passwordEnabled) {
      // Force password setup for users without passwords
      if (!inAuthGroup || !isOnSetPassword) {
        router.replace("/(auth)/set-password");
      }
      if (!initialNavDoneRef.current) {
        initialNavDoneRef.current = true;
        setInitialNavDone(true);
      }
      return;
    }

    if (!isSignedIn && !isOnAuthPage) {
      // Redirect to sign-in if not authenticated and not in auth group
      router.replace("/(auth)/sign-in");
    } else if (
      isSignedIn &&
      user?.passwordEnabled &&
      isOnAuthPage &&
      !isOnSetPassword
    ) {
      // Redirect to app if authenticated with password and in auth group
      router.replace("/(app)");
    }

    // Mark initial navigation decision as done (only once)
    if (!initialNavDoneRef.current) {
      initialNavDoneRef.current = true;
      setInitialNavDone(true);
    }
  }, [
    isSignedIn,
    isLoaded,
    user?.passwordEnabled,
    inAuthGroup,
    isOnAuthPage,
    isOnSetPassword,
    isOnWelcome,
    isOnSignUp,
    isOnSignIn,
    isOnForgotPassword,
    hasInviteTicket,
    inviteTicket,
    // router is a stable singleton from useRouter() — must NOT be in deps;
    // adding it causes the effect to re-fire on every navigation state change,
    // creating an infinite router.replace → re-render → re-fire loop.
  ]);

  // App is ready once Clerk is loaded and the secure API (token getter) is
  // initialised.  We intentionally do NOT gate on `isSyncing` — the backend
  // sync is a background operation and all routing decisions already fall back
  // to Clerk metadata.  Blocking the tree on `isSyncing` causes a blank screen
  // when the user navigates from (auth) → (app) while the first sync is in
  // flight, and creates an infinite blank-screen loop if the sync keeps failing.
  const isAppReady = isLoaded && isSecureApiReady;

  const [animatedSplashDone, setAnimatedSplashDone] = useState(false);

  // Hide the native splash as soon as app logic is ready
  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync();
    }
  }, [isAppReady]);

  // Keep native splash visible while loading
  if (!isAppReady) {
    return null;
  }

  // Show the animated branded splash on native
  if (!animatedSplashDone) {
    return <AnimatedSplash onFinish={() => setAnimatedSplashDone(true)} />;
  }

  // Hold rendering until the first routing decision has been made (prevents flash)
  if (!initialNavDone) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="agency-setup" />
      </Stack>
    </View>
  );
}

function RootLayoutNav() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  const networkStatus = useNetworkStatus();

  if (!publishableKey) {
    throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env.local",
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ErrorBoundary>
        <Provider store={store}>
          {persistor ? (
            <PersistGate loading={null} persistor={persistor}>
              <NetworkContext.Provider value={networkStatus}>
                <AppContent />
              </NetworkContext.Provider>
            </PersistGate>
          ) : (
            <NetworkContext.Provider value={networkStatus}>
              <AppContent />
            </NetworkContext.Provider>
          )}
        </Provider>
      </ErrorBoundary>
    </ClerkProvider>
  );
}

export default Sentry.wrap(RootLayoutNav);
