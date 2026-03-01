import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Plus,
  Building2,
  Smartphone,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronDown,
} from "lucide-react-native";
import { useNavigation } from "expo-router";
import {
  useAccountsScreen,
  ACCOUNT_TYPES,
} from "../../hooks/screens/useAccountsScreen";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { Account } from "../../types";

export default function Accounts() {
  const navigation = useNavigation();
  const {
    accounts,
    isLoading,
    refreshing,
    isModalOpen,
    editingAccount,
    showTypeDropdown,
    setShowTypeDropdown,
    name,
    setName,
    accountType,
    setAccountType,
    isActive,
    setIsActive,
    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    confirmDelete,
    commissionDepositPct,
    setCommissionDepositPct,
    commissionWithdrawPct,
    setCommissionWithdrawPct,
    commissionChangeReason,
    setCommissionChangeReason,
  } = useAccountsScreen();

  const onSubmit = async () => {
    const result = await handleSubmit();
    if (result.success) {
      Alert.alert("Success", result.message);
    } else {
      Alert.alert("Error", result.message);
    }
  };

  const handleDelete = (account: Account) => {
    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${account.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => confirmDelete(account),
        },
      ],
    );
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading accounts..." />;
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
          <Text className="text-3xl font-bold text-brand-red">Accounts</Text>
        </View>

        {/* Account List */}
        <View className="space-y-3 mb-6">
          {accounts.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Building2 size={48} color="#9CA3AF" />
              <Text className="text-gray-400 mt-4">No accounts yet</Text>
              <Text className="text-gray-400 text-sm">
                Tap the button below to add one
              </Text>
            </View>
          ) : (
            accounts.map((account) => (
              <View
                key={account.id}
                className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                  account.accountType === "BANK"
                    ? "border-l-blue-500"
                    : "border-l-green-500"
                } ${!account.isActive ? "opacity-50" : ""}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`p-2 rounded-full mr-3 ${
                        account.accountType === "BANK"
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      {account.accountType === "BANK" ? (
                        <Building2
                          size={20}
                          color={
                            account.accountType === "BANK"
                              ? "#3B82F6"
                              : "#22C55E"
                          }
                        />
                      ) : (
                        <Smartphone size={20} color="#22C55E" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800 text-lg">
                        {account.name}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <View
                          className={`px-2 py-0.5 rounded-full ${
                            account.accountType === "BANK"
                              ? "bg-blue-100"
                              : "bg-green-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              account.accountType === "BANK"
                                ? "text-blue-700"
                                : "text-green-700"
                            }`}
                          >
                            {account.accountType}
                          </Text>
                        </View>
                        {!account.isActive && (
                          <View className="px-2 py-0.5 rounded-full bg-gray-100 ml-2">
                            <Text className="text-xs font-medium text-gray-500">
                              Inactive
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <View className="flex-row space-x-2">
                    <TouchableOpacity
                      onPress={() => openEditModal(account)}
                      className="p-2 bg-gray-100 rounded-lg"
                    >
                      <Edit2 size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(account)}
                      className="p-2 bg-red-100 rounded-lg ml-2"
                    >
                      <Trash2 size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={openAddModal}
          className="bg-brand-red py-3 rounded-lg shadow-md items-center flex-row justify-center"
        >
          <Plus size={18} color="white" />
          <Text className="text-white font-bold ml-2">Add Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalOpen}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/50"
        >
          <View className="bg-white rounded-t-3xl p-6">
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-800">
                {editingAccount ? "Edit Account" : "Add Account"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Account Name */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-600 mb-2">
                Account Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., STANBIC, CENTENARY"
                className="bg-gray-100 rounded-lg px-4 py-3 text-gray-800"
                autoCapitalize="characters"
              />
            </View>

            {/* Account Type */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-600 mb-2">
                Account Type
              </Text>
              <TouchableOpacity
                onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                className="bg-gray-100 rounded-lg px-4 py-3 flex-row justify-between items-center"
              >
                <View className="flex-row items-center">
                  {accountType === "BANK" ? (
                    <Building2 size={18} color="#3B82F6" />
                  ) : (
                    <Smartphone size={18} color="#22C55E" />
                  )}
                  <Text className="text-gray-800 ml-2">
                    {ACCOUNT_TYPES.find((t) => t.value === accountType)?.label}
                  </Text>
                </View>
                <ChevronDown size={18} color="#9CA3AF" />
              </TouchableOpacity>
              {showTypeDropdown && (
                <View className="bg-white border border-gray-200 rounded-lg mt-1 shadow-lg">
                  {ACCOUNT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => {
                        setAccountType(type.value);
                        setShowTypeDropdown(false);
                      }}
                      className={`px-4 py-3 flex-row items-center ${
                        accountType === type.value ? "bg-gray-100" : ""
                      }`}
                    >
                      {type.value === "BANK" ? (
                        <Building2 size={18} color="#3B82F6" />
                      ) : (
                        <Smartphone size={18} color="#22C55E" />
                      )}
                      <Text className="text-gray-800 ml-2">{type.label}</Text>
                      {accountType === type.value && (
                        <Check size={16} color="#C62828" className="ml-auto" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Active Toggle */}
            <View className="mb-4">
              <TouchableOpacity
                onPress={() => setIsActive(!isActive)}
                className="flex-row items-center justify-between bg-gray-100 rounded-lg px-4 py-3"
              >
                <Text className="text-gray-800">Active</Text>
                <View
                  className={`w-12 h-6 rounded-full ${
                    isActive ? "bg-green-500" : "bg-gray-300"
                  } justify-center`}
                >
                  <View
                    className={`w-5 h-5 rounded-full bg-white shadow ${
                      isActive ? "ml-6" : "ml-0.5"
                    }`}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Commission Rates */}
            <View className="flex-row mb-4" style={{ gap: 12 }}>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  Deposit Commission %
                </Text>
                <TextInput
                  value={commissionDepositPct}
                  onChangeText={setCommissionDepositPct}
                  placeholder="e.g. 1.5"
                  className="bg-gray-100 rounded-lg px-4 py-3 text-gray-800"
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  Withdraw Commission %
                </Text>
                <TextInput
                  value={commissionWithdrawPct}
                  onChangeText={setCommissionWithdrawPct}
                  placeholder="e.g. 0.75"
                  className="bg-gray-100 rounded-lg px-4 py-3 text-gray-800"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {editingAccount && (
              <View className="mb-4">
                <Text className="text-sm font-medium text-gray-600 mb-2">
                  Commission Change Reason
                </Text>
                <TextInput
                  value={commissionChangeReason}
                  onChangeText={setCommissionChangeReason}
                  placeholder="Reason for rate change (optional)"
                  className="bg-gray-100 rounded-lg px-4 py-3 text-gray-800"
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={onSubmit}
              className="bg-brand-red py-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold text-lg">
                {editingAccount ? "Update Account" : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
