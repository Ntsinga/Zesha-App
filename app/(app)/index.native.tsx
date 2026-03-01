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
import {
  ArrowLeftRight,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react-native";
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
    snapshotDate,
    companyName,
    totalWorkingCapital,
    expectedGrandTotal,
    displayVariance,
    totalExpenses,
    totalBankCommission,
    totalTelecomCommission,
    telecomPendingCount,
    telecomVarianceCount,
    telecomHasIssues,
    transactionCount,
    recentTransactions,
    displayCapital,
    displayFloat,
    displayCash,
    capitalLabel,
    liveGrandTotal,
    formatCurrency,
    onRefresh,
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

        {/* Total Operating Capital Card */}
        <View className="px-5 py-4">
          <View className="bg-yellow-400 rounded-3xl p-6 shadow-md">
            {/* Title */}
            <Text className="text-yellow-800 font-semibold text-sm uppercase tracking-wide mb-2">
              Total Operating Capital
            </Text>

            {/* Grand Total */}
            <Text className="text-4xl font-bold text-yellow-900 mb-6">
              {formatCurrency(displayCapital)}
            </Text>

            {/* Float and Cash Row */}
            <View className="flex-row">
              {/* Float Section */}
              <View className="flex-1">
                <Text className="text-yellow-800 font-semibold text-sm uppercase mb-1">
                  Float
                </Text>
                <Text className="text-l font-bold text-yellow-900">
                  {formatCurrency(displayFloat)}
                </Text>
              </View>

              {/* Divider */}
              <View className="w-px bg-yellow-600 mx-4" />

              {/* Cash Section */}
              <View className="flex-1">
                <Text className="text-yellow-800 font-semibold text-sm uppercase mb-1">
                  Cash
                </Text>
                <Text className="text-l font-bold text-yellow-900">
                  {formatCurrency(displayCash)}
                </Text>
              </View>
            </View>

            {/* Capital label */}
            <View className="flex-row items-center mt-3" style={{ gap: 6 }}>
              {liveGrandTotal !== null && (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: "#16a34a",
                  }}
                />
              )}
              <Text
                className="text-yellow-700 text-xs"
                style={{ opacity: 0.75 }}
              >
                {capitalLabel}
              </Text>
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
              {/* Variance */}
              <View className="mb-2">
                <View
                  className={`${
                    displayVariance >= 0 ? "bg-green-50" : "bg-red-50"
                  } rounded-2xl p-4 flex-row justify-between items-center`}
                >
                  <View>
                    <Text
                      className={`${
                        displayVariance >= 0 ? "text-green-600" : "text-red-600"
                      } font-bold text-lg`}
                    >
                      Variance
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        displayVariance >= 0 ? "trending-up" : "trending-down"
                      }
                      size={20}
                      color={displayVariance >= 0 ? "#16A34A" : "#DC2626"}
                    />
                    <Text
                      className={`font-bold ${
                        displayVariance >= 0 ? "text-green-600" : "text-red-600"
                      } text-lg ml-2`}
                    >
                      {displayVariance >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(displayVariance))}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expected Total */}
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-600 text-base">Expected Total</Text>
                <Text className="font-bold text-gray-900 text-base">
                  {formatCurrency(expectedGrandTotal)}
                </Text>
              </View>

              {/* Working Capital baseline */}
              <View className="flex-row justify-between items-center py-3 border-t border-gray-100">
                <View>
                  <Text className="text-gray-600 text-base">
                    Working Capital
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Business baseline
                  </Text>
                </View>
                <Text className="font-bold text-gray-900 text-base">
                  {formatCurrency(totalWorkingCapital)}
                </Text>
              </View>

              {/* Total Expenses */}
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gray-600 text-base">Total Expenses</Text>
                <Text className="font-bold text-red-600 text-base">
                  -{formatCurrency(totalExpenses)}
                </Text>
              </View>

              {/* Commission — bank (expected) + telecom (reconciled) */}
              <View className="border-t border-gray-100 pt-3">
                <View className="flex-row justify-between items-center py-1">
                  <View className="flex-row items-center" style={{ gap: 6 }}>
                    <Text className="text-gray-600 text-base">Daily Commission</Text>
                    {telecomHasIssues && (
                      <Ionicons name="warning" size={14} color="#F59E0B" />
                    )}
                  </View>
                  <Text
                    className={`font-bold text-base ${
                      telecomHasIssues ? "text-amber-500" : "text-green-600"
                    }`}
                  >
                    +
                    {formatCurrency(
                      totalBankCommission + totalTelecomCommission,
                    )}
                  </Text>
                </View>
                {/* Bank sub-row */}
                <View className="flex-row justify-between items-center px-2 py-0.5">
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color="#16A34A"
                    />
                    <Text className="text-xs text-gray-400">Bank</Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {formatCurrency(totalBankCommission)}
                  </Text>
                </View>
                {/* Telecom sub-row */}
                <View className="flex-row justify-between items-center px-2 py-0.5">
                  <View className="flex-row items-center" style={{ gap: 4 }}>
                    <Ionicons
                      name={
                        telecomPendingCount > 0
                          ? "time"
                          : telecomVarianceCount > 0
                            ? "warning"
                            : "checkmark-circle"
                      }
                      size={12}
                      color={
                        telecomPendingCount > 0
                          ? "#F59E0B"
                          : telecomVarianceCount > 0
                            ? "#DC2626"
                            : "#16A34A"
                      }
                    />
                    <Text className="text-xs text-gray-400">
                      Telecom
                      {telecomPendingCount > 0
                        ? ` · ${telecomPendingCount} pending`
                        : telecomVarianceCount > 0
                          ? ` · ${telecomVarianceCount} variance`
                          : ""}
                    </Text>
                  </View>
                  <Text className="text-xs text-gray-500">
                    {formatCurrency(totalTelecomCommission)}
                  </Text>
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
                <Ionicons name="time" size={18} color="#3B82F6" />
              </View>
              <View className="flex-shrink">
                <Text className="font-bold text-gray-900 text-sm">History</Text>
                <Text className="text-xs text-gray-500">Records</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/transactions" as any)}
              className="flex-1 bg-white ml-0 rounded-xl p-3 shadow-sm flex-row items-center"
            >
              <View className="bg-indigo-100 p-2 rounded-xl mr-2">
                <ArrowLeftRight size={18} color="#4F46E5" />
              </View>
              <View className="flex-shrink">
                <Text className="font-bold text-gray-900 text-sm">
                  Transactions
                </Text>
                <Text className="text-xs text-gray-500">
                  {transactionCount} today
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          <View className="flex-row gap-2.5 mb-4">
            <TouchableOpacity
              onPress={() => router.push("/commissions" as any)}
              className="flex-1 bg-white rounded-xl p-3 mr-0 shadow-sm flex-row items-center"
            >
              <View className="bg-green-100 p-2 rounded-xl mr-2">
                <Ionicons name="cash" size={16} color="#22C55E" />
              </View>
              <View className="flex-shrink">
                <Text className="font-bold text-gray-900 text-sm">
                  Commissions
                </Text>
                <Text className="text-xs text-gray-500">Payments</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/expenses" as any)}
              className="flex-1 bg-white ml-0 rounded-xl p-3 shadow-sm flex-row items-center"
            >
              <View className="bg-red-100 p-2 rounded-xl mr-2">
                <Ionicons name="receipt" size={18} color="#DC2626" />
              </View>
              <View className="flex-shrink">
                <Text className="font-bold text-gray-900 text-sm">
                  Expenses
                </Text>
                <Text className="text-xs text-gray-500">Records</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions Feed */}
        {recentTransactions.length > 0 && (
          <View className="px-5 py-3">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-bold text-gray-900">
                Recent Transactions
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/transactions" as any)}
              >
                <Text className="text-indigo-600 font-semibold text-sm">
                  View All →
                </Text>
              </TouchableOpacity>
            </View>
            <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {recentTransactions.map((txn, idx) => (
                <View
                  key={txn.id}
                  className={`flex-row items-center px-4 py-3 ${
                    idx < recentTransactions.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <View
                    className={`p-1.5 rounded-full mr-3 ${
                      txn.transactionType === "DEPOSIT"
                        ? "bg-green-100"
                        : txn.transactionType === "WITHDRAW"
                          ? "bg-red-100"
                          : "bg-indigo-100"
                    }`}
                  >
                    {txn.transactionType === "DEPOSIT" ? (
                      <ArrowDownCircle size={16} color="#16A34A" />
                    ) : txn.transactionType === "WITHDRAW" ? (
                      <ArrowUpCircle size={16} color="#DC2626" />
                    ) : (
                      <ArrowLeftRight size={16} color="#4F46E5" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-gray-800 text-sm">
                      {txn.account?.name || `Account ${txn.accountId}`}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {txn.transactionType === "FLOAT_PURCHASE"
                        ? "Float Purchase"
                        : txn.transactionType}{" "}
                      · {txn.shift}
                    </Text>
                  </View>
                  <Text
                    className={`font-bold text-sm ${
                      txn.transactionType === "DEPOSIT"
                        ? "text-green-600"
                        : txn.transactionType === "WITHDRAW"
                          ? "text-red-600"
                          : "text-indigo-600"
                    }`}
                  >
                    {txn.transactionType === "WITHDRAW" ? "-" : "+"}
                    {formatCurrency(txn.amount || 0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
