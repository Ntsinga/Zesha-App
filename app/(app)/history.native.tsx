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
  FileEdit,
  Calculator,
  Lock,
  CheckCheck,
  XCircle,
} from "lucide-react-native";
import { useNavigation, useRouter } from "expo-router";
import { useBalanceHistoryScreen } from "../../hooks/screens/useBalanceHistoryScreen";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { BalanceHistoryEntry } from "../../types";

// Helper to determine reconciliation status display
const getReconciliationStatus = (
  record: BalanceHistoryEntry,
): {
  label: string;
  color: "gray" | "blue" | "yellow" | "green" | "red";
  icon: React.ComponentType<any>;
} => {
  if (!record.isFinalized) {
    return record.reconciliationStatus === "CALCULATED"
      ? { label: "Calculated", color: "blue", icon: Calculator }
      : { label: "Draft", color: "gray", icon: FileEdit };
  }

  if (record.approvalStatus === "APPROVED") {
    return { label: "Approved", color: "green", icon: CheckCheck };
  }

  if (record.approvalStatus === "REJECTED") {
    return { label: "Rejected", color: "red", icon: XCircle };
  }

  return { label: "Awaiting Review", color: "yellow", icon: Lock };
};

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
            {history.map((record, index) => (
              <TouchableOpacity
                key={record.id || `history-${index}`}
                onPress={() => {
                  router.push(
                    `/reconciliation?date=${record.date}&shift=${record.shift}&subtype=${record.subtype ?? "CLOSING"}` as any,
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
                  {(() => {
                    const statusInfo = getReconciliationStatus(record);
                    const StatusIcon = statusInfo.icon;
                    const colorClasses: {
                      [K in "gray" | "blue" | "yellow" | "green" | "red"]: {
                        bg: string;
                        text: string;
                        icon: string;
                      };
                    } = {
                      gray: {
                        bg: "bg-gray-100",
                        text: "text-gray-700",
                        icon: "#374151",
                      },
                      blue: {
                        bg: "bg-blue-100",
                        text: "text-blue-700",
                        icon: "#1d4ed8",
                      },
                      yellow: {
                        bg: "bg-yellow-100",
                        text: "text-yellow-700",
                        icon: "#a16207",
                      },
                      green: {
                        bg: "bg-green-100",
                        text: "text-green-700",
                        icon: "#15803d",
                      },
                      red: {
                        bg: "bg-red-100",
                        text: "text-red-700",
                        icon: "#dc2626",
                      },
                    };
                    const colors = colorClasses[statusInfo.color];
                    return (
                      <View
                        className={`flex-row items-center px-2 py-1 rounded-full ${colors.bg}`}
                      >
                        <StatusIcon size={12} color={colors.icon} />
                        <Text
                          className={`text-xs font-bold ${colors.text} ml-1`}
                        >
                          {statusInfo.label}
                        </Text>
                      </View>
                    );
                  })()}
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
