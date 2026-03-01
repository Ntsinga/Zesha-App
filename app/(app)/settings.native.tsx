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
  LogOut,
  Users,
  ChevronRight,
  Receipt,
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

  // Fallback: use dashboard companyInfo if companyInfoSlice has no items yet
  const dashboardCompanyInfo = useSelector(
    (state: RootState) => state.dashboard.companyInfo ?? undefined,
  );

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

  // Get the first company - fall back to dashboard companyInfo if slice is empty
  const company: CompanyInfo | undefined = companies[0] ?? dashboardCompanyInfo;

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
        typeof err === "string" ? err : err instanceof Error ? err.message : "Failed to save settings",
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
        </View>

        {/* Options */}
        <View>
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

          {/* Expenses */}
          <TouchableOpacity
            onPress={() => router.push("/expenses" as any)}
            className="bg-white rounded-xl p-4 flex-row items-center justify-between mb-3 shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="bg-red-100 p-2 rounded-lg mr-3">
                <Receipt color="#DC2626" size={20} />
              </View>
              <View>
                <Text className="font-semibold text-gray-900">Expenses</Text>
                <Text className="text-xs text-gray-500">
                  View and record expenses
                </Text>
              </View>
            </View>
            <ChevronRight color="#9CA3AF" size={20} />
          </TouchableOpacity>

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
