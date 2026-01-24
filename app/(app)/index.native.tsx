import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useDashboardScreen } from "../../hooks/screens/useDashboardScreen";
import type { AccountSummary } from "../../types";

/**
 * Native Dashboard - redesigned to match modern UI
 */
export default function DashboardNative() {
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
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View className="px-5 pt-6 pb-4 bg-white">
          <Text className="text-3xl font-bold text-gray-900">Zesha App</Text>
          <Text className="text-base text-gray-500 mt-1">
            Hi, {companyName}
          </Text>
        </View>

        {/* Shift Toggle */}
        <View className="px-5 py-4 bg-white">
          <View className="flex-row bg-gray-100 rounded-2xl p-1">
            <TouchableOpacity
              onPress={() => handleShiftChange("AM")}
              className={`flex-1 py-3 rounded-xl ${
                currentShift === "AM" ? "bg-red-600" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-bold text-base ${
                  currentShift === "AM" ? "text-white" : "text-gray-600"
                }`}
              >
                AM Shift
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleShiftChange("PM")}
              className={`flex-1 py-3 rounded-xl ${
                currentShift === "PM" ? "bg-red-600" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-bold text-base ${
                  currentShift === "PM" ? "text-white" : "text-gray-600"
                }`}
              >
                PM Shift
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Operating Capital Card */}
        <View className="px-5 py-4">
          <View className="bg-yellow-400 rounded-3xl p-6 shadow-md">
            {/* Title */}
            <Text className="text-yellow-800 font-semibold text-sm uppercase tracking-wide mb-2">
              Total Operating Capital
            </Text>

            {/* Grand Total */}
            <Text className="text-4xl font-bold text-yellow-900 mb-6">
              {formatCurrency(grandTotal)}
            </Text>

            {/* Float and Cash Row */}
            <View className="flex-row">
              {/* Float Section */}
              <View className="flex-1">
                <Text className="text-yellow-800 font-semibold text-sm uppercase mb-1">
                  Float
                </Text>
                <Text className="text-2xl font-bold text-yellow-900">
                  {formatCurrency(totalFloat)}
                </Text>
              </View>

              {/* Divider */}
              <View className="w-px bg-yellow-600 mx-4" />

              {/* Cash Section */}
              <View className="flex-1">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-yellow-800 font-semibold text-xs">
                    Cash
                  </Text>
                  <Text className="text-yellow-900 font-bold text-sm">
                    {formatCompactCurrency(totalCash)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-yellow-800 font-semibold text-xs">
                    OUTST.
                  </Text>
                  <Text className="text-yellow-900 font-bold text-sm">
                    {formatCompactCurrency(outstandingBalance)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Comparison Section */}
        <View className="px-5 py-4">
          <View className="bg-white rounded-3xl p-6 shadow-sm">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Comparison
              </Text>
              <View className="flex-row items-center bg-gray-50 px-3 py-2 rounded-lg">
                <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                <Text className="text-sm text-gray-600 ml-2">
                  {snapshotDate}
                </Text>
              </View>
            </View>

            {/* Comparison Items */}
            <View className="space-y-4">
              {/* Expected Total */}
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-600 text-base">Expected Total</Text>
                <Text className="font-bold text-gray-900 text-base">
                  {formatCurrency(expectedGrandTotal)}
                </Text>
              </View>

              {/* Actual Total */}
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-600 text-base">Actual Total</Text>
                <Text className="font-bold text-gray-900 text-base">
                  {formatCurrency(grandTotal)}
                </Text>
              </View>

              {/* Total Expenses */}
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-600 text-base">Total Expenses</Text>
                <Text className="font-bold text-red-600 text-base">
                  -{formatCurrency(totalExpenses)}
                </Text>
              </View>

              {/* Daily Commission */}
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-600 text-base">
                  Daily Commission
                </Text>
                <Text className="font-bold text-green-600 text-base">
                  +{formatCurrency(dailyCommission)}
                </Text>
              </View>

              {/* Total Commission */}
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-600 text-base">
                  Total Commission
                </Text>
                <Text className="font-bold text-gray-900 text-base">
                  {formatCurrency(totalCommission)}
                </Text>
              </View>

              {/* Variance */}
              <View className="border-t border-gray-100 pt-4 mt-2">
                <View className="bg-red-50 rounded-2xl p-4 flex-row justify-between items-center">
                  <Text className="text-red-600 font-bold text-lg">
                    Variance
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        capitalVariance >= 0 ? "trending-up" : "trending-down"
                      }
                      size={20}
                      color="#DC2626"
                    />
                    <Text className="font-bold text-red-600 text-lg ml-2">
                      {capitalVariance >= 0 ? "" : "-"}
                      {formatCurrency(Math.abs(capitalVariance))}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-5 py-3">
          <Text className="text-lg font-bold text-gray-900 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row gap-2.5 mb-4">
            <TouchableOpacity
              onPress={() => router.push("/history" as any)}
              className="flex-1 bg-white rounded-xl p-3 mr-0 shadow-sm flex-row items-center"
              style={{ paddingRight: 2 }}
            >
              <View className="bg-blue-100 p-2 rounded-xl mr-2">
                <Ionicons name="time" size={20} color="#3B82F6" />
              </View>
              <View className="flex-shrink">
                <Text className="font-bold text-gray-900 text-sm">History</Text>
                <Text className="text-xs text-gray-500">Records</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/commissions" as any)}
              className="flex-1 bg-white ml-0 rounded-xl p-3 shadow-sm flex-row items-center"
            >
              <View className="bg-green-100 p-2 rounded-xl mr-2">
                <Ionicons name="cash" size={20} color="#22C55E" />
              </View>
              <View className="flex-shrink">
                <Text className="font-bold text-gray-900 text-sm">
                  Commissions
                </Text>
                <Text className="text-xs text-gray-500">Payments</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
