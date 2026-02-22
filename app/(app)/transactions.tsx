import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Plus, Filter } from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { ActionModal, AddTransactionForm } from "../../components/ActionModal";
import { fetchTransactions } from "../../store/slices/transactionsSlice";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { formatDate } from "../../utils/formatters";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import type { AppDispatch, RootState } from "../../store";
import type { TransactionRecord as Transaction } from "../../types";

export default function Transactions() {
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
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
        <View className="mb-6 mt-4">
          <Text className="text-3xl font-bold text-brand-red">
            Transactions
          </Text>
        </View>

        <View className="flex-row justify-end items-center mb-4">
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
                      {tx.account?.name || `Acct #${tx.accountId}`}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {formatDate(tx.transactionTime, "short")} · {tx.shift}
                    </Text>
                  </View>
                  {tx.reference ? (
                    <Text className="text-gray-600 font-medium">
                      {tx.reference}
                    </Text>
                  ) : null}
                  {tx.notes ? (
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {tx.notes}
                    </Text>
                  ) : null}
                  <View className="bg-gray-100 self-start px-2 py-0.5 rounded mt-1">
                    <Text className="text-xs text-gray-500">
                      {tx.transactionType}
                    </Text>
                  </View>
                </View>
                <View className="items-end">
                  <Text
                    className={`font-bold text-base ${
                      tx.transactionType === "DEPOSIT"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {tx.transactionType === "DEPOSIT" ? "+" : "-"}
                    {formatCurrency(Math.abs(tx.amount))}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setIsModalOpen(true)}
        className="absolute bottom-32 right-5 w-14 h-14 bg-brand-red rounded-full items-center justify-center"
        style={{
          elevation: 8,
          shadowColor: "#DC2626",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Plus color="white" size={28} />
      </TouchableOpacity>

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
