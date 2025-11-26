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

// Inner component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize auth state on app load
    dispatch(initializeAuth());
  }, [dispatch]);

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
      </Drawer>
    </GestureHandlerRootView>
  );
}

export default function Layout() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </ErrorBoundary>
  );
}
