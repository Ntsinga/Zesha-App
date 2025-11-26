import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Plus, Wallet, Camera, Menu } from "lucide-react-native";
import { useNavigation } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  ActionModal,
  AddTransactionForm,
  AddBalanceForm,
} from "../components/ActionModal";
import {
  fetchDashboard,
  DashboardState,
  DashboardSummary,
} from "../store/slices/dashboardSlice";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { formatCurrency, formatCompactCurrency } from "../utils/formatters";
import type { AccountSummary } from "../types";
import type { AppDispatch, RootState } from "../store";

export default function Dashboard() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const [modalType, setModalType] = useState<
    "none" | "transaction" | "balance"
  >("none");

  const { summary, accounts, isLoading, error } = useSelector(
    (state: RootState) => state.dashboard
  );
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data on mount
  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchDashboard());
    setRefreshing(false);
  };

  const handleFormSuccess = () => {
    // Refresh dashboard data after successful form submission
    dispatch(fetchDashboard());
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Use dashboard data from Redux store
  const totalCapital = summary?.totalBalance ?? 0;
  const float = summary?.monthlyIncome ?? 0;
  const cash = summary?.monthlyExpenses ?? 0;
  const outstanding = summary?.savingsRate ?? 0;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8 mt-4">
          <View>
            <Text className="text-3xl font-bold text-gray-800">Zeshan App</Text>
            <Text className="text-gray-500 mt-1">Hi: Company Name</Text>
          </View>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer()}
            className="p-2 bg-brand-red rounded-md shadow-sm"
          >
            <Menu color="white" size={24} />
          </TouchableOpacity>
        </View>

        {/* Main Stats Card */}
        <View className="relative overflow-hidden rounded-3xl bg-brand-gold shadow-lg p-6 mb-8">
          <View className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-20 rounded-full" />

          <View className="border-b border-brand-darkGold/30 pb-4 mb-4">
            <Text className="text-red-900/70 font-semibold text-lg">
              Total Capital
            </Text>
            <Text className="text-4xl font-bold text-red-900">
              {formatCurrency(totalCapital)}
            </Text>
          </View>

          <View className="flex-row flex-wrap justify-between">
            <View className="mb-4 w-1/2">
              <Text className="text-red-900/80 font-bold text-xl">Float</Text>
              <Text className="text-2xl font-bold text-red-900">
                {formatCurrency(float)}
              </Text>
            </View>
            <View className="w-1/2 pl-4 justify-center space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-red-900 font-semibold">Cash</Text>
                <Text className="text-red-900 font-bold">
                  {formatCompactCurrency(cash)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-red-900 font-semibold">Outst.</Text>
                <Text className="text-red-900 font-bold">
                  {formatCompactCurrency(outstanding)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Accounts List */}
        <View className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
          <Text className="text-xl font-bold text-brand-red mb-6">
            Current Balances
          </Text>

          <View className="mb-4">
            <View className="flex-row justify-between pb-2 border-b border-gray-100 mb-2">
              <Text className="font-bold text-gray-800 flex-1">Account</Text>
              <Text className="font-bold text-gray-800 w-24 text-center">
                Amount
              </Text>
              <Text className="font-bold text-gray-800 w-20 text-right">
                Pic
              </Text>
            </View>
            {accounts.map((account: AccountSummary, idx: number) => (
              <View
                key={`account-${idx}`}
                className="flex-row items-center py-4 border-b border-gray-50"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-gray-700">
                    {account.name}
                  </Text>
                </View>
                <View className="w-24 flex-row justify-center space-x-2">
                  <Text className="text-gray-600 font-medium">
                    {formatCurrency(account.balance || 0)}
                  </Text>
                </View>
                <View className="w-20 items-end">
                  <View className="flex-row items-center space-x-1">
                    <Camera size={14} color="#9CA3AF" />
                    <Text className="text-xs text-gray-400">View</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <View className="flex-col space-y-3 mt-4">
            <TouchableOpacity
              onPress={() => setModalType("transaction")}
              className="bg-brand-red py-4 rounded-xl shadow-md flex-row items-center justify-center space-x-2"
            >
              <Plus color="white" size={20} />
              <Text className="text-white font-bold text-base ml-2">
                Add Transaction
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalType("balance")}
              className="bg-white border-2 border-brand-red py-4 rounded-xl shadow-sm flex-row items-center justify-center space-x-2"
            >
              <Wallet color="#C62828" size={20} />
              <Text className="text-brand-red font-bold text-base ml-2">
                Balance
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <ActionModal
        visible={modalType === "transaction"}
        onClose={() => setModalType("none")}
        title="Add Transaction"
      >
        <AddTransactionForm
          onSuccess={handleFormSuccess}
          onClose={() => setModalType("none")}
        />
      </ActionModal>

      <ActionModal
        visible={modalType === "balance"}
        onClose={() => setModalType("none")}
        title="Add Balance"
      >
        <AddBalanceForm
          onSuccess={handleFormSuccess}
          onClose={() => setModalType("none")}
        />
      </ActionModal>
    </View>
  );
}
