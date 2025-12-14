import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
} from "react-native";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { fetchBalances } from "../store/slices/balancesSlice";
import { fetchCashCounts } from "../store/slices/cashCountSlice";
import { fetchCommissions } from "../store/slices/commissionsSlice";
import { fetchDashboard } from "../store/slices/dashboardSlice";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { useCurrencyFormatter } from "../hooks/useCurrency";
import { formatDate } from "../utils/formatters";
import type { AppDispatch, RootState } from "../store";
import type { Balance, CashCount, Commission, ShiftEnum } from "../types";

export default function BalanceDetailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string; shift: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { items: allBalances, isLoading: balancesLoading } = useSelector(
    (state: RootState) => state.balances
  );
  const { items: allCashCounts, isLoading: cashCountsLoading } = useSelector(
    (state: RootState) => state.cashCount
  );
  const { items: allCommissions, isLoading: commissionsLoading } = useSelector(
    (state: RootState) => state.commissions
  );
  const { summary } = useSelector((state: RootState) => state.dashboard);

  const date = params.date || new Date().toISOString().split("T")[0];
  const shift = (params.shift as ShiftEnum) || "AM";

  // Filter data for this date/shift
  const balances = allBalances.filter(
    (b) => b.date.startsWith(date) && b.shift === shift
  );
  const cashCounts = allCashCounts.filter(
    (c) => c.date === date && c.shift === shift
  );
  const commissions = allCommissions.filter(
    (c) => c.date.startsWith(date) && c.shift === shift
  );

  // Calculate totals
  const totalFloat = balances.reduce((sum, b) => sum + b.amount, 0);
  const totalCash = cashCounts.reduce((sum, c) => sum + c.amount, 0);
  const grandTotal = totalFloat + totalCash;
  const totalCommission = commissions.reduce((sum, c) => sum + c.amount, 0);

  // Get expected total from dashboard summary if available
  const expectedGrandTotal = summary?.expectedGrandTotal ?? grandTotal;
  const variance = grandTotal - expectedGrandTotal;

  // Determine status based on variance
  const getStatus = () => {
    if (balances.length === 0 && cashCounts.length === 0) return "Pending";
    if (Math.abs(variance) <= 1) return "Balanced";
    return "Discrepancy";
  };
  const status = getStatus();

  useEffect(() => {
    loadData();
  }, [date, shift]);

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchBalances({ date_from: date, date_to: date, shift })),
      dispatch(fetchCashCounts({ date_from: date, date_to: date, shift })),
      dispatch(fetchCommissions({ date_from: date, date_to: date, shift })),
      dispatch(fetchDashboard({ date, shift })),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isLoading = balancesLoading || cashCountsLoading || commissionsLoading;

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading balance details..." />;
  }

  const getImageUri = (item: Balance | Commission) => {
    if (item.image_data) {
      return `data:image/jpeg;base64,${item.image_data}`;
    }
    return item.image_url;
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-100 px-4 pt-14 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <ArrowLeft color="#000" size={24} />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-xl font-bold text-gray-900">
              {formatDate(date, "medium")}
            </Text>
            <View
              className={`px-3 py-1 rounded-full mt-1 ${
                shift === "AM" ? "bg-blue-100" : "bg-red-100"
              }`}
            >
              <Text
                className={`font-bold ${
                  shift === "AM" ? "text-blue-700" : "text-red-700"
                }`}
              >
                {shift} Shift
              </Text>
            </View>
          </View>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Card */}
        <View className="bg-brand-gold rounded-2xl p-5 mb-4 shadow-md">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-red-900/80 font-semibold text-lg">
              Grand Total
            </Text>
            {status === "Balanced" ? (
              <View className="flex-row items-center px-3 py-1 rounded-full bg-green-500">
                <CheckCircle2 size={14} color="#fff" />
                <Text className="text-white font-bold text-xs ml-1">
                  Balanced
                </Text>
              </View>
            ) : status === "Discrepancy" ? (
              <View className="flex-row items-center px-3 py-1 rounded-full bg-red-500">
                <AlertTriangle size={14} color="#fff" />
                <Text className="text-white font-bold text-xs ml-1">
                  Variance
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center px-3 py-1 rounded-full bg-yellow-500">
                <Clock size={14} color="#fff" />
                <Text className="text-white font-bold text-xs ml-1">
                  Pending
                </Text>
              </View>
            )}
          </View>

          <Text className="text-4xl font-bold text-red-900 mb-4">
            {formatCurrency(grandTotal)}
          </Text>

          <View className="flex-row justify-between">
            <View>
              <Text className="text-red-900/70">Float</Text>
              <Text className="text-xl font-bold text-red-900">
                {formatCurrency(totalFloat)}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-red-900/70">Cash</Text>
              <Text className="text-xl font-bold text-red-900">
                {formatCurrency(totalCash)}
              </Text>
            </View>
          </View>
        </View>

        {/* Variance Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="text-gray-700 font-semibold mb-3">
            Financial Analysis
          </Text>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Expected Total</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(expectedGrandTotal)}
            </Text>
          </View>

          <View className="flex-row justify-between mb-2">
            <Text className="text-gray-600">Actual Total</Text>
            <Text className="font-bold text-gray-800">
              {formatCurrency(grandTotal)}
            </Text>
          </View>

          <View className="border-t border-gray-100 pt-2 mt-2 flex-row justify-between items-center">
            <Text className="text-gray-700 font-semibold">Variance</Text>
            <View className="flex-row items-center">
              {variance >= 0 ? (
                <TrendingUp color="#16A34A" size={16} />
              ) : (
                <TrendingDown color="#DC2626" size={16} />
              )}
              <Text
                className={`font-bold ml-1 ${
                  variance >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {variance >= 0 ? "+" : ""}
                {formatCurrency(variance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Commission Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <Banknote color="#C62828" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Commissions ({commissions.length})
            </Text>
          </View>

          <Text className="text-2xl font-bold text-red-700 mb-3">
            {formatCurrency(totalCommission)}
          </Text>

          {commissions.length > 0 ? (
            commissions.map((commission, idx) => (
              <TouchableOpacity
                key={commission.id}
                onPress={() => {
                  const uri = getImageUri(commission);
                  if (uri) setSelectedImage(uri);
                }}
                className={`flex-row items-center py-3 ${
                  idx < commissions.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    {commission.account?.name ||
                      `Account ${commission.account_id}`}
                  </Text>
                </View>
                <Text className="font-bold text-gray-700 mr-3">
                  {formatCurrency(commission.amount)}
                </Text>
                {(commission.image_data || commission.image_url) && (
                  <ImageIcon size={16} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text className="text-gray-400 text-center py-2">
              No commissions recorded
            </Text>
          )}
        </View>

        {/* Balances Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <Wallet color="#B8860B" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Account Balances ({balances.length})
            </Text>
          </View>

          {balances.length > 0 ? (
            balances.map((balance, idx) => (
              <TouchableOpacity
                key={balance.id}
                onPress={() => {
                  const uri = getImageUri(balance);
                  if (uri) setSelectedImage(uri);
                }}
                className={`flex-row items-center py-3 ${
                  idx < balances.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <View className="flex-1">
                  <Text className="font-medium text-gray-800">
                    {balance.account?.name || `Account ${balance.account_id}`}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {balance.source}
                  </Text>
                </View>
                <Text className="font-bold text-gray-700 mr-3">
                  {formatCurrency(balance.amount)}
                </Text>
                {(balance.image_data || balance.image_url) && (
                  <ImageIcon size={16} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text className="text-gray-400 text-center py-2">
              No balances recorded
            </Text>
          )}
        </View>

        {/* Cash Count Card */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
          <View className="flex-row items-center mb-3">
            <Banknote color="#16A34A" size={20} />
            <Text className="text-gray-700 font-semibold ml-2">
              Cash Count ({cashCounts.length} denominations)
            </Text>
          </View>

          <Text className="text-2xl font-bold text-green-700 mb-3">
            {formatCurrency(totalCash)}
          </Text>

          {cashCounts.length > 0 ? (
            <View>
              <View className="flex-row py-2 border-b border-gray-200">
                <Text className="flex-1 font-semibold text-gray-600 text-xs">
                  Denomination
                </Text>
                <Text className="w-16 text-center font-semibold text-gray-600 text-xs">
                  Qty
                </Text>
                <Text className="w-24 text-right font-semibold text-gray-600 text-xs">
                  Amount
                </Text>
              </View>
              {cashCounts.map((cc, idx) => (
                <View
                  key={cc.id}
                  className={`flex-row py-2 ${
                    idx < cashCounts.length - 1 ? "border-b border-gray-50" : ""
                  }`}
                >
                  <Text className="flex-1 text-gray-700">
                    R{(cc.denomination / 100).toFixed(0)}
                  </Text>
                  <Text className="w-16 text-center text-gray-600">
                    ×{cc.quantity}
                  </Text>
                  <Text className="w-24 text-right font-semibold text-gray-700">
                    {formatCurrency(cc.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-gray-400 text-center py-2">
              No cash count recorded
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center">
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-14 right-4 p-2 bg-white/20 rounded-full z-10"
          >
            <X color="#fff" size={24} />
          </TouchableOpacity>

          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              className="w-full h-[80%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
