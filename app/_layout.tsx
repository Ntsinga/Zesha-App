import "../global.css";
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "../components/ErrorBoundary";
import { store } from "../store";
import { useAppDispatch } from "../store/hooks";
import { initializeAuth } from "../store/slices/authSlice";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useRouter, useSegments, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useClerkUserSync } from "../hooks/useClerkUserSync";
import { initializeSecureApi } from "../services/secureApi";

// Inner component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams();
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

    const inAuthGroup = segments[0] === "(auth)";
    // Type assertion to handle segments array properly
    const authSegments = segments as string[];
    const isOnSetPassword = authSegments[1] === "set-password";
    const isOnWelcome = authSegments[1] === "welcome";
    const isOnSignUp = authSegments[1] === "sign-up";

    console.log("[Layout] Auth state:", {
      isSignedIn,
      hasUser: !!user,
      passwordEnabled: user?.passwordEnabled,
      segments: authSegments,
    });

    // Check for invite ticket in URL params
    const hasInviteTicket = !!params.__clerk_ticket;

    // If there's an invite ticket and not on set-password, redirect to set-password
    // Invited users are already created in Clerk - they just need to set their password
    if (hasInviteTicket && !isOnSetPassword) {
      console.log(
        "[Layout] Invite ticket detected, redirecting to set-password",
      );
      router.replace({
        pathname: "/(auth)/set-password",
        params: { __clerk_ticket: params.__clerk_ticket as string },
      });
      return;
    }

    // Allow unauthenticated access to welcome, sign-up, and set-password for invite flow
    if (!isSignedIn && (isOnWelcome || isOnSignUp || isOnSetPassword)) {
      return; // Don't redirect, allow these pages during invite flow
    }

    // Check if authenticated user needs to set password
    if (isSignedIn && user && !user.passwordEnabled) {
      // Force password setup for users without passwords
      if (!inAuthGroup || !isOnSetPassword) {
        router.replace("/(auth)/set-password");
      }
      return;
    }

    if (!isSignedIn && !inAuthGroup) {
      // Redirect to sign-in if not authenticated and not in auth group
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && user?.passwordEnabled && inAuthGroup) {
      // Redirect to app if authenticated with password and in auth group
      router.replace("/(app)");
    }
  }, [isSignedIn, isLoaded, user?.passwordEnabled, segments, router]);

  // Determine if we're on an auth page
  const inAuthGroup = segments[0] === "(auth)";

  // Show loading spinner while Clerk is loading or secure API initializing
  // Don't block on isSyncing for auth pages - let them render while sync happens in background
  if (!isLoaded || !isSecureApiReady || (isSyncing && !inAuthGroup)) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#C62828" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </>
  );
}

export default function RootLayoutNav() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env.local",
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ErrorBoundary>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </ErrorBoundary>
    </ClerkProvider>
  );
}
