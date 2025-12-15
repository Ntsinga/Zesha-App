import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import CustomDrawerContent from "../../components/CustomDrawerContent";

export default function AppLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
