import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { CheckCircle2, Clock, Menu, Plus } from "lucide-react-native";
import { useNavigation } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchBalanceHistory } from "../store/slices/balanceHistorySlice";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { formatCurrency, formatDate } from "../utils/formatters";
import { ActionModal, AddBalanceForm } from "../components/ActionModal";
import type { AppDispatch, RootState } from "../store";
import type { BalanceHistoryEntry } from "../types";

export default function BalanceHistory() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const {
    entries: history,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.balanceHistory);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchBalanceHistory());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchBalanceHistory());
    setRefreshing(false);
  };

  const handleFormSuccess = () => {
    dispatch(fetchBalanceHistory());
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading history..." />;
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
          <Text className="text-3xl font-bold text-brand-red">History</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer()}
            className="p-2 bg-brand-red rounded-md shadow-sm"
          >
            <Menu color="white" size={24} />
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-xl shadow-md border-2 border-brand-red/10 overflow-hidden mb-6">
          <View className="bg-brand-red p-4 flex-row">
            <Text className="text-white font-bold text-xs uppercase flex-1">
              Date
            </Text>
            <Text className="text-white font-bold text-xs uppercase w-20 text-right">
              Cash
            </Text>
            <Text className="text-white font-bold text-xs uppercase w-24 text-right">
              Status
            </Text>
          </View>

          {history.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-400">No history records yet</Text>
            </View>
          ) : (
            history.map((record: BalanceHistoryEntry, index: number) => (
              <View
                key={record.id || `history-${index}`}
                className={`flex-row items-center p-4 border-b border-yellow-100 ${
                  index % 2 === 0 ? "bg-white" : "bg-yellow-50/30"
                }`}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    {formatDate(record.date, "short")}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Cap: {formatCurrency(record.capital)}
                  </Text>
                </View>
                <View className="w-20 items-end">
                  <Text className="font-semibold text-gray-700">
                    {formatCurrency(record.totalCash)}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    Amt: {formatCurrency(record.amount)}
                  </Text>
                </View>
                <View className="w-24 items-end pl-2">
                  {record.status === "Balanced" ? (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-green-100">
                      <CheckCircle2 size={12} color="#15803d" />
                      <Text className="text-[10px] font-bold text-green-700 ml-1">
                        OK
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-yellow-100">
                      <Clock size={12} color="#a16207" />
                      <Text className="text-[10px] font-bold text-yellow-700 ml-1">
                        Pend
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={() => setIsModalOpen(true)}
          className="bg-brand-red py-3 rounded-lg shadow-md items-center flex-row justify-center"
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-bold ml-2">Add New Record</Text>
        </TouchableOpacity>
      </ScrollView>

      <ActionModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Balance"
      >
        <AddBalanceForm
          onSuccess={handleFormSuccess}
          onClose={() => setIsModalOpen(false)}
        />
      </ActionModal>
    </View>
  );
}
