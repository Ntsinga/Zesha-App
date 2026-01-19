import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Banknote,
  Wallet,
  ChevronRight,
  CheckCircle2,
  Calculator,
} from "lucide-react-native";
import { useBalanceMenuScreen } from "../../hooks/screens/useBalanceMenuScreen";

export default function BalancePage() {
  const router = useRouter();

  const {
    isLoading,
    isCalculating,
    today,
    formatCurrency,
    selectedShift,
    setSelectedShift,
    hasAMShift,
    hasPMShift,
    latestShift,
    latestShiftTotal,
    hasTodayCashCount,
    hasAMBalances,
    hasPMBalances,
    latestBalanceShift,
    hasTodayBalances,
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleBack,
    handleRefresh,
    handleCalculate,
  } = useBalanceMenuScreen();

  const handleCalculatePress = async () => {
    const result = await handleCalculate();
    if (result?.success) {
      router.push(
        `/reconciliation?date=${today}&shift=${selectedShift}` as any
      );
    } else {
      Alert.alert(
        "Error",
        result?.error || "Failed to calculate reconciliation"
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="flex-row items-center mb-8 mt-4">
          <TouchableOpacity
            onPress={handleBack}
            className="p-2 bg-white rounded-full shadow-sm mr-4"
          >
            <ArrowLeft color="#C62828" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-bold text-gray-800">
              Daily Reconciliation
            </Text>
            <Text className="text-gray-500 text-sm">
              Choose an option to continue
            </Text>
          </View>
        </View>

        {/* Options */}
        <View className="space-y-4">
          {/* Cash Count Option */}
          <TouchableOpacity
            onPress={handleNavigateCashCount}
            className={`rounded-2xl p-5 shadow-sm ${
              hasTodayCashCount
                ? "bg-green-50 border-2 border-green-500"
                : "bg-white border border-gray-100"
            }`}
          >
            <View className="flex-row items-center">
              <View
                className={`p-4 rounded-xl mr-4 ${
                  hasTodayCashCount ? "bg-green-100" : "bg-brand-red/10"
                }`}
              >
                {hasTodayCashCount ? (
                  <CheckCircle2 color="#22C55E" size={32} />
                ) : (
                  <Banknote color="#C62828" size={32} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap">
                  <Text
                    className={`text-lg font-bold ${
                      hasTodayCashCount ? "text-green-700" : "text-gray-800"
                    }`}
                  >
                    Cash Count
                  </Text>
                  {hasAMShift && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">AM</Text>
                    </View>
                  )}
                  {hasPMShift && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">PM</Text>
                    </View>
                  )}
                </View>
                <Text
                  className={`text-sm mt-1 ${
                    hasTodayCashCount ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {hasTodayCashCount
                    ? `${latestShift} Total: ${formatCurrency(
                        latestShiftTotal
                      )}`
                    : "Count notes and coins by denomination"}
                </Text>
              </View>
              <ChevronRight
                color={hasTodayCashCount ? "#22C55E" : "#9CA3AF"}
                size={24}
              />
            </View>
          </TouchableOpacity>

          {/* Add Balances Option */}
          <TouchableOpacity
            onPress={handleNavigateAddBalance}
            className={`rounded-2xl p-5 shadow-sm ${
              hasTodayBalances
                ? "bg-green-50 border-2 border-green-500"
                : "bg-white border border-gray-100"
            }`}
          >
            <View className="flex-row items-center">
              <View
                className={`p-4 rounded-xl mr-4 ${
                  hasTodayBalances ? "bg-green-100" : "bg-brand-gold/30"
                }`}
              >
                {hasTodayBalances ? (
                  <CheckCircle2 color="#22C55E" size={32} />
                ) : (
                  <Wallet color="#B8860B" size={32} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap">
                  <Text
                    className={`text-lg font-bold ${
                      hasTodayBalances ? "text-green-700" : "text-gray-800"
                    }`}
                  >
                    Add Float Balances
                  </Text>
                  {hasAMBalances && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">AM</Text>
                    </View>
                  )}
                  {hasPMBalances && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">PM</Text>
                    </View>
                  )}
                </View>
                <Text
                  className={`text-sm mt-1 ${
                    hasTodayBalances ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {hasTodayBalances
                    ? `${latestBalanceShift} - All accounts completed`
                    : "Add account balances with images"}
                </Text>
              </View>
              <ChevronRight
                color={hasTodayBalances ? "#22C55E" : "#9CA3AF"}
                size={24}
              />
            </View>
          </TouchableOpacity>

          {/* Add Commissions Option */}
          <TouchableOpacity
            onPress={handleNavigateCommissions}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 p-4 rounded-xl mr-4">
                <Banknote color="#C62828" size={32} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  Add Commissions
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Record commission payments with images
                </Text>
              </View>
              <ChevronRight color="#9CA3AF" size={24} />
            </View>
          </TouchableOpacity>

          {/* Calculate Reconciliation Button */}
          <View className="mt-6 pt-6 border-t border-gray-200">
            {/* Shift Selector */}
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Select Shift to Reconcile
            </Text>
            <View className="flex-row mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
              <TouchableOpacity
                onPress={() => setSelectedShift("AM")}
                className={`flex-1 py-3 rounded-lg ${
                  selectedShift === "AM" ? "bg-brand-red" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-bold ${
                    selectedShift === "AM" ? "text-white" : "text-gray-600"
                  }`}
                >
                  AM Shift
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedShift("PM")}
                className={`flex-1 py-3 rounded-lg ${
                  selectedShift === "PM" ? "bg-brand-red" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-bold ${
                    selectedShift === "PM" ? "text-white" : "text-gray-600"
                  }`}
                >
                  PM Shift
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleCalculatePress}
              disabled={isCalculating}
              className={`bg-brand-red rounded-2xl p-5 shadow-lg ${
                isCalculating ? "opacity-50" : ""
              }`}
            >
              <View className="flex-row items-center justify-center">
                <Calculator color="white" size={24} />
                <Text className="text-white text-lg font-bold ml-3">
                  {isCalculating
                    ? "Calculating..."
                    : `Calculate ${selectedShift} Reconciliation`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
