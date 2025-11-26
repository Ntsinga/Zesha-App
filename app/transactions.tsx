import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Camera, Plus, Filter, Menu } from "lucide-react-native";
import { useNavigation } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { ActionModal, AddTransactionForm } from "../components/ActionModal";
import { fetchTransactions } from "../store/slices/transactionsSlice";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { formatCurrency, formatDate } from "../utils/formatters";
import type { AppDispatch, RootState } from "../store";
import type { Transaction } from "../types";

export default function Transactions() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    items: transactions,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.transactions);
  const [refreshing, setRefreshing] = useState(false);

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

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading transactions..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="flex-row justify-between items-center mb-6 mt-4">
          <Text className="text-3xl font-bold text-brand-red">
            Transactions
          </Text>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer()}
            className="p-2 bg-brand-red rounded-md shadow-sm"
          >
            <Menu color="white" size={24} />
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-between items-center mb-4">
          <TouchableOpacity
            onPress={() => setIsModalOpen(true)}
            className="bg-brand-red px-4 py-2 rounded-lg flex-row items-center shadow-sm"
          >
            <Plus size={16} color="white" />
            <Text className="text-white font-bold ml-2">New</Text>
          </TouchableOpacity>
          <TouchableOpacity className="p-2 bg-white rounded-lg border border-gray-200">
            <Filter size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <Text className="text-lg font-bold text-brand-red mb-4">
            Recent Activity
          </Text>

          {transactions.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-400">No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx: Transaction, idx: number) => (
              <View
                key={tx.id || `tx-${idx}`}
                className="border-b border-gray-100 py-4 flex-row justify-between items-center"
              >
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="font-bold text-gray-700 mr-2">
                      {tx.account || "Unknown"}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {formatDate(tx.date, "short")}
                    </Text>
                  </View>
                  <Text className="text-brand-red font-medium">
                    {tx.description}
                  </Text>
                  <View className="bg-gray-100 self-start px-2 py-0.5 rounded mt-1">
                    <Text className="text-xs text-gray-500">{tx.category}</Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text
                    className={`font-bold text-base ${
                      tx.type === "income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatCurrency(Math.abs(tx.amount))}
                  </Text>
                  {tx.hasReceipt && (
                    <View className="mt-2">
                      <Camera size={14} color="#9CA3AF" />
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ActionModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Transaction"
      >
        <AddTransactionForm
          onSuccess={handleFormSuccess}
          onClose={() => setIsModalOpen(false)}
        />
      </ActionModal>
    </View>
  );
}
