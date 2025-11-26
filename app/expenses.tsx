import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Menu, Plus } from "lucide-react-native";
import { useNavigation } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { formatCurrency } from "../utils/formatters";
import { ActionModal, AddTransactionForm } from "../components/ActionModal";
import type { AppDispatch, RootState } from "../store";
import type { Transaction } from "../types";

export default function Expenses() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { items: transactions, isLoading } = useSelector(
    (state: RootState) => state.transactions
  );
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchTransactions());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchTransactions());
    setRefreshing(false);
  };

  const handleFormSuccess = () => {
    dispatch(fetchTransactions());
  };

  // Filter to only expenses
  const expenses = transactions.filter(
    (t: Transaction) => t.type === "expense"
  );

  // Calculate total expenses
  const totalExpenses = expenses.reduce(
    (sum: number, t: Transaction) => sum + t.amount,
    0
  );

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading expenses..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="flex-row justify-between items-center mb-8 mt-4">
          <Text className="text-3xl font-bold text-brand-red">Expenses</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer()}
            className="p-2 bg-brand-red rounded-md shadow-sm"
          >
            <Menu color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Total Expenses Card */}
        <View className="bg-brand-red rounded-2xl p-5 mb-6 shadow-md">
          <Text className="text-white/80 text-sm font-medium">
            Total Expenses
          </Text>
          <Text className="text-white text-3xl font-bold mt-1">
            {formatCurrency(totalExpenses)}
          </Text>
        </View>

        <View className="bg-white rounded-3xl shadow-lg p-5 border border-gray-100">
          <Text className="text-lg font-bold text-brand-red mb-4">
            Breakdown
          </Text>

          <View className="rounded-xl border border-brand-gold/30 overflow-hidden">
            <View className="bg-brand-gold/30 flex-row p-3">
              <Text className="flex-1 font-bold text-gray-800 text-xs uppercase">
                Expense
              </Text>
              <Text className="font-bold text-gray-800 text-xs uppercase">
                Amount
              </Text>
            </View>
            {expenses.length === 0 ? (
              <View className="py-8 items-center">
                <Text className="text-gray-400">No expenses yet</Text>
              </View>
            ) : (
              expenses.map((expense: Transaction, idx: number) => (
                <View
                  key={expense.id || `expense-${idx}`}
                  className={`flex-row p-3 ${
                    idx % 2 === 0 ? "bg-white" : "bg-brand-gold/10"
                  }`}
                >
                  <Text className="flex-1 text-gray-800 font-medium">
                    {expense.description}
                  </Text>
                  <Text className="text-right text-gray-800 font-medium">
                    {formatCurrency(Math.abs(expense.amount))}
                  </Text>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            onPress={() => setIsModalOpen(true)}
            className="w-full mt-6 bg-brand-red py-4 rounded-xl shadow-md items-center flex-row justify-center"
          >
            <Plus size={18} color="white" />
            <Text className="text-white font-bold text-base ml-2">
              Add Expense
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ActionModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Expense"
      >
        <AddTransactionForm
          onSuccess={handleFormSuccess}
          onClose={() => setIsModalOpen(false)}
        />
      </ActionModal>
    </View>
  );
}
