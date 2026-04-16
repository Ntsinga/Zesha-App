import "../global.css";
import "../styles/web.css";
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
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
  // Track whether the user has been signed in this session using a ref so it
  // updates synchronously during render — no effect delay, no race condition.
  const wasSignedInRef = useRef(false);
  if (isSignedIn === true) wasSignedInRef.current = true;
  // If mounting while already on an auth page (e.g. after sign-out hard redirect),
  // mark splash as done so it doesn't replay when navigating into the app.
  // On a true first visit (landing at "/"), animatedSplashDone starts false and splash plays normally.
  const [animatedSplashDone, setAnimatedSplashDone] = useState(() => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname;
    return (
      p.includes("/sign-in") ||
      p.includes("/sign-up") ||
      p.includes("/welcome") ||
      p.includes("/set-password")
    );
  });

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

  // Handle invite ticket immediately — do NOT wait for animatedSplashDone.
  // On Safari and other browsers with strict ITP, delaying this redirect by 4.4s
  // (the splash duration) causes the loader to hang because the app path ("/")
  // is not recognised as an auth page, keeping shouldBlockRendering true.
  useEffect(() => {
    if (!isLoaded) return;
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.has("__clerk_ticket");
    const alreadyOnSetPassword =
      window.location.pathname.includes("/set-password");
    if (ticket && !alreadyOnSetPassword) {
      router.replace(`/set-password${window.location.search}`);
    }
  }, [isLoaded, router]);

  // Handle sign-out immediately — no isLoaded dependency so the redirect fires
  // even if Clerk transiently sets isLoaded=false during sign-out processing.
  useEffect(() => {
    if (isSignedIn !== false) return;
    const path = window.location.pathname + window.location.search;
    const onAuthPage =
      path.includes("/sign-in") ||
      path.includes("/sign-up") ||
      path.includes("/welcome") ||
      path.includes("/set-password");
    if (!onAuthPage) {
      window.location.replace("/sign-in");
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !animatedSplashDone) return;

    const currentPath = window.location.pathname;
    const isOnSetPassword = currentPath.includes("/set-password");
    const isOnSignIn = currentPath.includes("/sign-in");
    const isOnSignUp = currentPath.includes("/sign-up");
    const isOnWelcome = currentPath.includes("/welcome");
    const isAuthPage =
      isOnSignIn || isOnSignUp || isOnWelcome || isOnSetPassword;

    // Invite ticket is handled by the early effect above — skip here.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("__clerk_ticket")) return;

    // Not signed in - redirect to sign-in unless on auth page
    if (!isSignedIn) {
      if (!isAuthPage) {
        const intended = window.location.pathname + window.location.search;
        router.replace(`/sign-in?redirect=${encodeURIComponent(intended)}`);
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
  }, [
    isSignedIn,
    isLoaded,
    animatedSplashDone,
    user?.id,
    user?.passwordEnabled,
    router,
  ]);

  // Determine if we're on an auth page (also treats invite ticket URLs as auth
  // pages so shouldBlockRendering never stalls the invite flow)
  const currentPath =
    typeof window !== "undefined" ? window.location.pathname : "";
  const currentSearch =
    typeof window !== "undefined" ? window.location.search : "";
  const isOnAuthPage =
    currentPath.includes("/sign-in") ||
    currentPath.includes("/sign-up") ||
    currentPath.includes("/welcome") ||
    currentPath.includes("/set-password") ||
    new URLSearchParams(currentSearch).has("__clerk_ticket");

  // For auth pages: only block on Clerk loading (not secure API or syncing)
  // For app pages: block on everything
  const hasUserData = !!cachedUser || !!syncedUser;
  const shouldBlockRendering =
    !isSecureApiReady || (!hasUserData && !isAuthInitialized);

  // Show a "signing out" overlay as soon as the sign-out transition begins.
  // wasSignedInRef updates synchronously on render so there's no effect-delay race.
  const isSigningOut =
    wasSignedInRef.current && isSignedIn !== true && !isOnAuthPage;

  // Splash only ever shows on app pages — never on auth pages and never during sign-out.
  // This prevents it flashing when the hard redirect lands on /sign-in.
  const showSplash =
    !isOnAuthPage &&
    !isSigningOut &&
    (!isLoaded || shouldBlockRendering || !animatedSplashDone);

  // Stack must always be mounted so router.replace() works during sign-out.
  // The isSigningOut overlay covers it visually until navigation completes.
  const canMountAppScreens = isOnAuthPage || isSecureApiReady;

  return (
    <View style={styles.container}>
      {canMountAppScreens && (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      )}
      {isSigningOut && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#fff",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div className="spinner" style={{ width: 36, height: 36 }} />
          <p style={{ fontSize: 15, color: "#6b7280", margin: 0 }}>
            Signing out…
          </p>
        </div>
      )}
      {showSplash && (
        <View style={StyleSheet.absoluteFill}>
          <AnimatedSplash onFinish={() => setAnimatedSplashDone(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});

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
