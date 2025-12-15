import React, { useState, useEffect } from "react";
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
  Menu,
  Plus,
  ChevronRight,
  AlertTriangle,
} from "lucide-react-native";
import { useNavigation, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchBalanceHistory } from "../../store/slices/balanceHistorySlice";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import { formatDate } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";
import type { BalanceHistoryEntry } from "../../types";

export default function BalanceHistory() {
  const navigation = useNavigation();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const {
    entries: history,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.balanceHistory);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(fetchBalanceHistory());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchBalanceHistory());
    setRefreshing(false);
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
            <Text className="text-white font-bold text-xs uppercase w-20 text-center">
              Float
            </Text>
            <Text className="text-white font-bold text-xs uppercase w-20 text-center">
              Cash
            </Text>
            <Text className="text-white font-bold text-xs uppercase w-16 text-center">
              Status
            </Text>
            <View className="w-6" />
          </View>

          {history.length === 0 ? (
            <View className="py-8 items-center">
              <Text className="text-gray-400">No history records yet</Text>
            </View>
          ) : (
            history.map((record: BalanceHistoryEntry, index: number) => (
              <TouchableOpacity
                key={record.id || `history-${index}`}
                onPress={() =>
                  router.push({
                    pathname: "/balance-detail",
                    params: { date: record.date, shift: record.shift },
                  })
                }
                className={`flex-row items-center p-4 border-b border-yellow-100 ${
                  index % 2 === 0 ? "bg-white" : "bg-yellow-50/30"
                }`}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    {formatDate(record.date, "short")}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        record.shift === "AM" ? "bg-blue-100" : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          record.shift === "AM"
                            ? "text-blue-700"
                            : "text-red-700"
                        }`}
                      >
                        {record.shift}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="w-20 items-center">
                  <Text className="font-semibold text-gray-700 text-sm">
                    {formatCurrency(record.totalFloat)}
                  </Text>
                </View>
                <View className="w-20 items-center">
                  <Text className="font-semibold text-gray-700 text-sm">
                    {formatCurrency(record.totalCash)}
                  </Text>
                </View>
                <View className="w-16 items-center">
                  {record.status === "PASSED" ? (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-green-100">
                      <CheckCircle2 size={10} color="#15803d" />
                      <Text className="text-[9px] font-bold text-green-700 ml-0.5">
                        OK
                      </Text>
                    </View>
                  ) : record.status === "FAILED" ? (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-red-100">
                      <AlertTriangle size={10} color="#dc2626" />
                      <Text className="text-[9px] font-bold text-red-700 ml-0.5">
                        Fail
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-yellow-100">
                      <Clock size={10} color="#a16207" />
                      <Text className="text-[9px] font-bold text-yellow-700 ml-0.5">
                        Flag
                      </Text>
                    </View>
                  )}
                </View>
                <View className="w-6 items-end">
                  <ChevronRight size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push("/balance")}
          className="bg-brand-red py-3 rounded-lg shadow-md items-center flex-row justify-center"
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-bold ml-2">Add New Record</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
