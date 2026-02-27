import React, { useState as useLocalState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  RefreshCw,
  Check,
  XCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react-native";
import { useLocalSearchParams } from "expo-router";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useReconciliationScreen } from "../../hooks/screens/useReconciliationScreen";
import type { ShiftEnum } from "../../types";

export default function BalanceDetailPage() {
  const params = useLocalSearchParams<{ date: string; shift: string }>();
  const date = params.date || new Date().toISOString().split("T")[0];
  const shift = (params.shift as ShiftEnum) || "AM";

  const {
    refreshing,
    isLoading,
    error,
    selectedImage,
    setSelectedImage,
    balances,
    cashCounts,
    commissions,
    totalFloat,
    totalCash,
    totalCommission,
    expectedClosing,
    actualClosing,
    variance,
    status,
    onRefresh,
    handleBack,
    getImageUri,
    formatCurrency,
    formatDate,
    // Reconciliation functionality
    notes,
    setNotes,
    canReview,
    isCalculating,
    isFinalizing,
    isFinalized,
    isApproved,
    handleCalculate,
    handleFinalize,
    handleApprove,
    handleReject,
    // Balance validation
    hasDiscrepancies,
    discrepancyCount,
    totalDiscrepancyAmount,
    validationByAccountId,
    // Linked transactions
    shiftTransactions,
  } = useReconciliationScreen({ date, shift });

  const [showDiscrepancyModal, setShowDiscrepancyModal] = useLocalState(false);

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading reconciliation details..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-xl font-bold text-gray-900">
              {formatDate(date, "medium")}
            </Text>
            <View
              className={`px-3 py-1 rounded-full mt-1 ${
                shift === "AM" ? "bg-blue-100" : "bg-red-100"
              }`}
            >
              <Text
                className={`font-bold ${
                  shift === "AM" ? "text-blue-700" : "text-red-700"
                }`}
              >
                {shift} Shift
              </Text>
            </View>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        <View className="bg-brand-gold rounded-2xl p-5 mb-4 shadow-md">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-red-900/80 font-semibold text-lg">
              Actual Closing
            </Text>
            {status === "PASSED" ? (
              <View className="flex-row items-center px-3 py-1 rounded-full bg-green-500">
                <CheckCircle2 size={14} color="#fff" />
                <Text className="text-white font-bold text-xs ml-1">
                  Passed
                </Text>
              </View>
            ) : status === "FAILED" ? (
              <View className="flex-row items-center px-3 py-1 rounded-full bg-red-500">
                <AlertTriangle size={14} color="#fff" />
                <Text className="text-white font-bold text-xs ml-1">
                  Failed
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center px-3 py-1 rounded-full bg-yellow-500">
                <Clock size={14} color="#fff" />
                <Text className="text-white font-bold text-xs ml-1">
                  Flagged
                </Text>
              </View>
            )}
          </View>

          <Text className="text-4xl font-bold text-red-900 mb-4">
            {formatCurrency(actualClosing)}
          </Text>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-red-900/70">Float</Text>
              <Text className="text-l font-bold text-red-900">
                {formatCurrency(totalFloat)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-red-900/70">Cash</Text>
              <Text className="text-l font-bold text-red-900">
                {formatCurrency(totalCash)}
              </Text>
            </View>
          </View>
        </View>

        {/* Variance Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-gray-700 font-semibold mb-3">
            Financial Analysis
          </Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Expected Closing</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(expectedClosing)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Actual Closing</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(actualClosing)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Total Commissions</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(totalCommission)}
            </Text>
          </View>

          <View className="border-t border-gray-100 pt-2 mt-2 flex-row justify-between items-center">
            <Text className="text-gray-700 font-semibold">Variance</Text>
            <View className="flex-row items-center">
              {variance >= 0 ? (
                <TrendingUp color="#16A34A" size={16} />
              ) : (
                <TrendingDown color="#DC2626" size={16} />
              )}
              <Text
                className={`font-bold ml-1 ${
                  variance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {variance >= 0 ? "+" : ""}
                {formatCurrency(variance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Commission Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <Banknote color="#C62828" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Commissions ({commissions.length})
            </Text>
          </View>

          <Text className="text-2xl font-bold text-red-700 mb-3">
            {formatCurrency(totalCommission)}
          </Text>

          {commissions.length > 0 ? (
            commissions.map((commission, idx) => (
              <TouchableOpacity
                key={commission.id}
                onPress={() => {
                  const uri = getImageUri(commission);
                  if (uri) setSelectedImage(uri);
                }}
                className={`flex-row items-center py-3 ${
                  idx < commissions.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    {commission.account?.name ||
                      `Account ${commission.accountId}`}
                  </Text>
                </View>
                <Text className="font-bold text-gray-700 mr-3">
                  {formatCurrency(commission.amount)}
                </Text>
                {(commission.imageData || commission.imageUrl) && (
                  <ImageIcon size={16} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text className="text-gray-400 text-center py-2">
              No commissions recorded
            </Text>
          )}
        </View>

        {/* Discrepancy Alert Banner */}
        {hasDiscrepancies && (
          <View className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 flex-row items-center">
            <ShieldAlert color="#DC2626" size={22} />
            <View className="flex-1 ml-3">
              <Text className="text-red-800 font-bold text-sm">
                Balance Discrepancies Detected
              </Text>
              <Text className="text-red-600 text-xs mt-1">
                {discrepancyCount} account{discrepancyCount !== 1 ? "s" : ""}{" "}
                with {formatCurrency(totalDiscrepancyAmount)} total variance
              </Text>
            </View>
          </View>
        )}

        {/* Balances Card with Validation */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <Wallet color="#B8860B" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Account Balances ({balances.length})
            </Text>
          </View>

          <Text className="text-2xl font-bold text-yellow-700 mb-3">
            {formatCurrency(totalFloat)}
          </Text>

          {balances.length > 0 ? (
            balances.map((balance, idx) => {
              const validation = validationByAccountId[balance.accountId];
              const vStatus = validation?.validationStatus;
              return (
                <TouchableOpacity
                  key={balance.id}
                  onPress={() => {
                    const uri = getImageUri(balance);
                    if (uri) setSelectedImage(uri);
                  }}
                  className={`py-3 ${
                    idx < balances.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        <Text className="font-medium text-gray-800">
                          {balance.account?.name ||
                            `Account ${balance.accountId}`}
                        </Text>
                        {balance.isAutoGenerated && (
                          <View className="flex-row items-center bg-blue-100 px-1.5 py-0.5 rounded-full ml-2">
                            <RefreshCw size={10} color="#2563EB" />
                            <Text className="text-[10px] font-semibold text-blue-700 ml-0.5">
                              Auto-carried
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-gray-400">
                        {balance.isAutoGenerated
                          ? "Inactive account"
                          : balance.source}
                      </Text>
                    </View>
                    <Text className="font-bold text-gray-700 mr-3">
                      {formatCurrency(balance.amount)}
                    </Text>
                    {(balance.imageData || balance.imageUrl) && (
                      <ImageIcon size={16} color="#9CA3AF" />
                    )}
                  </View>
                  {/* Validation row */}
                  {validation && (
                    <View className="flex-row items-center mt-2 ml-0">
                      <View
                        className={`flex-row items-center px-2 py-0.5 rounded-full mr-2 ${
                          vStatus === "MATCHED"
                            ? "bg-green-100"
                            : vStatus === "SHORTAGE"
                              ? "bg-red-100"
                              : vStatus === "EXCESS"
                                ? "bg-yellow-100"
                                : "bg-gray-100"
                        }`}
                      >
                        {vStatus === "MATCHED" && (
                          <ShieldCheck size={12} color="#16A34A" />
                        )}
                        {vStatus === "SHORTAGE" && (
                          <ArrowDownCircle size={12} color="#DC2626" />
                        )}
                        {vStatus === "EXCESS" && (
                          <ArrowUpCircle size={12} color="#CA8A04" />
                        )}
                        <Text
                          className={`text-xs font-semibold ml-1 ${
                            vStatus === "MATCHED"
                              ? "text-green-700"
                              : vStatus === "SHORTAGE"
                                ? "text-red-700"
                                : vStatus === "EXCESS"
                                  ? "text-yellow-700"
                                  : "text-gray-500"
                          }`}
                        >
                          {vStatus}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-500">
                        Expected: {formatCurrency(validation.calculatedBalance)}
                      </Text>
                      <Text
                        className={`text-xs font-semibold ml-2 ${
                          validation.variance > 0
                            ? "text-green-600"
                            : validation.variance < 0
                              ? "text-red-600"
                              : "text-gray-500"
                        }`}
                      >
                        {validation.variance >= 0 ? "+" : ""}
                        {formatCurrency(validation.variance)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <Text className="text-gray-400 text-center py-2">
              No balances recorded
            </Text>
          )}
        </View>

        {/* Cash Count Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <Banknote color="#16A34A" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Cash Count ({cashCounts.length} denominations)
            </Text>
          </View>

          <Text className="text-2xl font-bold text-green-700 mb-3">
            {formatCurrency(totalCash)}
          </Text>

          {cashCounts.length > 0 ? (
            <View>
              <View className="flex-row py-2 border-b border-gray-200">
                <Text className="flex-1 font-semibold text-gray-600 text-xs">
                  Denomination
                </Text>
                <Text className="w-16 text-center font-semibold text-gray-600 text-xs">
                  Qty
                </Text>
                <Text className="w-24 text-right font-semibold text-gray-600 text-xs">
                  Amount
                </Text>
              </View>
              {cashCounts.map((cc, idx) => (
                <View
                  key={cc.id}
                  className={`flex-row py-2 ${
                    idx < cashCounts.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <Text className="flex-1 text-gray-700">
                    {formatCurrency(cc.denomination)}
                  </Text>
                  <Text className="w-16 text-center text-gray-600">
                    ×{cc.quantity}
                  </Text>
                  <Text className="w-24 text-right font-semibold text-gray-700">
                    {formatCurrency(cc.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-gray-400 text-center py-2">
              No cash count recorded
            </Text>
          )}
        </View>

        {/* Linked Transactions Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <ArrowLeftRight color="#4F46E5" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Transactions ({shiftTransactions.length})
            </Text>
          </View>

          {shiftTransactions.length > 0 ? (
            shiftTransactions.map((txn, idx) => (
              <View
                key={txn.id}
                className={`flex-row items-center py-3 ${
                  idx < shiftTransactions.length - 1
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
                    · {txn.reference || "No ref"}
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
            ))
          ) : (
            <Text className="text-gray-400 text-center py-2">
              No transactions for this shift
            </Text>
          )}
        </View>

        {/* Notes Section */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <AlertTriangle color="#D97706" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Notes & Comments
            </Text>
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this reconciliation..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            editable={!isFinalized || canReview}
            className={`bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-700 min-h-[100px] ${
              isFinalized && !canReview ? "opacity-50" : ""
            }`}
            textAlignVertical="top"
          />
        </View>

        {/* Action Buttons */}
        <View className="mb-8">
          {/* Status Badge */}
          {isFinalized && (
            <View
              className={`flex-row items-center justify-center mb-4 px-4 py-2 rounded-full ${
                isApproved ? "bg-green-100" : "bg-yellow-100"
              }`}
            >
              {isApproved ? (
                <>
                  <Check color="#16A34A" size={18} />
                  <Text className="text-green-700 font-semibold ml-2">
                    Approved
                  </Text>
                </>
              ) : (
                <>
                  <Lock color="#D97706" size={18} />
                  <Text className="text-yellow-700 font-semibold ml-2">
                    Finalized - Awaiting Review
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Clerk Actions - Calculate and Finalize */}
          {!isFinalized && (
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCalculate}
                disabled={isCalculating}
                className="flex-1 flex-row items-center justify-center bg-blue-500 py-4 rounded-xl"
              >
                <RefreshCw color="#fff" size={20} />
                <Text className="text-white font-semibold ml-2">
                  {isCalculating ? "Calculating..." : "Calculate"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  const result = await handleFinalize();
                  if (result?.error === "HAS_DISCREPANCIES") {
                    Alert.alert(
                      "Finalize with Discrepancies?",
                      `There ${discrepancyCount === 1 ? "is" : "are"} ${discrepancyCount} account${discrepancyCount !== 1 ? "s" : ""} with balance discrepancies totalling ${formatCurrency(totalDiscrepancyAmount)}. Proceed anyway?`,
                      [
                        { text: "Review", style: "cancel" },
                        {
                          text: "Finalize",
                          style: "destructive",
                          onPress: async () => {
                            const r = await handleFinalize(true);
                            if (!r?.success && r?.error) {
                              Alert.alert("Error", r.error);
                            }
                          },
                        },
                      ],
                    );
                  } else if (!result?.success && result?.error) {
                    Alert.alert("Error", result.error);
                  }
                }}
                disabled={isFinalizing}
                className={`flex-1 flex-row items-center justify-center ${hasDiscrepancies ? "bg-red-500" : "bg-amber-500"} py-4 rounded-xl`}
              >
                <Lock color="#fff" size={20} />
                <Text className="text-white font-semibold ml-2">
                  {isFinalizing
                    ? "Finalizing..."
                    : hasDiscrepancies
                      ? "Finalize*"
                      : "Finalize & Lock"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Supervisor/Admin Actions - Approve and Reject */}
          {isFinalized && canReview && !isApproved && (
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleApprove}
                className="flex-1 flex-row items-center justify-center bg-green-500 py-4 rounded-xl"
              >
                <Check color="#fff" size={20} />
                <Text className="text-white font-semibold ml-2">Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleReject}
                className="flex-1 flex-row items-center justify-center bg-red-500 py-4 rounded-xl"
              >
                <XCircle color="#fff" size={20} />
                <Text className="text-white font-semibold ml-2">Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-14 right-4 p-2 bg-white/20 rounded-full z-10"
          >
            <X color="#fff" size={24} />
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              className="w-full h-[80%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
