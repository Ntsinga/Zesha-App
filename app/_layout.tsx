import "../global.css";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { Provider } from "react-redux";
import CustomDrawerContent from "../components/CustomDrawerContent";
import { StatusBar } from "expo-status-bar";
import ErrorBoundary from "../components/ErrorBoundary";
import { store } from "../store";
import { useAppDispatch } from "../store/hooks";
import { initializeAuth } from "../store/slices/authSlice";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useRouter, useSegments } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useClerkUserSync } from "../hooks/useClerkUserSync";

// Inner component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Sync Clerk user with backend
  const { isSyncing } = useClerkUserSync();

  useEffect(() => {
    // Initialize auth state on app load
    dispatch(initializeAuth());
  }, [dispatch]);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      // Redirect to sign-in if not authenticated and not in auth group
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      // Redirect to home if authenticated and in auth group
      router.replace("/");
    }
  }, [isSignedIn, isLoaded, segments]);

  // Show loading spinner while Clerk is loading or syncing user
  if (!isLoaded || isSyncing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#C62828" />
      </View>
    );
  }

  // Show loading while redirecting to prevent flash of wrong screen
  const inAuthGroup = segments[0] === "(auth)";
  if (!isSignedIn && !inAuthGroup) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#C62828" />
      </View>
    );
  }

  if (isSignedIn && inAuthGroup) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#C62828" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "front",
          drawerStyle: {
            width: 280,
            backgroundColor: "#C62828",
          },
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Dashboard" }} />
        <Drawer.Screen name="history" options={{ title: "Balance History" }} />
        <Drawer.Screen
          name="transactions"
          options={{ title: "Transactions" }}
        />
        <Drawer.Screen name="expenses" options={{ title: "Expenses" }} />
        <Drawer.Screen
          name="balance"
          options={{ title: "Balance", drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="add-balance"
          options={{
            title: "Add Balance",
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="add-cash-count"
          options={{
            title: "Add Cash Count",
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="balance-detail"
          options={{
            title: "Balance Detail",
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen name="commissions" options={{ title: "Commissions" }} />
        <Drawer.Screen
          name="add-commission"
          options={{
            title: "Add Commission",
            drawerItemStyle: { display: "none" },
          }}
        />
        <Drawer.Screen
          name="accounts"
          options={{ title: "Accounts", drawerItemStyle: { display: "none" } }}
        />
        <Drawer.Screen
          name="settings"
          options={{ title: "Settings", drawerItemStyle: { display: "none" } }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

export default function RootLayoutNav() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error(
      "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env.local"
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
