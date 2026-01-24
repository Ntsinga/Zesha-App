import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import TopBar from "../../components/TopBar";
import BottomNav from "../../components/BottomNav";

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <TopBar />
        <View style={styles.contentContainer}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="history" />
            <Stack.Screen name="transactions" />
            <Stack.Screen name="expenses" />
            <Stack.Screen name="balance" />
            <Stack.Screen name="add-balance" />
            <Stack.Screen name="add-cash-count" />
            <Stack.Screen name="reconciliation" />
            <Stack.Screen name="commissions" />
            <Stack.Screen name="add-commission" />
            <Stack.Screen name="accounts" />
            <Stack.Screen name="settings" />
          </Stack>
        </View>
        <BottomNav />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  contentContainer: {
    flex: 1,
  },
});
