import React, { useState, useMemo } from "react";
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
import { useRouter } from "expo-router";
import { ArrowLeft, Save, Plus, Minus, Banknote } from "lucide-react-native";
import { useDispatch } from "react-redux";
import { createManyCashCounts } from "../store/slices/cashCountSlice";
import { fetchDashboard } from "../store/slices/dashboardSlice";
import type { AppDispatch } from "../store";
import type { ShiftEnum, CashCountCreate } from "../types";

// Denomination values in cents
// 10000 = R100, 5000 = R50, 2000 = R20, 1000 = R10, 500 = R5, 200 = R2, 100 = R1
const DENOMINATIONS = [
  { value: 50000, label: "50,000", displayValue: 50000 },
  { value: 20000, label: "20,000", displayValue: 20000 },
  { value: 10000, label: "10,000", displayValue: 10000 },
  { value: 5000, label: "5,000", displayValue: 5000 },
  { value: 2000, label: "2,000", displayValue: 2000 },
  { value: 1000, label: "1,000 (Note)", displayValue: 1000, isNote: true },
  { value: 1000, label: "1,000 (Coin)", displayValue: 1000, isCoin: true },
  { value: 500, label: "500", displayValue: 500 },
  { value: 200, label: "200", displayValue: 200 },
  { value: 100, label: "100", displayValue: 100 },
];

interface DenominationEntry {
  denomination: number;
  label: string;
  displayValue: number;
  quantity: string;
  isCoin?: boolean;
  isNote?: boolean;
}

export default function AddCashCountPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  const [shift, setShift] = useState<ShiftEnum>("AM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<DenominationEntry[]>(
    DENOMINATIONS.map((d) => ({
      denomination: d.value,
      label: d.label,
      displayValue: d.displayValue,
      quantity: "",
      isCoin: d.isCoin,
      isNote: d.isNote,
    }))
  );

  const updateQuantity = (index: number, value: string) => {
    // Only allow numeric input
    if (value !== "" && !/^\d+$/.test(value)) return;

    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, quantity: value } : entry
      )
    );
  };

  const incrementQuantity = (index: number) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? { ...entry, quantity: String(parseInt(entry.quantity || "0") + 1) }
          : entry
      )
    );
  };

  const decrementQuantity = (index: number) => {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const current = parseInt(entry.quantity || "0");
        return { ...entry, quantity: current > 0 ? String(current - 1) : "" };
      })
    );
  };

  // Calculate totals
  const { totalAmount, totalNotes, filledEntries } = useMemo(() => {
    let amount = 0;
    let notes = 0;
    let filled = 0;

    entries.forEach((entry) => {
      const qty = parseInt(entry.quantity || "0");
      if (qty > 0) {
        amount += (entry.denomination / 100) * qty; // Convert cents to rands
        notes += qty;
        filled++;
      }
    });

    return { totalAmount: amount, totalNotes: notes, filledEntries: filled };
  }, [entries]);

  const handleSubmit = async () => {
    const validEntries = entries.filter(
      (entry) => parseInt(entry.quantity || "0") > 0
    );

    if (validEntries.length === 0) {
      Alert.alert("Error", "Please enter at least one denomination quantity.");
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split("T")[0];
      const cashCountData: CashCountCreate[] = validEntries.map((entry) => ({
        denomination: entry.denomination,
        quantity: parseInt(entry.quantity),
        amount: (entry.denomination / 100) * parseInt(entry.quantity),
        date: today,
        shift,
      }));

      await dispatch(createManyCashCounts(cashCountData)).unwrap();

      // Refresh dashboard after adding cash counts
      dispatch(fetchDashboard({}));

      Alert.alert(
        "Success",
        `Cash count saved! Total: R${totalAmount.toLocaleString()}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save cash count"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearAll = () => {
    Alert.alert("Clear All", "Are you sure you want to clear all entries?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () =>
          setEntries((prev) => prev.map((e) => ({ ...e, quantity: "" }))),
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
                onPress={() => router.back()}
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
            <TouchableOpacity onPress={clearAll}>
              <Text className="text-brand-red font-semibold">Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Shift Selection */}
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setShift("AM")}
              className={`flex-1 py-3 rounded-xl ${
                shift === "AM"
                  ? "bg-brand-red"
                  : "bg-gray-100 border border-gray-200"
              }`}
            >
              <Text
                className={`text-center font-bold ${
                  shift === "AM" ? "text-white" : "text-gray-600"
                }`}
              >
                AM Shift
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShift("PM")}
              className={`flex-1 py-3 rounded-xl ${
                shift === "PM"
                  ? "bg-brand-red"
                  : "bg-gray-100 border border-gray-200"
              }`}
            >
              <Text
                className={`text-center font-bold ${
                  shift === "PM" ? "text-white" : "text-gray-600"
                }`}
              >
                PM Shift
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Denominations List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          {entries.map((entry, index) => {
            const qty = parseInt(entry.quantity || "0");
            const subtotal = (entry.denomination / 100) * qty;
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
                      = R{subtotal.toLocaleString()}
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
        <View className="px-5 pb-6 pt-4 bg-white border-t border-gray-100">
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
                R{totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || filledEntries === 0}
            className={`py-4 rounded-xl flex-row items-center justify-center space-x-2 ${
              isSubmitting || filledEntries === 0
                ? "bg-gray-300"
                : "bg-brand-red"
            }`}
          >
            <Save color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">
              {isSubmitting ? "Saving..." : "Save Cash Count"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
