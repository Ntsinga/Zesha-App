import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { ArrowLeft, Save, Plus, Minus, Banknote } from "lucide-react-native";
import { useCashCountScreen } from "../../hooks/screens/useCashCountScreen";

export default function AddCashCountPage() {
  const {
    shift,
    entries,
    isSubmitting,
    isEditing,
    today,
    formatCurrency,
    totalAmount,
    totalNotes,
    filledEntries,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    handleSubmit,
    clearAll,
    handleBack,
  } = useCashCountScreen();

  const onSubmit = async () => {
    const result = await handleSubmit();
    if (result.success) {
      handleBack();
      setTimeout(() => {
        Alert.alert("Success", result.message);
      }, 100);
    } else {
      Alert.alert("Error", result.message);
    }
  };

  const onClearAll = () => {
    Alert.alert("Clear All", "Are you sure you want to clear all entries?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: clearAll,
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <View className="flex-1">
        {/* Header */}
        <View className="px-5 pt-6 pb-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handleBack}
                className="p-2 bg-gray-50 rounded-full mr-4"
              >
                <ArrowLeft color="#C62828" size={24} />
              </TouchableOpacity>
              <View>
                <Text className="text-2xl font-bold text-gray-800">
                  Cash Count
                </Text>
                <Text className="text-gray-500 text-sm">
                  Enter denomination quantities
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClearAll}>
              <Text className="text-brand-red font-semibold">Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Shift Badge (read-only, set from reconciliation screen) */}
          <View className="flex-row mt-3" style={{ gap: 5 }}>
            <View className="flex-1 py-3 rounded-xl flex-row items-center justify-center bg-brand-red">
              <Text className="text-center font-bold text-white">
                {shift} Shift
              </Text>
            </View>
          </View>
        </View>

        {/* Denominations List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
        >
          {entries.map((entry, index) => {
            const qty = parseInt(entry.quantity || "0");
            const subtotal = entry.displayValue * qty;
            const hasValue = qty > 0;

            return (
              <View
                key={`${entry.denomination}-${
                  entry.isCoin ? "coin" : "note"
                }-${index}`}
                className={`flex-row items-center bg-white rounded-2xl p-4 mb-3 border ${
                  hasValue ? "border-brand-red/30" : "border-gray-100"
                }`}
              >
                {/* Denomination Label */}
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Banknote
                      color={hasValue ? "#C62828" : "#9CA3AF"}
                      size={20}
                    />
                    <Text
                      className={`ml-2 font-bold text-lg ${
                        hasValue ? "text-brand-red" : "text-gray-700"
                      }`}
                    >
                      {entry.label}
                    </Text>
                  </View>
                  {hasValue && (
                    <Text className="text-gray-500 text-sm mt-1">
                      = {formatCurrency(subtotal)}
                    </Text>
                  )}
                </View>

                {/* Quantity Controls */}
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => decrementQuantity(index)}
                    className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <Minus color="#6B7280" size={18} />
                  </TouchableOpacity>

                  <TextInput
                    value={entry.quantity}
                    onChangeText={(value) => updateQuantity(index, value)}
                    placeholder="0"
                    keyboardType="number-pad"
                    className="w-16 text-center text-xl font-bold text-gray-800 mx-2"
                    maxLength={4}
                  />

                  <TouchableOpacity
                    onPress={() => incrementQuantity(index)}
                    className="w-10 h-10 bg-brand-red rounded-full items-center justify-center"
                  >
                    <Plus color="white" size={18} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Summary & Submit - Fixed at bottom */}
        <View className="my-9 px-5 pb-9 pt-4 bg-white border-t border-gray-100">
          {/* Summary */}
          <View className="flex-row justify-between mb-4">
            <View>
              <Text className="text-gray-500 text-sm">Total Notes/Coins</Text>
              <Text className="text-xl font-bold text-gray-800">
                {totalNotes}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-gray-500 text-sm">Total Amount</Text>
              <Text className="text-2xl font-bold text-brand-red">
                {formatCurrency(totalAmount)}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={onSubmit}
            disabled={isSubmitting || filledEntries === 0}
            className={`mb-20 py-4 rounded-xl flex-row items-center justify-center space-x-2 ${
              isSubmitting || filledEntries === 0
                ? "bg-gray-300"
                : isEditing
                  ? "bg-green-600"
                  : "bg-brand-red"
            }`}
          >
            <Save color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Update Cash Count"
                  : "Save Cash Count"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
