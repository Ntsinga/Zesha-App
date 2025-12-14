import React, { useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Banknote,
  Wallet,
  ChevronRight,
  CheckCircle2,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import { fetchCashCounts } from "../store/slices/cashCountSlice";
import { fetchBalances } from "../store/slices/balancesSlice";
import { fetchAccounts } from "../store/slices/accountsSlice";
import { useCurrencyFormatter } from "../hooks/useCurrency";
import type { AppDispatch, RootState } from "../store";
import type { ShiftEnum } from "../types";

export default function BalancePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Get cash counts, balances, and accounts from Redux
  const { items: cashCounts, isLoading } = useSelector(
    (state: RootState) => state.cashCount
  );

  const { items: balances } = useSelector((state: RootState) => state.balances);

  const { items: accounts } = useSelector((state: RootState) => state.accounts);

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchCashCounts({ count_date: today }));
    dispatch(fetchBalances({ date_from: today, date_to: today }));
    dispatch(fetchAccounts({ is_active: true }));
  }, [dispatch, today]);

  // Calculate shift completion status and totals
  const {
    hasAMShift,
    hasPMShift,
    latestShift,
    latestShiftTotal,
    hasTodayCashCount,
  } = useMemo(() => {
    const todayCounts = cashCounts.filter((cc) => cc.date === today);

    const amCounts = todayCounts.filter((cc) => cc.shift === "AM");
    const pmCounts = todayCounts.filter((cc) => cc.shift === "PM");

    const hasAM = amCounts.length > 0;
    const hasPM = pmCounts.length > 0;

    // PM is considered "latest" if it exists, otherwise AM
    let latest: ShiftEnum | null = null;
    let total = 0;

    if (hasPM) {
      latest = "PM";
      total = pmCounts.reduce(
        (sum, cc) => sum + parseFloat(String(cc.amount)),
        0
      );
    } else if (hasAM) {
      latest = "AM";
      total = amCounts.reduce(
        (sum, cc) => sum + parseFloat(String(cc.amount)),
        0
      );
    }

    return {
      hasAMShift: hasAM,
      hasPMShift: hasPM,
      latestShift: latest,
      latestShiftTotal: total,
      hasTodayCashCount: hasAM || hasPM,
    };
  }, [cashCounts, today]);

  // Calculate balance completion status
  const { hasAMBalances, hasPMBalances, latestBalanceShift, hasTodayBalances } =
    useMemo(() => {
      const activeAccounts = accounts.filter((acc) => acc.is_active);
      const todayBalances = balances.filter((bal) =>
        bal.date.startsWith(today)
      );

      console.log("[Balance] Completion check:", {
        today,
        activeAccountsCount: activeAccounts.length,
        activeAccounts: activeAccounts.map((a) => ({ id: a.id, name: a.name })),
        todayBalancesCount: todayBalances.length,
        todayBalances: todayBalances.map((b) => ({
          account_id: b.account_id,
          shift: b.shift,
        })),
      });

      const amBalances = todayBalances.filter((bal) => bal.shift === "AM");
      const pmBalances = todayBalances.filter((bal) => bal.shift === "PM");

      console.log("[Balance] Shift balances:", {
        amCount: amBalances.length,
        pmCount: pmBalances.length,
        amAccounts: amBalances.map((b) => b.account_id),
        pmAccounts: pmBalances.map((b) => b.account_id),
      });

      // Check if all active accounts have balances for each shift
      const hasAM =
        activeAccounts.length > 0 &&
        activeAccounts.every((acc) =>
          amBalances.some((bal) => bal.account_id === acc.id)
        );

      const hasPM =
        activeAccounts.length > 0 &&
        activeAccounts.every((acc) =>
          pmBalances.some((bal) => bal.account_id === acc.id)
        );

      console.log("[Balance] Completion status:", { hasAM, hasPM });

      // PM is considered "latest" if it exists, otherwise AM
      let latest: ShiftEnum | null = null;
      if (hasPM) {
        latest = "PM";
      } else if (hasAM) {
        latest = "AM";
      }

      return {
        hasAMBalances: hasAM,
        hasPMBalances: hasPM,
        latestBalanceShift: latest,
        hasTodayBalances: hasAM || hasPM,
      };
    }, [balances, accounts, today]);

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View className="flex-row items-center mb-8 mt-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 bg-white rounded-full shadow-sm mr-4"
          >
            <ArrowLeft color="#C62828" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-bold text-gray-800">Balance</Text>
            <Text className="text-gray-500 text-sm">
              Choose an option to continue
            </Text>
          </View>
        </View>

        {/* Options */}
        <View className="space-y-4">
          {/* Cash Count Option */}
          <TouchableOpacity
            onPress={() => router.push("/add-cash-count")}
            className={`rounded-2xl p-5 shadow-sm ${
              hasTodayCashCount
                ? "bg-green-50 border-2 border-green-500"
                : "bg-white border border-gray-100"
            }`}
          >
            <View className="flex-row items-center">
              <View
                className={`p-4 rounded-xl mr-4 ${
                  hasTodayCashCount ? "bg-green-100" : "bg-brand-red/10"
                }`}
              >
                {hasTodayCashCount ? (
                  <CheckCircle2 color="#22C55E" size={32} />
                ) : (
                  <Banknote color="#C62828" size={32} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap">
                  <Text
                    className={`text-lg font-bold ${
                      hasTodayCashCount ? "text-green-700" : "text-gray-800"
                    }`}
                  >
                    Cash Count
                  </Text>
                  {hasAMShift && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">AM</Text>
                    </View>
                  )}
                  {hasPMShift && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">PM</Text>
                    </View>
                  )}
                </View>
                <Text
                  className={`text-sm mt-1 ${
                    hasTodayCashCount ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {hasTodayCashCount
                    ? `${latestShift} Total: ${formatCurrency(
                        latestShiftTotal
                      )}`
                    : "Count notes and coins by denomination"}
                </Text>
              </View>
              <ChevronRight
                color={hasTodayCashCount ? "#22C55E" : "#9CA3AF"}
                size={24}
              />
            </View>
          </TouchableOpacity>

          {/* Add Balances Option */}
          <TouchableOpacity
            onPress={() => router.push("/add-balance")}
            className={`rounded-2xl p-5 shadow-sm ${
              hasTodayBalances
                ? "bg-green-50 border-2 border-green-500"
                : "bg-white border border-gray-100"
            }`}
          >
            <View className="flex-row items-center">
              <View
                className={`p-4 rounded-xl mr-4 ${
                  hasTodayBalances ? "bg-green-100" : "bg-brand-gold/30"
                }`}
              >
                {hasTodayBalances ? (
                  <CheckCircle2 color="#22C55E" size={32} />
                ) : (
                  <Wallet color="#B8860B" size={32} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center flex-wrap">
                  <Text
                    className={`text-lg font-bold ${
                      hasTodayBalances ? "text-green-700" : "text-gray-800"
                    }`}
                  >
                    Add Balances
                  </Text>
                  {hasAMBalances && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">AM</Text>
                    </View>
                  )}
                  {hasPMBalances && (
                    <View className="ml-2 px-2 py-0.5 bg-green-500 rounded-full">
                      <Text className="text-white text-xs font-bold">PM</Text>
                    </View>
                  )}
                </View>
                <Text
                  className={`text-sm mt-1 ${
                    hasTodayBalances ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {hasTodayBalances
                    ? `${latestBalanceShift} - All accounts completed`
                    : "Add account balances with images"}
                </Text>
              </View>
              <ChevronRight
                color={hasTodayBalances ? "#22C55E" : "#9CA3AF"}
                size={24}
              />
            </View>
          </TouchableOpacity>

          {/* Add Commissions Option */}
          <TouchableOpacity
            onPress={() => router.push("/add-commission")}
            className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 p-4 rounded-xl mr-4">
                <Banknote color="#C62828" size={32} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">
                  Add Commissions
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Record commission payments with images
                </Text>
              </View>
              <ChevronRight color="#9CA3AF" size={24} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
