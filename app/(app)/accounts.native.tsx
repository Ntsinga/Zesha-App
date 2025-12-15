import React, { useState, useEffect } from "react";
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
  Menu,
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
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../../store/slices/accountsSlice";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import type { AppDispatch, RootState } from "../../store";
import type { Account, AccountTypeEnum } from "../../types";

const ACCOUNT_TYPES: { value: AccountTypeEnum; label: string }[] = [
  { value: "BANK", label: "Bank" },
  { value: "TELECOM", label: "Telecom" },
];

export default function Accounts() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { items: accounts, isLoading } = useSelector(
    (state: RootState) => state.accounts
  );
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeEnum>("BANK");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    dispatch(fetchAccounts({}));
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchAccounts({}));
    setRefreshing(false);
  };

  const resetForm = () => {
    setName("");
    setAccountType("BANK");
    setIsActive(true);
    setEditingAccount(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setAccountType(account.account_type);
    setIsActive(account.is_active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Account name is required");
      return;
    }

    try {
      if (editingAccount) {
        await dispatch(
          updateAccount({
            id: editingAccount.id,
            data: {
              name: name.trim(),
              account_type: accountType,
              is_active: isActive,
            },
          })
        ).unwrap();
        Alert.alert("Success", "Account updated successfully");
      } else {
        await dispatch(
          createAccount({
            name: name.trim(),
            account_type: accountType,
            is_active: isActive,
          })
        ).unwrap();
        Alert.alert("Success", "Account created successfully");
      }
      closeModal();
      dispatch(fetchAccounts({}));
    } catch (error) {
      Alert.alert("Error", error as string);
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
          onPress: async () => {
            try {
              await dispatch(deleteAccount(account.id)).unwrap();
              Alert.alert("Success", "Account deleted successfully");
            } catch (error) {
              Alert.alert("Error", error as string);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading accounts..." />;
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
          <Text className="text-3xl font-bold text-brand-red">Accounts</Text>
          <TouchableOpacity
            onPress={() => (navigation as any).openDrawer()}
            className="p-2 bg-brand-red rounded-md shadow-sm"
          >
            <Menu color="white" size={24} />
          </TouchableOpacity>
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
                  account.account_type === "BANK"
                    ? "border-l-blue-500"
                    : "border-l-green-500"
                } ${!account.is_active ? "opacity-50" : ""}`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View
                      className={`p-2 rounded-full mr-3 ${
                        account.account_type === "BANK"
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      {account.account_type === "BANK" ? (
                        <Building2
                          size={20}
                          color={
                            account.account_type === "BANK"
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
                            account.account_type === "BANK"
                              ? "bg-blue-100"
                              : "bg-green-100"
                          }`}
                        >
                          <Text
                            className={`text-xs font-medium ${
                              account.account_type === "BANK"
                                ? "text-blue-700"
                                : "text-green-700"
                            }`}
                          >
                            {account.account_type}
                          </Text>
                        </View>
                        {!account.is_active && (
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
            <View className="mb-6">
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

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
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
