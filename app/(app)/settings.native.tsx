import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Keyboard,
} from "react-native";
import {
  Save,
  Building,
  DollarSign,
  FileText,
  Mail,
  X,
  Plus,
  LogOut,
  Users,
  ChevronRight,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@clerk/clerk-expo";
import {
  fetchCompanyInfoList,
  updateCompanyInfo,
  createCompanyInfo,
} from "../../store/slices/companyInfoSlice";
import { clearLocalAuth } from "../../store/slices/authSlice";
import { useEffectiveRole } from "../../hooks/useEffectiveRole";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { formatCurrency } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";
import type { CompanyInfo } from "../../types";

// Common currency codes
const CURRENCIES = [
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "ZAR", name: "South African Rand" },
];

export default function Settings() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { signOut } = useAuth();
  const {
    items: companies,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.companyInfo);

  const effectiveRole = useEffectiveRole();
  const isAdmin =
    effectiveRole === "Administrator" ||
    effectiveRole === "Super Administrator";

  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const emailInputRef = useRef<TextInput>(null);

  // Form state
  const [name, setName] = useState("");
  const [totalWorkingCapital, setTotalWorkingCapital] = useState("");
  const [outstandingBalance, setOutstandingBalance] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [description, setDescription] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  // Get the first company (assuming single company setup)
  const company: CompanyInfo | undefined = companies[0];

  useEffect(() => {
    dispatch(fetchCompanyInfoList({}));
  }, [dispatch]);

  // Populate form when company data loads
  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setTotalWorkingCapital(company.totalWorkingCapital?.toString() || "0");
      setOutstandingBalance(company.outstandingBalance?.toString() || "0");
      setCurrency(company.currency || "UGX");
      setDescription(company.description || "");
      setEmails(company.emails || []);
    }
  }, [company]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchCompanyInfoList({}));
    setRefreshing(false);
  };

  const addEmail = () => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (emails.includes(trimmedEmail)) {
      Alert.alert("Duplicate", "This email is already added.");
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setNewEmail("");
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter((e) => e !== emailToRemove));
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await dispatch(clearLocalAuth());
            await signOut();
            router.replace("/(auth)/sign-in");
          } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Company name is required.");
      return;
    }

    const workingCapital = parseFloat(totalWorkingCapital) || 0;
    const outstanding = parseFloat(outstandingBalance) || 0;

    if (workingCapital < 0 || outstanding < 0) {
      Alert.alert("Error", "Amounts cannot be negative.");
      return;
    }

    setIsSaving(true);

    try {
      const data = {
        name: name.trim(),
        total_working_capital: workingCapital,
        outstanding_balance: outstanding,
        currency,
        description: description.trim() || undefined,
        emails: emails.length > 0 ? emails : undefined,
      };

      if (company) {
        // Update existing company
        await dispatch(updateCompanyInfo({ id: company.id, data })).unwrap();
        Alert.alert("Success", "Company settings updated successfully!");
      } else {
        // Create new company
        await dispatch(createCompanyInfo(data)).unwrap();
        Alert.alert("Success", "Company created successfully!");
      }

      // Refresh the list
      dispatch(fetchCompanyInfoList({}));
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save settings",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !refreshing) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="mb-6 mt-4">
          <Text className="text-3xl font-bold text-gray-800">Settings</Text>
          <Text className="text-gray-500 mt-1">Company Information</Text>
        </View>

        {/* Company Info Card */}
        <View className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100 mb-4">
          <View className="flex-row items-center mb-6">
            <Building color="#C62828" size={24} />
            <Text className="text-xl font-bold text-gray-800 ml-2">
              Company Details
            </Text>
          </View>

          {/* Company Name */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Company Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter company name"
              editable={isAdmin}
              className={`bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 ${!isAdmin ? "opacity-60" : ""}`}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of the company"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={isAdmin}
              className={`bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 min-h-[80px] ${!isAdmin ? "opacity-60" : ""}`}
            />
          </View>
        </View>

        {/* Financial Settings Card */}
        <View className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100 mb-4">
          <View className="flex-row items-center mb-6">
            <DollarSign color="#C62828" size={24} />
            <Text className="text-xl font-bold text-gray-800 ml-2">
              Financial Settings
            </Text>
          </View>

          {/* Currency */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Currency</Text>
            <TouchableOpacity
              onPress={() =>
                isAdmin && setShowCurrencyPicker(!showCurrencyPicker)
              }
              disabled={!isAdmin}
              className={`bg-gray-50 rounded-xl px-4 py-3 border border-gray-200 flex-row justify-between items-center ${!isAdmin ? "opacity-60" : ""}`}
            >
              <Text className="text-gray-800">
                {currency} -{" "}
                {CURRENCIES.find((c) => c.code === currency)?.name || currency}
              </Text>
              <Text className="text-gray-400">▼</Text>
            </TouchableOpacity>

            {showCurrencyPicker && (
              <View className="bg-white border border-gray-200 rounded-xl mt-2 max-h-48">
                <ScrollView nestedScrollEnabled>
                  {CURRENCIES.map((curr) => (
                    <TouchableOpacity
                      key={curr.code}
                      onPress={() => {
                        setCurrency(curr.code);
                        setShowCurrencyPicker(false);
                      }}
                      className={`px-4 py-3 border-b border-gray-100 ${
                        currency === curr.code ? "bg-red-50" : ""
                      }`}
                    >
                      <Text
                        className={`${
                          currency === curr.code
                            ? "text-brand-red font-bold"
                            : "text-gray-700"
                        }`}
                      >
                        {curr.code} - {curr.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Total Working Capital */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Total Working Capital
            </Text>
            <TextInput
              value={totalWorkingCapital}
              onChangeText={setTotalWorkingCapital}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={isAdmin}
              className={`bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 text-lg ${!isAdmin ? "opacity-60" : ""}`}
            />
            {totalWorkingCapital && (
              <Text className="text-gray-500 text-sm mt-1">
                {formatCurrency(parseFloat(totalWorkingCapital) || 0, currency)}
              </Text>
            )}
          </View>

          {/* Outstanding Balance */}
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">
              Outstanding Balance
            </Text>
            <TextInput
              value={outstandingBalance}
              onChangeText={setOutstandingBalance}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={isAdmin}
              className={`bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200 text-lg ${!isAdmin ? "opacity-60" : ""}`}
            />
            {outstandingBalance && (
              <Text className="text-gray-500 text-sm mt-1">
                {formatCurrency(parseFloat(outstandingBalance) || 0, currency)}
              </Text>
            )}
          </View>
        </View>

        {/* Email Notifications Card */}
        <View className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100 mb-4">
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center">
              <Mail color="#C62828" size={24} />
              <Text className="text-xl font-bold text-gray-800 ml-2">
                Email Notifications
              </Text>
            </View>
          </View>

          {/* Add Email Input */}
          {isAdmin && (
            <View className="flex-row mb-4 items-center">
              <TextInput
                ref={emailInputRef}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Add email address"
                keyboardType="email-address"
                autoCapitalize="none"
                onSubmitEditing={() => {
                  addEmail();
                  Keyboard.dismiss();
                }}
                onFocus={() => {
                  // Scroll to make the input visible above keyboard
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
                returnKeyType="done"
                className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-gray-800 border border-gray-200"
              />
              <TouchableOpacity
                onPress={() => {
                  addEmail();
                  Keyboard.dismiss();
                }}
                className="bg-brand-red ml-2 w-12 h-12 rounded-xl items-center justify-center"
              >
                <Plus color="white" size={20} />
              </TouchableOpacity>
            </View>
          )}

          {/* Email List */}
          {emails.length === 0 ? (
            <Text className="text-gray-400 text-center py-4">
              No email addresses added
            </Text>
          ) : (
            <View>
              {emails.map((email, index) => (
                <View
                  key={index}
                  className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-2"
                >
                  <Text className="text-gray-700 flex-1">{email}</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => removeEmail(email)}
                      className="p-1"
                    >
                      <X color="#EF4444" size={18} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        {isAdmin && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className={`py-4 rounded-xl flex-row items-center justify-center space-x-2 ${
              isSaving ? "bg-gray-400" : "bg-brand-red"
            }`}
          >
            <Save color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">
              {isSaving ? "Saving..." : "Save Settings"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Other Options */}
        <View className="mt-8">
          <Text className="text-gray-500 text-sm font-medium mb-3 uppercase">
            More Options
          </Text>

          {/* Manage Accounts - Only for Administrators */}
          {isAdmin && (
            <TouchableOpacity
              onPress={() => router.push("/accounts" as any)}
              className="bg-white rounded-xl p-4 flex-row items-center justify-between mb-3 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Users color="#3B82F6" size={20} />
                </View>
                <View>
                  <Text className="font-semibold text-gray-900">
                    Manage Accounts
                  </Text>
                  <Text className="text-xs text-gray-500">
                    Add or edit float accounts
                  </Text>
                </View>
              </View>
              <ChevronRight color="#9CA3AF" size={20} />
            </TouchableOpacity>
          )}

          {/* Sign Out */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="bg-white rounded-xl p-4 flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 p-2 rounded-lg mr-3">
                <LogOut color="#EF4444" size={20} />
              </View>
              <View>
                <Text className="font-semibold text-red-600">Sign Out</Text>
                <Text className="text-xs text-gray-500">
                  Log out of your account
                </Text>
              </View>
            </View>
            <ChevronRight color="#EF4444" size={20} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
