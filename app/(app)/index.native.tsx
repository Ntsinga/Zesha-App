import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  Wallet,
  Camera,
  Menu,
  TrendingUp,
  TrendingDown,
} from "lucide-react-native";
import { useNavigation, useRouter } from "expo-router";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useDashboardScreen } from "../../hooks/screens/useDashboardScreen";
import type { AccountSummary } from "../../types";

/**
 * Native Dashboard - optimized for mobile devices
 */
export default function DashboardNative() {
  const navigation = useNavigation();
  const router = useRouter();

  const {
    isLoading,
    refreshing,
    currentShift,
    snapshotDate,
    accounts,
    companyName,
    totalFloat,
    totalCash,
    grandTotal,
    expectedGrandTotal,
    capitalVariance,
    totalExpenses,
    outstandingBalance,
    totalCommission,
    dailyCommission,
    formatCurrency,
    formatCompactCurrency,
    onRefresh,
    handleShiftChange,
  } = useDashboardScreen();

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8 mt-4">
          <View>
            <Text className="text-3xl font-bold text-gray-800">Zesha App</Text>
            <Text className="text-gray-500 mt-1">Hi: {companyName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer()}
            className="p-2 bg-brand-red rounded-md shadow-sm"
          >
            <Menu color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Shift Toggle */}
        <View className="flex-row mb-4 bg-white rounded-xl p-1 shadow-sm">
          <TouchableOpacity
            onPress={() => handleShiftChange("AM")}
            className={`flex-1 py-2 rounded-lg ${
              currentShift === "AM" ? "bg-brand-red" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-bold ${
                currentShift === "AM" ? "text-white" : "text-gray-600"
              }`}
            >
              AM Shift
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleShiftChange("PM")}
            className={`flex-1 py-2 rounded-lg ${
              currentShift === "PM" ? "bg-brand-red" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-center font-bold ${
                currentShift === "PM" ? "text-white" : "text-gray-600"
              }`}
            >
              PM Shift
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Stats Card */}
        <View className="relative overflow-hidden rounded-3xl bg-brand-gold shadow-lg p-6 mb-4">
          <View className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-20 rounded-full" />

          {/* Grand Total */}
          <View className="border-b border-brand-darkGold/30 pb-4 mb-4">
            <Text className="text-red-900/70 font-semibold text-lg">
              Total Operating Capital
            </Text>
            <Text className="text-4xl font-bold text-red-900">
              {formatCurrency(grandTotal)}
            </Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            <View className="mb-4 w-1/2">
              <Text className="text-red-900/80 font-bold text-xl">Float</Text>
              <Text className="text-2xl font-bold text-red-900">
                {formatCurrency(totalFloat)}
              </Text>
            </View>
            <View className="w-1/2 pl-4 justify-center space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-red-900 font-semibold">Cash</Text>
                <Text className="text-red-900 font-bold">
                  {formatCompactCurrency(totalCash)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-red-900 font-semibold">Outst.</Text>
                <Text className="text-red-900 font-bold">
                  {formatCompactCurrency(outstandingBalance)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Expected vs Actual Card */}
        <View className="bg-white rounded-3xl shadow-sm p-4 mb-4 border border-gray-100">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-bold text-gray-800">Comparison</Text>
            <Text className="text-xs text-gray-500">{snapshotDate}</Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Expected Total</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(expectedGrandTotal)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Actual Total</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(grandTotal)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Total Expenses</Text>
            <Text className="font-bold text-red-600">
              -{formatCurrency(totalExpenses)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Daily Commission</Text>
            <Text className="font-bold text-green-600">
              +{formatCurrency(dailyCommission)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Total Commission</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(totalCommission)}
            </Text>
          </View>

          <View className="border-t border-gray-100 pt-2 mt-2 flex-row justify-between items-center">
            <Text className="text-gray-700 font-semibold">Variance</Text>
            <View className="flex-row items-center">
              {capitalVariance >= 0 ? (
                <TrendingUp color="#16A34A" size={16} />
              ) : (
                <TrendingDown color="#DC2626" size={16} />
              )}
              <Text
                className={`font-bold ml-1 ${
                  capitalVariance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {capitalVariance >= 0 ? "+" : ""}
                {formatCurrency(capitalVariance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Accounts List */}
        <View className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
          <Text className="text-xl font-bold text-brand-red mb-6">
            Current Float Balances
          </Text>

          <View className="mb-4">
            <View className="flex-row justify-between pb-2 border-b border-gray-100 mb-2">
              <Text className="font-bold text-gray-800 flex-1">Account</Text>
              <Text className="font-bold text-gray-800 w-24 text-center">
                Amount
              </Text>
              <Text className="font-bold text-gray-800 w-20 text-right">
                Pic
              </Text>
            </View>
            {accounts.map((account: AccountSummary, idx: number) => (
              <View
                key={`account-${idx}`}
                className="flex-row items-center py-4 border-b border-gray-50"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-gray-700">
                    {account.account_name}
                  </Text>
                  <Text className="text-xs text-gray-400">{account.shift}</Text>
                </View>
                <View className="w-24 flex-row justify-center space-x-2">
                  <Text className="text-gray-600 font-medium">
                    {formatCurrency(account.balance || 0)}
                  </Text>
                </View>
                <View className="w-20 items-end">
                  <View className="flex-row items-center space-x-1">
                    <Camera size={14} color="#9CA3AF" />
                    <Text className="text-xs text-gray-400">View</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Action Button */}
          <View className="mt-4">
            <TouchableOpacity
              onPress={() => router.push("/balance")}
              className="bg-brand-red py-4 rounded-xl shadow-md flex-row items-center justify-center space-x-2"
            >
              <Wallet color="white" size={20} />
              <Text className="text-white font-bold text-base ml-2">
                Reconcile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
