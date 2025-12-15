import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Camera,
  Save,
  Plus,
  X,
  Image as ImageIcon,
  ChevronDown,
  Check,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react-native";
import { useDispatch, useSelector } from "react-redux";
import * as ImagePicker from "expo-image-picker";
import {
  createCommissionsBulk,
  fetchCommissions,
} from "../../store/slices/commissionsSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import {
  extractBalanceFromImage,
  validateBalance,
  BalanceValidationResult,
} from "../../services/balanceExtractor";
import * as FileSystem from "expo-file-system/legacy";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum, CommissionCreate, Account } from "../../types";

interface CommissionEntry {
  id: string;
  accountId: number | null;
  accountName: string;
  shift: ShiftEnum;
  amount: string;
  imageUrl: string;
  extractedBalance: number | null;
  isExtracting: boolean;
  validationResult: BalanceValidationResult | null;
}

const createEmptyEntry = (): CommissionEntry => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  accountId: null,
  accountName: "",
  shift: "AM",
  amount: "",
  imageUrl: "",
  extractedBalance: null,
  isExtracting: false,
  validationResult: null,
});

const CARD_WIDTH = Dimensions.get("window").width * 0.75;

export default function AddCommissionPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Get accounts and commissions from Redux store
  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts
  );

  const { items: commissions } = useSelector(
    (state: RootState) => state.commissions
  );

  const [entries, setEntries] = useState<CommissionEntry[]>([
    createEmptyEntry(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [accountPickerVisible, setAccountPickerVisible] = useState<
    string | null
  >(null);
  const [currentShift, setCurrentShift] = useState<ShiftEnum>("AM");
  const [isInitialized, setIsInitialized] = useState(false);

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Load accounts on mount
  useEffect(() => {
    if (accounts.length === 0) {
      dispatch(fetchAccounts({}));
    }
  }, [dispatch]);

  // Load existing commissions for prepopulation
  useEffect(() => {
    dispatch(fetchCommissions({}));
  }, [dispatch]);

  // Prepopulate entries with existing commissions for today's date and selected shift
  useEffect(() => {
    console.log("[AddCommission] Prepopulation check:", {
      isInitialized,
      accountsLoading,
      accountsCount: accounts.length,
      commissionsCount: commissions.length,
      today,
      currentShift,
    });

    if (isInitialized || accountsLoading || accounts.length === 0) return;

    const activeAccounts = accounts.filter((acc) => acc.is_active);

    // Get commissions for today and current shift
    const shiftCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === currentShift
    );

    console.log("[AddCommission] Shift commissions:", {
      shift: currentShift,
      count: shiftCommissions.length,
    });

    if (shiftCommissions.length > 0) {
      // Create entries for accounts that have commissions
      const prepopulatedEntries: CommissionEntry[] = shiftCommissions.map(
        (com) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          accountId: com.account_id,
          accountName:
            com.account?.name ||
            accounts.find((acc) => acc.id === com.account_id)?.name ||
            `Account ${com.account_id}`,
          shift: currentShift,
          amount: com.amount.toString(),
          imageUrl: com.image_data
            ? `data:image/jpeg;base64,${com.image_data}`
            : "",
          extractedBalance: com.amount,
          isExtracting: false,
          validationResult: {
            isValid: true,
            extractedBalance: com.amount,
            inputBalance: com.amount,
            difference: 0,
            extractedAmount: com.amount,
            enteredAmount: com.amount,
            message: "Existing commission",
          },
        })
      );

      // Add empty entries for accounts without commissions
      const accountsWithCommissions = new Set(
        shiftCommissions.map((com) => com.account_id)
      );
      const accountsWithoutCommissions = activeAccounts.filter(
        (acc) => !accountsWithCommissions.has(acc.id)
      );

      const emptyEntries: CommissionEntry[] = accountsWithoutCommissions.map(
        () => createEmptyEntry()
      );

      setEntries([...prepopulatedEntries, ...emptyEntries]);
    } else {
      // No existing commissions, create empty entries for all active accounts
      setEntries(activeAccounts.map(() => createEmptyEntry()));
    }

    setIsInitialized(true);
  }, [
    commissions,
    today,
    currentShift,
    isInitialized,
    accountsLoading,
    accounts,
  ]);

  // Request media library permissions
  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Gallery permission is needed to choose photos. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const handleTakePicture = async (entryId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Camera permission is required to take pictures"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images" as any,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  imageUrl: imageUri,
                  isExtracting: true,
                  validationResult: null,
                }
              : entry
          )
        );

        try {
          const result = await extractBalanceFromImage(imageUri, "commission");

          if (result.success && result.balance !== null) {
            setEntries((prev) =>
              prev.map((entry) =>
                entry.id === entryId
                  ? {
                      ...entry,
                      amount: result.balance!.toFixed(2),
                      extractedBalance: result.balance,
                      isExtracting: false,
                    }
                  : entry
              )
            );
          } else {
            setEntries((prev) =>
              prev.map((entry) =>
                entry.id === entryId
                  ? { ...entry, isExtracting: false, extractedBalance: null }
                  : entry
              )
            );
          }
        } catch (error) {
          console.error("Balance extraction failed:", error);
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? { ...entry, isExtracting: false, extractedBalance: null }
                : entry
            )
          );
        }
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture");
    }
  };

  // Pick image from library
  const pickImage = async (entryId: string) => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  imageUrl: imageUri,
                  isExtracting: true,
                  validationResult: null,
                }
              : entry
          )
        );

        try {
          const result = await extractBalanceFromImage(imageUri, "commission");

          if (result.success && result.balance !== null) {
            setEntries((prev) =>
              prev.map((entry) =>
                entry.id === entryId
                  ? {
                      ...entry,
                      amount: result.balance!.toFixed(2),
                      extractedBalance: result.balance,
                      isExtracting: false,
                    }
                  : entry
              )
            );
          } else {
            setEntries((prev) =>
              prev.map((entry) =>
                entry.id === entryId
                  ? { ...entry, isExtracting: false, extractedBalance: null }
                  : entry
              )
            );
          }
        } catch (error) {
          console.error("Balance extraction failed:", error);
          setEntries((prev) =>
            prev.map((entry) =>
              entry.id === entryId
                ? { ...entry, isExtracting: false, extractedBalance: null }
                : entry
            )
          );
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Show image picker options
  const showImageOptions = (entryId: string) => {
    Alert.alert("Add Image", "Choose an option", [
      { text: "Take Photo", onPress: () => handleTakePicture(entryId) },
      { text: "Choose from Library", onPress: () => pickImage(entryId) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleAmountChange = async (entryId: string, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, amount: value, validationResult: null }
          : entry
      )
    );

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors[entryId]) {
        delete newErrors[entryId].amount;
        if (Object.keys(newErrors[entryId]).length === 0) {
          delete newErrors[entryId];
        }
      }
      return newErrors;
    });

    const entry = entries.find((e) => e.id === entryId);
    if (entry && entry.extractedBalance !== null && value) {
      try {
        const enteredAmount = parseFloat(value);
        if (!isNaN(enteredAmount)) {
          const result = await validateBalance(
            entry.extractedBalance,
            enteredAmount
          );

          setEntries((prev) =>
            prev.map((e) =>
              e.id === entryId ? { ...e, validationResult: result } : e
            )
          );
        }
      } catch (error) {
        console.error("Validation error:", error);
      }
    }
  };

  const handleAccountSelect = (entryId: string, account: Account) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              accountId: account.id,
              accountName: account.name,
            }
          : entry
      )
    );

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors[entryId]) {
        delete newErrors[entryId].accountName;
        if (Object.keys(newErrors[entryId]).length === 0) {
          delete newErrors[entryId];
        }
      }
      return newErrors;
    });

    setAccountPickerVisible(null);
  };

  const handleAddEntry = () => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  };

  const handleRemoveEntry = (entryId: string) => {
    if (entries.length === 1) {
      Alert.alert("Error", "You must have at least one entry");
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[entryId];
      return newErrors;
    });
  };

  const validateEntries = (): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    let isValid = true;

    entries.forEach((entry) => {
      const entryErrors: Record<string, string> = {};

      if (!entry.accountId) {
        entryErrors.accountName = "Please select an account";
        isValid = false;
      }

      if (!entry.imageUrl) {
        entryErrors.imageUrl = "Please take a picture of the commission";
        isValid = false;
      }

      if (!entry.amount || isNaN(parseFloat(entry.amount))) {
        entryErrors.amount = "Please enter a valid amount";
        isValid = false;
      } else if (parseFloat(entry.amount) < 0) {
        entryErrors.amount = "Amount must be positive";
        isValid = false;
      }

      if (
        entry.validationResult &&
        !entry.validationResult.isValid &&
        entry.extractedBalance !== null
      ) {
        entryErrors.validation =
          entry.validationResult.message || "Validation failed";
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[entry.id] = entryErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateEntries()) {
      Alert.alert(
        "Validation Error",
        "Please fix all errors before submitting"
      );
      return;
    }

    try {
      setIsSubmitting(true);

      // Convert image URIs to base64
      const commissionsWithImages = await Promise.all(
        entries.map(async (entry) => {
          let imageData: string | undefined;

          if (entry.imageUrl) {
            // Check if it's already base64 (from prepopulated data)
            if (entry.imageUrl.startsWith("data:image")) {
              // Extract base64 part
              imageData = entry.imageUrl.split(",")[1];
            } else {
              // Read from file system for new images
              const base64 = await FileSystem.readAsStringAsync(
                entry.imageUrl,
                {
                  encoding: FileSystem.EncodingType.Base64,
                }
              );
              imageData = base64;
            }
          }

          const commission: CommissionCreate = {
            account_id: entry.accountId!,
            shift: currentShift,
            amount: parseFloat(entry.amount),
            date: new Date().toISOString().split("T")[0],
            image_data: imageData,
            // source defaults to "mobile_app" on backend
          };

          return commission;
        })
      );

      // Use bulk create endpoint
      console.log(
        "[AddCommission] Submitting commissions:",
        JSON.stringify(commissionsWithImages, null, 2)
      );

      const result = await dispatch(
        createCommissionsBulk(commissionsWithImages)
      ).unwrap();
      console.log("[AddCommission] Commission creation result:", result);

      // Refresh dashboard
      console.log("[AddCommission] Refreshing dashboard...");
      await dispatch(fetchDashboard({})).unwrap();
      console.log("[AddCommission] Dashboard refreshed");

      Alert.alert("Success", "Commissions saved successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("[AddCommission] Error saving commissions:", error);
      console.error("[AddCommission] Error stack:", error?.stack);
      Alert.alert(
        "Error",
        error?.message || "Failed to save commissions. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableAccounts = (currentEntryId: string) => {
    const selectedAccountIds = entries
      .filter((e) => e.id !== currentEntryId && e.accountId)
      .map((e) => e.accountId);

    return accounts
      .filter((acc) => acc.is_active)
      .filter((acc) => !selectedAccountIds.includes(acc.id));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: "#F9FAFB" }}
    >
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View className="bg-white border-b border-gray-100">
          <View className="flex-row items-center justify-between p-4 pt-14">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <ArrowLeft color="#000" size={24} />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">
              Add Commissions
            </Text>
            <View className="w-10" />
          </View>

          {/* Shift Selector */}
          <View className="px-4 pb-4">
            <View className="flex-row bg-white rounded-xl p-1 shadow-sm">
              <TouchableOpacity
                onPress={() => {
                  setCurrentShift("AM");
                  setIsInitialized(false);
                }}
                className={`flex-1 py-3 rounded-lg ${
                  currentShift === "AM" ? "bg-brand-gold" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    currentShift === "AM" ? "text-white" : "text-gray-500"
                  }`}
                >
                  AM Shift
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setCurrentShift("PM");
                  setIsInitialized(false);
                }}
                className={`flex-1 py-3 rounded-lg ${
                  currentShift === "PM" ? "bg-brand-gold" : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    currentShift === "PM" ? "text-white" : "text-gray-500"
                  }`}
                >
                  PM Shift
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Entries Cards */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          {entries.map((entry, index) => (
            <View key={entry.id} className="mb-6">
              <View className="bg-white rounded-2xl p-4 shadow-sm">
                {/* Card Header */}
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-base font-semibold text-gray-700">
                    Commission {index + 1}
                  </Text>
                  {entries.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveEntry(entry.id)}
                      className="p-2"
                    >
                      <X color="#EF4444" size={20} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Account Selector */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Account
                  </Text>
                  <TouchableOpacity
                    onPress={() => setAccountPickerVisible(entry.id)}
                    className={`flex-row items-center justify-between p-4 rounded-xl border ${
                      errors[entry.id]?.accountName
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <Text
                      className={
                        entry.accountName ? "text-gray-900" : "text-gray-400"
                      }
                    >
                      {entry.accountName || "Select account"}
                    </Text>
                    <ChevronDown color="#9CA3AF" size={20} />
                  </TouchableOpacity>
                  {errors[entry.id]?.accountName && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors[entry.id].accountName}
                    </Text>
                  )}
                </View>

                {/* Amount Input */}
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Commission Amount
                  </Text>
                  <TextInput
                    value={entry.amount}
                    onChangeText={(value) =>
                      handleAmountChange(entry.id, value)
                    }
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    className={`p-4 rounded-xl border text-lg ${
                      errors[entry.id]?.amount
                        ? "border-red-300 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  />
                  {errors[entry.id]?.amount && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors[entry.id].amount}
                    </Text>
                  )}

                  {/* Validation Result */}
                  {entry.validationResult && (
                    <View
                      className={`flex-row items-center p-3 rounded-lg mt-2 ${
                        entry.validationResult.isValid
                          ? "bg-green-50"
                          : "bg-yellow-50"
                      }`}
                    >
                      {entry.validationResult.isValid ? (
                        <CheckCircle color="#22C55E" size={16} />
                      ) : (
                        <AlertTriangle color="#F59E0B" size={16} />
                      )}
                      <Text
                        className={`ml-2 text-xs ${
                          entry.validationResult.isValid
                            ? "text-green-700"
                            : "text-yellow-700"
                        }`}
                      >
                        {entry.validationResult.message}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Image Section */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Commission Image
                  </Text>

                  {entry.imageUrl ? (
                    <View className="relative">
                      <Image
                        source={{ uri: entry.imageUrl }}
                        className="w-full h-48 rounded-xl"
                        resizeMode="cover"
                      />

                      {/* Loading Overlay */}
                      {entry.isExtracting && (
                        <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                          <View className="bg-white rounded-full p-4">
                            <Loader2 color="#B8860B" size={32} />
                          </View>
                          <Text className="text-white font-semibold mt-2">
                            Extracting amount...
                          </Text>
                        </View>
                      )}

                      {/* Retake Button */}
                      <TouchableOpacity
                        onPress={() => showImageOptions(entry.id)}
                        className="absolute top-2 right-2 bg-white/90 p-2 rounded-full"
                      >
                        <Camera color="#000" size={20} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => showImageOptions(entry.id)}
                      className={`items-center justify-center p-8 rounded-xl border-2 border-dashed ${
                        errors[entry.id]?.imageUrl
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      <Camera
                        color={
                          errors[entry.id]?.imageUrl ? "#EF4444" : "#9CA3AF"
                        }
                        size={40}
                      />
                      <Text
                        className={`mt-2 font-medium ${
                          errors[entry.id]?.imageUrl
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        Add Picture
                      </Text>
                    </TouchableOpacity>
                  )}

                  {errors[entry.id]?.imageUrl && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors[entry.id].imageUrl}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}

          {/* Add Entry Button */}
          <TouchableOpacity
            onPress={handleAddEntry}
            className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-6 mb-6 items-center justify-center"
          >
            <Plus color="#9CA3AF" size={32} />
            <Text className="text-gray-600 font-medium mt-2">
              Add Another Commission
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Submit Button */}
        <View className="p-4 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`flex-row items-center justify-center p-4 rounded-xl ${
              isSubmitting ? "bg-gray-400" : "bg-brand-gold"
            }`}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator color="#FFF" className="mr-2" />
                <Text className="text-white font-semibold text-lg">
                  Saving...
                </Text>
              </>
            ) : (
              <>
                <Save color="#FFF" size={20} />
                <Text className="text-white font-semibold text-lg ml-2">
                  Save {entries.length} Commission
                  {entries.length !== 1 ? "s" : ""}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Account Picker Modal */}
        <Modal
          visible={accountPickerVisible !== null}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setAccountPickerVisible(null)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl max-h-[70%]">
              <View className="p-4 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900">
                  Select Account
                </Text>
                <TouchableOpacity
                  onPress={() => setAccountPickerVisible(null)}
                  className="p-2"
                >
                  <X color="#000" size={24} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={
                  accountPickerVisible
                    ? getAvailableAccounts(accountPickerVisible)
                    : []
                }
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() =>
                      accountPickerVisible &&
                      handleAccountSelect(accountPickerVisible, item)
                    }
                    className="p-4 border-b border-gray-100"
                  >
                    <Text className="text-gray-900 font-medium">
                      {item.name}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {item.account_type}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="p-8 items-center">
                    <Text className="text-gray-500">No accounts available</Text>
                  </View>
                }
              />
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}
