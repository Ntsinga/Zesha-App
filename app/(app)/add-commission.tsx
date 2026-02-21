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
import { useRouter, useLocalSearchParams } from "expo-router";
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
  updateCommissionsBulk,
  fetchCommissions,
  saveDraftEntries,
  clearDraftEntries,
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
  const params = useLocalSearchParams();
  // Shift is passed from the balance menu screen - use it as-is
  const currentShift: ShiftEnum = (params.shift as ShiftEnum) || "AM";

  // Get companyId from auth state
  const { user } = useSelector((state: RootState) => state.auth);
  const companyId = user?.companyId;

  // Get accounts and commissions from Redux store
  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts,
  );

  const { items: commissions, draftEntries } = useSelector(
    (state: RootState) => state.commissions,
  );

  // Create stable initial entry outside of state to avoid recreation
  const [entries, setEntries] = useState<CommissionEntry[]>(() => [
    createEmptyEntry(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [accountPickerVisible, setAccountPickerVisible] = useState<
    string | null
  >(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get today's date
  const today = new Date().toISOString().split("T")[0];

  // Fetch accounts and commissions on mount - force refresh to get latest data
  useEffect(() => {
    dispatch(fetchAccounts({ isActive: true, forceRefresh: true }));
    dispatch(
      fetchCommissions({ dateFrom: today, dateTo: today, forceRefresh: true }),
    );
  }, [dispatch, today]);

  // Prepopulate entries with existing commissions for today's date and selected shift
  useEffect(() => {
    if (isInitialized || accountsLoading) return;

    const activeAccounts = accounts.filter((acc) => acc.isActive);

    // Get commissions for today and current shift
    const shiftCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === currentShift,
    );

    if (shiftCommissions.length > 0) {
      // Create entries for accounts that have commissions
      const prepopulatedEntries: CommissionEntry[] = shiftCommissions.map(
        (com) => {
          // Get account name from relationship or find by id
          let accountName = "";
          if (com.account) {
            accountName = com.account.name;
          } else {
            const account = accounts.find((acc) => acc.id === com.accountId);
            accountName = account?.name || `Account ${com.accountId}`;
          }

          // Determine the image URL - prioritize imageData (base64) over imageUrl
          let imageUri = "";
          if (com.imageData) {
            imageUri = `data:image/jpeg;base64,${com.imageData}`;
          } else if (com.imageUrl) {
            imageUri = com.imageUrl;
          }

          return {
            id: `existing-${com.id}`,
            accountId: com.accountId,
            accountName: accountName,
            shift: currentShift,
            amount: com.amount.toString(),
            imageUrl: imageUri,
            extractedBalance: null,
            isExtracting: false,
            validationResult: null,
          };
        },
      );

      setEntries(prepopulatedEntries);
      setIsInitialized(true);
    } else if (draftEntries.length > 0) {
      // Load draft entries if no existing commissions
      setEntries(draftEntries);
      setIsInitialized(true);
    } else {
      setIsInitialized(true);
    }
  }, [
    commissions,
    draftEntries,
    today,
    currentShift,
    isInitialized,
    accountsLoading,
    accounts,
  ]);

  // Save draft entries to Redux whenever they change (only if not from existing commissions)
  useEffect(() => {
    if (isInitialized && !entries.some((e) => e.id.startsWith("existing-"))) {
      dispatch(saveDraftEntries(entries));
    }
  }, [entries, dispatch, isInitialized]);

  // Request media library permissions
  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Gallery permission is needed to choose photos. Please enable it in your device settings.",
        [{ text: "OK" }],
      );
      return false;
    }
    return true;
  };

  // Update an entry field
  const updateEntry = (
    id: string,
    field: keyof CommissionEntry,
    value: any,
  ) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  // Extract commission from image and validate against user input
  const extractAndValidateCommission = async (
    entryId: string,
    imageUri: string,
  ) => {
    // Set extracting state
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, isExtracting: true, validationResult: null }
          : entry,
      ),
    );

    try {
      const result = await extractBalanceFromImage(imageUri, "commission");

      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;

          const extractedBalance = result.balance;

          // If user has already entered an amount, validate it against extracted balance
          let validationResult: BalanceValidationResult | null = null;
          if (
            entry.amount.trim() &&
            result.success &&
            extractedBalance !== null
          ) {
            const inputBalance = parseFloat(entry.amount);
            if (!isNaN(inputBalance)) {
              validationResult = validateBalance(
                extractedBalance,
                inputBalance,
              );
            }
          }

          return {
            ...entry,
            extractedBalance,
            isExtracting: false,
            validationResult,
          };
        }),
      );

      if (!result.success) {
        console.warn(`[AddCommission] Extraction unsuccessful:`, result.error);
        Alert.alert(
          "Extraction Notice",
          result.error ||
            "Could not extract commission from image. Please verify manually.",
        );
      }
    } catch (error) {
      console.error(`[AddCommission] Exception during extraction:`, error);
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, isExtracting: false } : entry,
        ),
      );
      Alert.alert(
        "Extraction Error",
        `Failed to extract commission: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  // Re-validate when amount changes (if image already has extracted balance)
  const handleAmountChange = (entryId: string, value: string) => {
    // Remove commas and spaces from input to get clean number
    const cleanValue = value.replace(/[,\s]/g, "");

    // Only allow valid number characters (digits and one decimal point)
    if (cleanValue && !/^\d*\.?\d*$/.test(cleanValue)) {
      return; // Reject invalid input
    }

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== entryId) return entry;

        const updatedEntry = { ...entry, amount: cleanValue };

        // If we have an extracted balance and user entered an amount, validate
        if (entry.extractedBalance !== null && cleanValue.trim()) {
          const inputBalance = parseFloat(cleanValue);
          if (!isNaN(inputBalance)) {
            updatedEntry.validationResult = validateBalance(
              entry.extractedBalance,
              inputBalance,
            );
          }
        } else {
          updatedEntry.validationResult = null;
        }

        return updatedEntry;
      }),
    );

    // Clear error for this field
    if (errors[entryId]?.amount) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[entryId]) {
          delete newErrors[entryId].amount;
        }
        return newErrors;
      });
    }
  };

  // Show image picker options
  const showImageOptions = (entryId: string) => {
    Alert.alert("Add Image", "Choose an option", [
      { text: "Take Photo", onPress: () => takePhoto(entryId) },
      { text: "Choose from Library", onPress: () => pickImage(entryId) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Take photo with camera
  const takePhoto = async (entryId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is needed to take photos.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        updateEntry(entryId, "imageUrl", imageUri);
        // Extract commission from the image
        await extractAndValidateCommission(entryId, imageUri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo. Please try again.");
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
        updateEntry(entryId, "imageUrl", imageUri);
        // Extract commission from the image
        await extractAndValidateCommission(entryId, imageUri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Remove image from entry
  const removeImage = (entryId: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              imageUrl: "",
              extractedBalance: null,
              validationResult: null,
            }
          : entry,
      ),
    );
  };

  // Select account for entry
  const selectAccount = (entryId: string, account: Account) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              accountId: account.id,
              accountName: account.name,
            }
          : entry,
      ),
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

      // Check for commission mismatch
      if (entry.validationResult && !entry.validationResult.isValid) {
        entryErrors.validation = "Commission mismatch";
        isValid = false;
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[entry.id] = entryErrors;
      }
    });

    setErrors(newErrors);

    // Show specific alert for commission mismatches
    const mismatchedEntries = entries.filter(
      (e) => e.validationResult && !e.validationResult.isValid,
    );
    if (mismatchedEntries.length > 0) {
      Alert.alert(
        "Commission Mismatch Detected",
        "One or more commissions don't match the extracted values from images. Please verify and correct the amounts before saving.",
        [{ text: "OK" }],
      );
    }

    return isValid;
  };

  // Check if we have existing entries (for update vs create)
  const hasExistingEntries = entries.some((e) => e.id.startsWith("existing-"));

  const handleSubmit = async () => {
    if (!validateEntries()) return;

    try {
      setIsSubmitting(true);

      // Separate entries into existing (to update) vs new (to create)
      const existingEntries = entries.filter((e) =>
        e.id.startsWith("existing-"),
      );
      const newEntries = entries.filter((e) => !e.id.startsWith("existing-"));

      let totalCreated = 0;
      let totalUpdated = 0;
      let totalFailed = 0;

      // Handle updates for existing entries
      if (existingEntries.length > 0) {
        const updateDataArray = await Promise.all(
          existingEntries.map(async (entry) => {
            // Extract the numeric id from "existing-{id}"
            const numericId = parseInt(entry.id.replace("existing-", ""), 10);

            let imageData: string | undefined;

            if (entry.imageUrl) {
              // Check if it's already base64 (from prepopulated data)
              if (entry.imageUrl.startsWith("data:image")) {
                imageData = entry.imageUrl.split(",")[1];
              } else {
                // Read from file system for new images
                const base64 = await FileSystem.readAsStringAsync(
                  entry.imageUrl,
                  {
                    encoding: FileSystem.EncodingType.Base64,
                  },
                );
                imageData = base64;
              }
            }

            return {
              id: numericId,
              accountId: entry.accountId!,
              shift: currentShift,
              amount: parseFloat(entry.amount),
              imageData: imageData,
            };
          }),
        );

        const updateResult = await dispatch(
          updateCommissionsBulk({ commissions: updateDataArray }),
        ).unwrap();

        totalUpdated = updateResult.totalUpdated;
        totalFailed += updateResult.totalFailed;
      }

      // Handle creates for new entries
      if (newEntries.length > 0) {
        const commissionsWithImages = await Promise.all(
          newEntries.map(async (entry) => {
            let imageData: string | undefined;

            if (entry.imageUrl) {
              // Check if it's already base64 (from prepopulated data)
              if (entry.imageUrl.startsWith("data:image")) {
                imageData = entry.imageUrl.split(",")[1];
              } else {
                // Read from file system for new images
                const base64 = await FileSystem.readAsStringAsync(
                  entry.imageUrl,
                  {
                    encoding: FileSystem.EncodingType.Base64,
                  },
                );
                imageData = base64;
              }
            }

            const commission: CommissionCreate = {
              accountId: entry.accountId!,
              shift: currentShift,
              amount: parseFloat(entry.amount),
              date: new Date().toISOString().split("T")[0],
              imageData: imageData,
              companyId: companyId || 0,
            };

            return commission;
          }),
        );

        const result = await dispatch(
          createCommissionsBulk(commissionsWithImages),
        ).unwrap();

        // createCommissionsBulk returns Commission[], count the successes
        totalCreated = Array.isArray(result) ? result.length : 0;
      }

      // Refresh dashboard and commissions list
      await Promise.all([
        dispatch(fetchDashboard({})).unwrap(),
        dispatch(fetchCommissions({ forceRefresh: true })).unwrap(),
      ]);

      // Clear draft entries after successful submission
      dispatch(clearDraftEntries());

      // Build success message
      const operations: string[] = [];
      if (totalCreated > 0)
        operations.push(
          `${totalCreated} commission${totalCreated > 1 ? "s" : ""} created`,
        );
      if (totalUpdated > 0)
        operations.push(
          `${totalUpdated} commission${totalUpdated > 1 ? "s" : ""} updated`,
        );

      if (totalFailed > 0) {
        Alert.alert(
          "Partial Success",
          `${operations.join(", ")}. ${totalFailed} failed.`,
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else {
        Alert.alert("Success", `Successfully ${operations.join(" and ")}!`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error("[AddCommission] Error saving commissions:", error);
      Alert.alert(
        "Error",
        error?.message || "Failed to save commissions. Please try again.",
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
      .filter((acc) => acc.isActive)
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

          {/* Shift Badge (read-only, set from reconciliation screen) */}
          <View className="px-4 pb-4">
            <View
              className={`px-4 py-2 rounded-full self-start ${currentShift === "AM" ? "bg-blue-100" : "bg-red-100"}`}
            >
              <Text
                className={`font-bold ${currentShift === "AM" ? "text-blue-700" : "text-red-700"}`}
              >
                {currentShift} Shift
              </Text>
            </View>
          </View>
        </View>

        {/* Entries Cards */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 240 }}
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
                    className={`p-4 rounded-xl border text-lg text-gray-900 ${
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

                  {/* Show extracted balance if available but no validation yet */}
                  {entry.extractedBalance !== null &&
                    !entry.validationResult && (
                      <Text className="text-gray-500 text-sm mt-2">
                        Extracted from image: R{" "}
                        {entry.extractedBalance.toLocaleString()}
                      </Text>
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

                      {/* Extraction status badge - Green checkmark with amount */}
                      {!entry.isExtracting &&
                        entry.extractedBalance !== null && (
                          <View className="absolute top-2 left-2 bg-green-500 px-3 py-1.5 rounded-full flex-row items-center">
                            <CheckCircle color="white" size={14} />
                            <Text className="text-white text-sm ml-1 font-semibold">
                              R {entry.extractedBalance.toLocaleString()}
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

        {/* Total and Submit Button - Fixed at bottom */}
        <View className="my-20 px-5 pb-6 pt-2 bg-gray-50">
          {/* Total Display */}
          <View className="flex-row justify-between items-center mb-3 px-2">
            <Text className="text-gray-600 font-medium">Total Commission:</Text>
            <Text className="text-xl font-bold text-gray-900">
              UGX{" "}
              {entries
                .reduce(
                  (sum, entry) => sum + (parseFloat(entry.amount) || 0),
                  0,
                )
                .toLocaleString()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`py-4 rounded-xl flex-row items-center justify-center space-x-2 ${
              isSubmitting ? "bg-gray-400" : "bg-brand-gold"
            }`}
          >
            <Save color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">
              {isSubmitting
                ? hasExistingEntries
                  ? "Updating..."
                  : "Submitting..."
                : hasExistingEntries
                  ? `Update ${entries.length} Commission${
                      entries.length > 1 ? "s" : ""
                    }`
                  : `Submit ${entries.length} Commission${
                      entries.length > 1 ? "s" : ""
                    }`}
            </Text>
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
                      selectAccount(accountPickerVisible, item)
                    }
                    className="p-4 border-b border-gray-100"
                  >
                    <Text className="text-gray-900 font-medium">
                      {item.name}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {item.accountType}
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
