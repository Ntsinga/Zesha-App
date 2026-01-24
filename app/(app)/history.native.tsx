import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  CheckCircle2,
  Clock,
  Plus,
  ChevronRight,
  AlertTriangle,
} from "lucide-react-native";
import { useNavigation, useRouter } from "expo-router";
import { useBalanceHistoryScreen } from "../../hooks/screens/useBalanceHistoryScreen";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { BalanceHistoryEntry } from "../../types";

export default function BalanceHistory() {
  const navigation = useNavigation();
  const router = useRouter();
  const {
    isLoading,
    refreshing,
    history,
    onRefresh,
    formatCurrency,
    formatDate,
  } = useBalanceHistoryScreen();

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading history..." />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="mb-6">
          <Text className="text-3xl font-bold text-brand-red">History</Text>
        </View>

        {history.length === 0 ? (
          <View className="bg-white rounded-xl p-8 items-center shadow-sm">
            <Clock size={48} color="#9CA3AF" />
            <Text className="text-gray-400 mt-4">No history records yet</Text>
          </View>
        ) : (
          <View className="space-y-3">
            {history.map((record: BalanceHistoryEntry, index: number) => (
              <TouchableOpacity
                key={record.id || `history-${index}`}
                onPress={() => {
                  router.push(
                    `/reconciliation?date=${record.date}&shift=${record.shift}` as any,
                  );
                }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center">
                    <Text className="font-bold text-gray-800 text-base">
                      {formatDate(record.date, "medium")}
                    </Text>
                    <View
                      className={`ml-2 px-2 py-0.5 rounded-full ${
                        record.shift === "AM" ? "bg-blue-100" : "bg-orange-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          record.shift === "AM"
                            ? "text-blue-700"
                            : "text-orange-700"
                        }`}
                      >
                        {record.shift}
                      </Text>
                    </View>
                  </View>
                  {record.status === "PASSED" ? (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-green-100">
                      <CheckCircle2 size={12} color="#15803d" />
                      <Text className="text-xs font-bold text-green-700 ml-1">
                        Success
                      </Text>
                    </View>
                  ) : record.status === "FAILED" ? (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-red-100">
                      <AlertTriangle size={12} color="#dc2626" />
                      <Text className="text-xs font-bold text-red-700 ml-1">
                        Fail
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-yellow-100">
                      <Clock size={12} color="#a16207" />
                      <Text className="text-xs font-bold text-yellow-700 ml-1">
                        Pending
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row justify-between">
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">Float</Text>
                    <Text className="font-bold text-gray-800">
                      {formatCurrency(record.totalFloat)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs text-gray-500 mb-1">Cash</Text>
                    <Text className="font-bold text-gray-800">
                      {formatCurrency(record.totalCash)}
                    </Text>
                  </View>
                  <View className="items-end justify-center">
                    <ChevronRight size={20} color="#9CA3AF" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push("/balance")}
          className="bg-brand-red py-4 rounded-xl shadow-md items-center flex-row justify-center mt-6"
        >
          <Plus size={20} color="white" />
          <Text className="text-white font-bold ml-2">Add New Record</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
