import React, { useState } from "react";
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

/**
 * Native Dashboard - redesigned to match modern UI
 */
export default function DashboardNative() {
  const {
    isLoading,
    refreshing,
    snapshotDate,
    companyName,
    totalWorkingCapital,
    expectedGrandTotal,
    displayVariance,
    totalExpenses,
    todayExpenses,
    capitalPendingExpenses,
    totalMonthExpenses,
    dailyCommission,
    totalBankCommission,
    totalTelecomCommission,
    accounts,
    commissionByAccountId,
    displayCapital,
    displayFloat,
    displayCash,
    capitalLabel,
    liveGrandTotal,
    formatCurrency,
    onRefresh,
  } = useDashboardScreen();

  const router = useRouter();
  const [balancesExpanded, setBalancesExpanded] = useState(false);
  const PREVIEW_COUNT = 3;
  const sortedByBalance = [...accounts].sort(
    (a, b) => (b.balance ?? 0) - (a.balance ?? 0),
  );

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  return (
    <View className="flex-1 bg-brand-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View className="px-5 pt-6 pb-4 bg-brand-bg">
          <Text className="text-xl font-bold text-gray-900" numberOfLines={1}>
            Hi, {companyName}
          </Text>
          <View className="flex-row items-center mt-1" style={{ gap: 4 }}>
            <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
            <Text className="text-xs text-gray-400">{snapshotDate}</Text>
          </View>
        </View>

        {/* Total Operating Capital Card */}
        <View className="px-5 pt-3 pb-2">
          <View className="bg-yellow-400 rounded-3xl p-4 shadow-md">
            {/* Title */}
            <Text className="text-yellow-800 font-semibold text-xs uppercase tracking-wide mb-1">
              Total Operating Capital
            </Text>

            {/* Grand Total */}
            <Text className="text-3xl font-bold text-yellow-900 mb-4">
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
        <View className="px-5 pt-2 pb-4">
          <View className="bg-white rounded-3xl p-4 shadow-sm">
            {/* Comparison Items */}
            <View className="space-y-4">
              {/* Variance */}
              <View className="mb-2">
                <View
                  className={`${
                    displayVariance >= 0 ? "bg-green-50" : "bg-red-50"
                  } rounded-2xl p-3 flex-row justify-between items-center`}
                >
                  <View>
                    <Text
                      className={`${
                        displayVariance >= 0 ? "text-green-600" : "text-red-600"
                      } font-bold text-base`}
                    >
                      {displayVariance >= 0 ? "Excess" : "Loss"}
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
                      } text-base ml-2`}
                    >
                      {displayVariance >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(displayVariance))}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Expected Total */}
              <View className="flex-row justify-between items-center py-1.5">
                <Text className="text-gray-600 text-sm">Expected Total</Text>
                <Text className="font-bold text-gray-900 text-sm">
                  {formatCurrency(expectedGrandTotal)}
                </Text>
              </View>

              {/* Working Capital baseline */}
              <View className="flex-row justify-between items-center py-1.5 border-t border-gray-100">
                <View>
                  <Text className="text-gray-600 text-sm">Working Capital</Text>
                  <Text className="text-xs text-gray-400">
                    Business baseline
                  </Text>
                </View>
                <Text className="font-bold text-gray-900 text-sm">
                  {formatCurrency(totalWorkingCapital)}
                </Text>
              </View>

              {capitalPendingExpenses > 0 ? (
                <View className="flex-row justify-between items-center py-1.5 border-t border-gray-100">
                  <View>
                    <Text className="text-gray-600 text-sm">Unreimbursed</Text>
                    <Text className="text-xs text-gray-400">Capital not yet paid back</Text>
                  </View>
                  <Text className="font-bold text-sm text-red-600">
                    -{formatCurrency(capitalPendingExpenses)}
                  </Text>
                </View>
              ) : (
                <View className="flex-row justify-between items-center py-1.5 border-t border-gray-100">
                  <Text className="text-gray-600 text-sm">This Month's Expenses</Text>
                  <Text className="font-bold text-sm text-red-600">
                    {totalMonthExpenses > 0 ? "-" : ""}{formatCurrency(totalMonthExpenses)}
                  </Text>
                </View>
              )}

              {/* Commission — bank (expected) + telecom (reconciled) */}
              <View className="border-t border-gray-100 pt-2">
                <View className="flex-row justify-between items-start py-1">
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text className="text-gray-600 text-sm">
                      Daily Commission
                    </Text>
                    <View className="flex-row flex-wrap mt-0.5" style={{ gap: 4 }}>
                      {totalBankCommission > 0 && (
                        <Text className="text-xs text-gray-400">
                          Bank {formatCurrency(totalBankCommission)}
                        </Text>
                      )}
                      {totalBankCommission > 0 && totalTelecomCommission > 0 && (
                        <Text className="text-xs text-gray-300">·</Text>
                      )}
                      {totalTelecomCommission > 0 && (
                        <Text className="text-xs text-gray-400">
                          Telecom {formatCurrency(totalTelecomCommission)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text className="font-bold text-sm text-green-600" style={{ flexShrink: 0 }}>
                    +{formatCurrency(dailyCommission)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Current Balances */}
        <View className="px-5 pt-3 pb-2">
          <TouchableOpacity
            className="flex-row justify-between items-center mb-2"
            onPress={() => setBalancesExpanded((v) => !v)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center" style={{ gap: 6 }}>
              <Text className="text-base font-bold text-gray-900">
                Current Balances
              </Text>
              <Ionicons
                name={balancesExpanded ? "chevron-up" : "chevron-down"}
                size={16}
                color="#6B7280"
              />
            </View>
            <TouchableOpacity onPress={() => router.push("/balance" as any)}>
              <Text className="text-indigo-600 font-semibold text-xs">
                Add Float
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {accounts.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-gray-400 text-sm">No accounts found</Text>
              </View>
            ) : (
              <>
                {(balancesExpanded
                  ? sortedByBalance
                  : sortedByBalance.slice(0, PREVIEW_COUNT)
                ).map((account, idx, arr) => {
                  const commission =
                    commissionByAccountId.get(account.accountId) ?? 0;
                  return (
                    <View
                      key={account.accountId}
                      className={`flex-row items-center px-4 py-2.5 ${
                        idx < arr.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="font-medium text-gray-800 text-sm">
                          {account.accountName}
                        </Text>
                        {commission > 0 && (
                          <Text className="text-xs text-green-600 mt-0.5">
                            +{formatCurrency(commission)} today
                          </Text>
                        )}
                      </View>
                      <Text className="font-bold text-gray-900 text-sm">
                        {formatCurrency(account.balance ?? 0)}
                      </Text>
                    </View>
                  );
                })}
                {accounts.length > PREVIEW_COUNT && (
                  <TouchableOpacity
                    className="py-2 items-center border-t border-gray-100"
                    onPress={() => setBalancesExpanded((v) => !v)}
                  >
                    <Text className="text-indigo-600 text-xs font-semibold">
                      {balancesExpanded
                        ? "Show less"
                        : `+${accounts.length - PREVIEW_COUNT} more`}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
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
              className="flex-1 bg-white rounded-xl p-3 shadow-sm flex-row items-center"
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
              onPress={() => router.push("/commissions" as any)}
              className="flex-1 bg-white rounded-xl p-3 shadow-sm flex-row items-center"
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
          </View>
        </View>

        {/* removed — Current Balances moved above Quick Actions */}
      </ScrollView>
    </View>
  );
}
