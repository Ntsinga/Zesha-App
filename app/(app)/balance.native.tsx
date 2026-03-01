import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Banknote,
  Wallet,
  ChevronRight,
  CheckCircle2,
  Calculator,
  ArrowLeftRight,
} from "lucide-react-native";
import { useBalanceMenuScreen } from "../../hooks/screens/useBalanceMenuScreen";

export default function BalancePage() {
  const router = useRouter();

  const {
    isLoading,
    isCalculating,
    isLoadingShiftStatus,
    today,
    formatCurrency,
    selectedShift,
    setSelectedShift,
    shiftPhase,
    currentSubtype,
    shiftStatus,
    handoverDecision,
    setHandoverDecision,
    showHandoverModal,
    buttonLabel,
    showCommissionsAndTransactions,
    hasAMShift,
    hasPMShift,
    hasAMBalances,
    hasPMBalances,
    hasAMCommissions,
    hasPMCommissions,
    hasAMTransactions,
    hasPMTransactions,
    hasSelectedCashCount,
    hasSelectedBalances,
    hasSelectedCommissions,
    hasSelectedTransactions,
    selectedShiftTotal,
    selectedBalanceTotal,
    selectedCommissionTotal,
    selectedTransactionCount,
    selectedTransactionTotal,
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleNavigateTransactions,
    handleRefresh,
    handleCalculate,
  } = useBalanceMenuScreen();

  const handleCalculatePress = async () => {
    const result = await handleCalculate();
    if (result?.success) {
      router.push(
        `/reconciliation?date=${today}&shift=${selectedShift}&subtype=${currentSubtype}` as any,
      );
    } else {
      Alert.alert(
        "Error",
        result?.error || "Failed to calculate reconciliation",
      );
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Handover Modal — PM shift, no records yet, awaiting decision */}
      <Modal
        visible={showHandoverModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 28,
              width: "100%",
              maxWidth: 360,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#1f2937",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              PM Shift
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
                textAlign: "center",
                marginBottom: 28,
                lineHeight: 20,
              }}
            >
              Are you taking over from the AM worker? This helps record a
              proper float handover opening.
            </Text>
            <TouchableOpacity
              onPress={() => setHandoverDecision(true)}
              style={{
                backgroundColor: "#C62828",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                Yes, I'm taking over
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHandoverDecision(false)}
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#374151", fontWeight: "600", fontSize: 15 }}>
                No, I'm covering the full day
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      >
        {/* Header */}
        <View className="mb-8">
          <View>
            <Text className="text-2xl font-bold text-gray-800">
              Daily Reconciliation
            </Text>
            <Text className="text-gray-500 text-sm">
              Choose an option to continue
            </Text>
          </View>
          {/* Shift Selector */}
          <View className="flex-row mt-4 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
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
        </View>

        {/* Show loading state while fetching data */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#C62828" />
            <Text className="text-gray-500 mt-4">Loading balance data...</Text>
          </View>
        ) : (
          <>
            {/* Options */}
            <View className="gap-6">
              {/* Cash Count Option */}
              <TouchableOpacity
                onPress={handleNavigateCashCount}
                style={{ borderRadius: 16 }}
                className={`rounded-2xl p-5 shadow-sm ${
                  hasSelectedCashCount
                    ? "bg-green-50 border-2 border-green-500"
                    : "bg-white border border-gray-100"
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    style={{ borderRadius: 12 }}
                    className={`p-4 rounded-xl mr-4 ${
                      hasSelectedCashCount ? "bg-green-100" : "bg-brand-red/10"
                    }`}
                  >
                    {hasSelectedCashCount ? (
                      <CheckCircle2 color="#22C55E" size={32} />
                    ) : (
                      <Banknote color="#C62828" size={32} />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text
                        className={`text-lg font-bold ${
                          hasSelectedCashCount
                            ? "text-green-700"
                            : "text-gray-800"
                        }`}
                      >
                        Cash Count
                      </Text>
                      {hasAMShift && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            AM
                          </Text>
                        </View>
                      )}
                      {hasPMShift && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            PM
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`text-sm mt-1 ${
                        hasSelectedCashCount
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {hasSelectedCashCount
                        ? `${selectedShift} Total: ${formatCurrency(
                            selectedShiftTotal,
                          )}`
                        : "Count notes and coins by denomination"}
                    </Text>
                  </View>
                  <ChevronRight
                    color={hasSelectedCashCount ? "#22C55E" : "#9CA3AF"}
                    size={24}
                  />
                </View>
              </TouchableOpacity>

              {/* Add Balances Option */}
              <TouchableOpacity
                onPress={handleNavigateAddBalance}
                style={{ borderRadius: 16 }}
                className={`rounded-2xl p-5 shadow-sm ${
                  hasSelectedBalances
                    ? "bg-green-50 border-2 border-green-500"
                    : "bg-white border border-gray-100"
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    style={{ borderRadius: 12 }}
                    className={`p-4 rounded-xl mr-4 ${
                      hasSelectedBalances ? "bg-green-100" : "bg-brand-gold/30"
                    }`}
                  >
                    {hasSelectedBalances ? (
                      <CheckCircle2 color="#22C55E" size={32} />
                    ) : (
                      <Wallet color="#B8860B" size={32} />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text
                        className={`text-lg font-bold ${
                          hasSelectedBalances
                            ? "text-green-700"
                            : "text-gray-800"
                        }`}
                      >
                        Add Float Balances
                      </Text>
                      {hasAMBalances && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            AM
                          </Text>
                        </View>
                      )}
                      {hasPMBalances && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            PM
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`text-sm mt-1 ${
                        hasSelectedBalances ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {hasSelectedBalances
                        ? `${selectedShift} Total: ${formatCurrency(selectedBalanceTotal)}`
                        : "Add account balances with images"}
                    </Text>
                  </View>
                  <ChevronRight
                    color={hasSelectedBalances ? "#22C55E" : "#9CA3AF"}
                    size={24}
                  />
                </View>
              </TouchableOpacity>

              {/* Add Commissions Option — only shown when commissions are relevant */}
              {showCommissionsAndTransactions && (
              <TouchableOpacity
                onPress={handleNavigateCommissions}
                style={{ borderRadius: 16 }}
                className={`rounded-2xl p-5 shadow-sm ${
                  hasSelectedCommissions
                    ? "bg-green-50 border-2 border-green-500"
                    : "bg-white border border-gray-100"
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    style={{ borderRadius: 12 }}
                    className={`p-4 rounded-xl mr-4 ${
                      hasSelectedCommissions ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {hasSelectedCommissions ? (
                      <CheckCircle2 color="#22C55E" size={32} />
                    ) : (
                      <Banknote color="#C62828" size={32} />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text
                        className={`text-lg font-bold ${
                          hasSelectedCommissions
                            ? "text-green-700"
                            : "text-gray-800"
                        }`}
                      >
                        Add Commissions
                      </Text>
                      {hasAMCommissions && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            AM
                          </Text>
                        </View>
                      )}
                      {hasPMCommissions && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            PM
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`text-sm mt-1 ${
                        hasSelectedCommissions
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {hasSelectedCommissions
                        ? `${selectedShift} Total: ${formatCurrency(selectedCommissionTotal)}`
                        : "Record commission payments with images"}
                    </Text>
                  </View>
                  <ChevronRight
                    color={hasSelectedCommissions ? "#22C55E" : "#9CA3AF"}
                    size={24}
                  />
                </View>
              </TouchableOpacity>
              )}

              {/* Record Transactions Option — only shown when transactions are relevant */}
              {showCommissionsAndTransactions && (
              <TouchableOpacity
                onPress={handleNavigateTransactions}
                style={{ borderRadius: 16 }}
                className={`rounded-2xl p-5 shadow-sm ${
                  hasSelectedTransactions
                    ? "bg-green-50 border-2 border-green-500"
                    : "bg-white border border-gray-100"
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    style={{ borderRadius: 12 }}
                    className={`p-4 rounded-xl mr-4 ${
                      hasSelectedTransactions ? "bg-green-100" : "bg-indigo-100"
                    }`}
                  >
                    {hasSelectedTransactions ? (
                      <CheckCircle2 color="#22C55E" size={32} />
                    ) : (
                      <ArrowLeftRight color="#4F46E5" size={32} />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <Text
                        className={`text-lg font-bold ${
                          hasSelectedTransactions
                            ? "text-green-700"
                            : "text-gray-800"
                        }`}
                      >
                        Record Transactions
                      </Text>
                      {hasAMTransactions && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            AM
                          </Text>
                        </View>
                      )}
                      {hasPMTransactions && (
                        <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            PM
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className={`text-sm mt-1 ${
                        hasSelectedTransactions
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {hasSelectedTransactions
                        ? `${selectedShift}: ${selectedTransactionCount} txn${selectedTransactionCount !== 1 ? "s" : ""} (${formatCurrency(selectedTransactionTotal)})`
                        : "Log deposits, withdrawals & float purchases"}
                    </Text>
                  </View>
                  <ChevronRight
                    color={hasSelectedTransactions ? "#22C55E" : "#9CA3AF"}
                    size={24}
                  />
                </View>
              </TouchableOpacity>
              )}

              {/* Calculate Reconciliation Button */}
              <View className="mt-6 pt-6 border-t border-gray-200">
                {shiftPhase === "COMPLETE" ? (
                  <View className="bg-green-50 border border-green-200 rounded-2xl p-5 items-center">
                    <CheckCircle2 color="#22C55E" size={32} />
                    <Text className="text-green-700 font-bold text-base mt-2">
                      {selectedShift} Shift Complete
                    </Text>
                    <Text className="text-green-600 text-sm text-center mt-1">
                      All reconciliations for the {selectedShift} shift have been finalized.
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleCalculatePress}
                    disabled={
                      isCalculating ||
                      !hasSelectedCashCount ||
                      !hasSelectedBalances ||
                      (showCommissionsAndTransactions && !hasSelectedCommissions)
                    }
                    className={`bg-brand-red rounded-2xl p-5 shadow-lg ${
                      isCalculating ||
                      !hasSelectedCashCount ||
                      !hasSelectedBalances ||
                      (showCommissionsAndTransactions && !hasSelectedCommissions)
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    <View className="flex-row items-center justify-center">
                      <Calculator color="white" size={24} />
                      <Text className="text-white text-lg font-bold ml-3">
                        {isCalculating
                          ? "Calculating..."
                          : !hasSelectedCashCount || !hasSelectedBalances
                            ? "Complete Required Steps First"
                            : buttonLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
