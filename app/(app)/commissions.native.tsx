import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import {
  ArrowLeft,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  RotateCcw,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useCommissionsScreen } from "../../hooks/screens/useCommissionsScreen";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { ExpectedCommission, ShiftEnum } from "../../types";

function CommissionItem({
  ec,
  formatCurrency,
  formatDateTime,
}: {
  ec: ExpectedCommission;
  formatCurrency: (v: number) => string;
  formatDateTime: (v: string) => string;
}) {
  return (
    <View className="px-4 py-3 border-b border-gray-50">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-gray-800">
            {ec.accountName || `Account #${ec.accountId}`}
          </Text>
          <View className="flex-row items-center mt-1 flex-wrap">
            <View
              className={`px-2 py-0.5 rounded-full mr-2 ${
                ec.transactionType === "DEPOSIT" ? "bg-green-100" : "bg-red-100"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  ec.transactionType === "DEPOSIT"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                {ec.transactionType === "DEPOSIT" ? "Deposit" : "Withdraw"}
              </Text>
            </View>
            <Text className="text-xs text-gray-400">
              {ec.transactionTime
                ? formatDateTime(ec.transactionTime)
                : ec.date}
            </Text>
            <View className="bg-gray-100 px-1.5 py-0.5 rounded ml-2">
              <Text className="text-xs text-gray-500">{ec.shift}</Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <Text className="font-bold text-purple-600 text-base">
            {formatCurrency(ec.commissionAmount)}
          </Text>
          <Text className="text-xs text-gray-400">
            {formatCurrency(ec.transactionAmount)} ×{" "}
            {parseFloat(String(ec.commissionRate))}%
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function CommissionsPage() {
  const router = useRouter();

  const {
    isLoading,
    refreshing,
    filterShift,
    setFilterShift,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filteredCommissions,
    metrics,
    onRefresh,
    handleResetFilters,
    formatCurrency,
    formatDateTime,
  } = useCommissionsScreen();

  if (isLoading && filteredCommissions.length === 0) {
    return <LoadingSpinner message="Loading expected commissions..." />;
  }

  const renderItem = ({ item }: { item: ExpectedCommission }) => (
    <CommissionItem
      ec={item}
      formatCurrency={formatCurrency}
      formatDateTime={formatDateTime}
    />
  );

  const shiftOptions: Array<ShiftEnum | "ALL"> = [
    "ALL",
    "AM" as ShiftEnum,
    "PM" as ShiftEnum,
  ];

  const ListHeader = (
    <>
      {/* Date & filter bar */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Calendar color="#7c3aed" size={16} />
          <Text className="text-sm font-medium text-gray-700 ml-1.5">
            {filterDateFrom === filterDateTo
              ? new Date(filterDateFrom + "T00:00:00").toLocaleDateString(
                  "en-ZA",
                  {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  },
                )
              : `${new Date(filterDateFrom + "T00:00:00").toLocaleDateString(
                  "en-ZA",
                  {
                    day: "2-digit",
                    month: "short",
                  },
                )} – ${new Date(filterDateTo + "T00:00:00").toLocaleDateString(
                  "en-ZA",
                  {
                    day: "2-digit",
                    month: "short",
                  },
                )}`}
          </Text>
        </View>
        <TouchableOpacity onPress={handleResetFilters} className="p-1.5">
          <RotateCcw color="#64748b" size={16} />
        </TouchableOpacity>
      </View>

      {/* Shift filter chips */}
      <View className="flex-row gap-2 mb-4">
        {shiftOptions.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setFilterShift(s)}
            className="px-4 py-1.5 rounded-full border"
            style={{
              backgroundColor: filterShift === s ? "#7c3aed" : "#F9FAFB",
              borderColor: filterShift === s ? "#7c3aed" : "#E5E7EB",
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: filterShift === s ? "#FFFFFF" : "#374151" }}
            >
              {s === "ALL" ? "All Shifts" : s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Cards */}
      <View className="bg-purple-600 rounded-2xl p-5 mb-4 shadow-md">
        <View className="flex-row items-center mb-2">
          <TrendingUp color="#fff" size={24} />
          <Text className="text-white/80 font-semibold text-lg ml-2">
            Total Expected
          </Text>
        </View>
        <Text className="text-4xl font-bold text-white">
          {formatCurrency(metrics.totalCommission)}
        </Text>
        <Text className="text-white/60 mt-1">
          {metrics.recordCount} transaction
          {metrics.recordCount !== 1 ? "s" : ""}
        </Text>
      </View>

      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-1">
            <ArrowDownLeft color="#22c55e" size={16} />
            <Text className="text-gray-500 text-xs ml-1">Deposits</Text>
          </View>
          <Text className="text-lg font-bold text-gray-800">
            {formatCurrency(metrics.depositCommission)}
          </Text>
        </View>
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-1">
            <ArrowUpRight color="#ef4444" size={16} />
            <Text className="text-gray-500 text-xs ml-1">Withdrawals</Text>
          </View>
          <Text className="text-lg font-bold text-gray-800">
            {formatCurrency(metrics.withdrawCommission)}
          </Text>
        </View>
      </View>

      {/* List header label */}
      {filteredCommissions.length > 0 && (
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Commission Details
        </Text>
      )}
    </>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-4 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
            Expected Commissions
          </Text>
          <View className="p-2 w-10" />
        </View>
      </View>

      {filteredCommissions.length === 0 ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {ListHeader}
          <View className="bg-white rounded-2xl p-8 items-center shadow-sm">
            <Banknote color="#9CA3AF" size={48} />
            <Text className="text-gray-400 mt-4 text-center">
              No expected commissions
            </Text>
            <Text className="text-gray-400 text-sm text-center mt-2">
              Commissions are auto-calculated from transactions
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredCommissions}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={
            <View style={{ padding: 16, paddingBottom: 0 }}>
              {ListHeader}
              {/* Card wrapper for list */}
              <View className="bg-white rounded-t-2xl shadow-sm border border-b-0 border-gray-100 overflow-hidden" />
            </View>
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
          contentContainerStyle={{ paddingBottom: 0 }}
          ItemSeparatorComponent={() => null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          style={{ flex: 1 }}
          className="bg-white mx-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-0"
        />
      )}
    </View>
  );
}
