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
import { useRouter, useSegments } from "expo-router";
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
  }, [isSignedIn, isLoaded, user, segments, router]);

  // Show loading spinner while Clerk is loading, secure API initializing, or syncing user
  if (!isLoaded || !isSecureApiReady || isSyncing) {
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
