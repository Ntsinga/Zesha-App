import React, { useRef } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "../../components/CustomDrawerContent";
import TopBar from "../../components/TopBar";
import BottomNav from "../../components/BottomNav";

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.drawerContainer}>
          <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
              headerShown: true,
              header: () => (
                <TopBar onMenuPress={() => navigation.toggleDrawer()} />
              ),
              drawerType: "front",
              drawerStyle: {
                width: 280,
                backgroundColor: "#C62828",
              },
            })}
          >
            <Drawer.Screen name="index" options={{ title: "Dashboard" }} />
            <Drawer.Screen
              name="history"
              options={{ title: "Balance History" }}
            />
            <Drawer.Screen
              name="transactions"
              options={{ title: "Transactions" }}
            />
            <Drawer.Screen name="expenses" options={{ title: "Expenses" }} />
            <Drawer.Screen
              name="balance"
              options={{
                title: "Balance",
                drawerItemStyle: { display: "none" },
              }}
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
              name="reconciliation"
              options={{
                title: "Balance Detail",
                drawerItemStyle: { display: "none" },
              }}
            />
            <Drawer.Screen
              name="commissions"
              options={{ title: "Commissions" }}
            />
            <Drawer.Screen
              name="add-commission"
              options={{
                title: "Add Commission",
                drawerItemStyle: { display: "none" },
              }}
            />
            <Drawer.Screen
              name="accounts"
              options={{
                title: "Accounts",
                drawerItemStyle: { display: "none" },
              }}
            />
            <Drawer.Screen
              name="settings"
              options={{
                title: "Settings",
                drawerItemStyle: { display: "none" },
              }}
            />
          </Drawer>
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
  drawerContainer: {
    flex: 1,
  },
});
