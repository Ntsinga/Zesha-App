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
  createBalance,
  saveDraftEntries,
  clearDraftEntries,
  createBalancesBulk,
  fetchBalances,
} from "../store/slices/balancesSlice";
import { fetchDashboard } from "../store/slices/dashboardSlice";
import { fetchAccounts } from "../store/slices/accountsSlice";
import {
  extractBalanceFromImage,
  validateBalance,
  BalanceValidationResult,
} from "../services/balanceExtractor";
import * as FileSystem from "expo-file-system/legacy";
import type { AppDispatch, RootState } from "../store";
import type { ShiftEnum, BalanceCreate, Account } from "../types";

interface BalanceEntry {
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

const createEmptyEntry = (): BalanceEntry => ({
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

export default function AddBalancePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();

  // Get accounts, draft entries, and balances from Redux store
  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts
  );

  const { draftEntries, items: balances } = useSelector(
    (state: RootState) => state.balances
  );

  const [entries, setEntries] = useState<BalanceEntry[]>([createEmptyEntry()]);
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
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toISOString()
    .split("T")[0];

  // Fetch accounts and balances on mount
  useEffect(() => {
    dispatch(fetchAccounts({ is_active: true }));
    dispatch(fetchBalances({ date_from: today, date_to: today }));
  }, [dispatch, today]);

  // Initialize entries from existing balances or draft entries
  useEffect(() => {
    if (isInitialized || accountsLoading) return;

    console.log("[AddBalance] Prepopulation check:", {
      balancesCount: balances.length,
      today,
      currentShift,
      accountsLoaded: accounts.length,
    });

    // Check if there are balances for today with the current shift
    const todayBalances = balances.filter(
      (bal) => bal.date.startsWith(today) && bal.shift === currentShift
    );

    console.log("[AddBalance] Today balances for shift:", {
      shift: currentShift,
      count: todayBalances.length,
      balances: todayBalances.map((b) => ({
        account_id: b.account_id,
        amount: b.amount,
        date: b.date,
      })),
    });

    if (todayBalances.length > 0) {
      // Prepopulate with existing balances
      const prepopulatedEntries: BalanceEntry[] = todayBalances.map((bal) => {
        // Get account name from relationship or find by id
        let accountName = "";
        let accountId = bal.account_id;

        if (bal.account) {
          // Use relationship data if available
          accountName = bal.account.name;
        } else {
          // Fallback: find account by id
          const account = accounts.find((acc) => acc.id === bal.account_id);
          accountName = account?.name || `Account ${bal.account_id}`;
        }

        // Determine the image URL - prioritize image_data (base64) over image_url
        let imageUri = "";
        if (bal.image_data) {
          // Mobile app upload - use base64 data
          imageUri = `data:image/jpeg;base64,${bal.image_data}`;
        } else if (bal.image_url) {
          // WhatsApp or URL upload
          imageUri = bal.image_url;
        }

        return {
          id: `existing-${bal.id}`,
          accountId: accountId,
          accountName: accountName,
          shift: bal.shift,
          amount: bal.amount.toString(),
          imageUrl: imageUri,
          extractedBalance: null,
          isExtracting: false,
          validationResult: null,
        };
      });

      console.log(
        "[AddBalance] Prepopulating entries:",
        prepopulatedEntries.length
      );
      setEntries(prepopulatedEntries);
      setIsInitialized(true);
    } else if (draftEntries.length > 0) {
      // Load draft entries if no existing balances
      console.log("[AddBalance] Loading draft entries:", draftEntries.length);
      setEntries(draftEntries);
      setIsInitialized(true);
    } else {
      console.log(
        "[AddBalance] No existing balances or drafts, initializing empty"
      );
      setIsInitialized(true);
    }
  }, [
    balances,
    draftEntries,
    today,
    currentShift,
    isInitialized,
    accountsLoading,
    accounts,
  ]);

  // Save draft entries to Redux whenever they change (only if not from existing balances)
  useEffect(() => {
    if (isInitialized && !entries.some((e) => e.id.startsWith("existing-"))) {
      dispatch(saveDraftEntries(entries));
    }
  }, [entries, dispatch, isInitialized]);

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera permission is needed to take photos. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  // Request media library permissions
  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Photo library permission is needed to select images. Please enable it in your device settings.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async (entryId: string) => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        updateEntry(entryId, "imageUrl", imageUri);
        // Extract balance from the image
        await extractAndValidateBalance(entryId, imageUri);
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
        // Extract balance from the image
        await extractAndValidateBalance(entryId, imageUri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  // Extract balance from image and validate against user input
  const extractAndValidateBalance = async (
    entryId: string,
    imageUri: string
  ) => {
    // Set extracting state
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, isExtracting: true, validationResult: null }
          : entry
      )
    );

    try {
      console.log(
        `[AddBalance] Calling extractBalanceFromImage for entry ${entryId}...`
      );
      const result = await extractBalanceFromImage(imageUri);
      console.log(`[AddBalance] Extraction result:`, result);

      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;

          const extractedBalance = result.balance;
          console.log(
            `[AddBalance] Extracted balance for entry ${entryId}:`,
            extractedBalance
          );

          // If user has already entered an amount, validate it
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
                inputBalance
              );
              console.log(`[AddBalance] Validation result:`, validationResult);
            }
          }

          return {
            ...entry,
            extractedBalance,
            isExtracting: false,
            validationResult,
          };
        })
      );

      if (!result.success) {
        console.warn(`[AddBalance] Extraction unsuccessful:`, result.error);
        Alert.alert(
          "Extraction Notice",
          result.error ||
            "Could not extract balance from image. Please verify manually."
        );
      }
    } catch (error) {
      console.error(`[AddBalance] Exception during extraction:`, error);
      if (error instanceof Error) {
        console.error(`[AddBalance] Error stack:`, error.stack);
      }
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, isExtracting: false } : entry
        )
      );
      Alert.alert(
        "Extraction Error",
        `Failed to extract balance: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
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
              inputBalance
            );
          }
        } else {
          updatedEntry.validationResult = null;
        }

        return updatedEntry;
      })
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
          : entry
      )
    );
  };

  const updateEntry = (
    id: string,
    field: keyof BalanceEntry,
    value: string | number | null
  ) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
    // Clear error for this field
    const errorField = field === "accountId" ? "account" : field;
    if (errors[id]?.[errorField]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[id]) {
          delete newErrors[id][errorField];
        }
        return newErrors;
      });
    }
  };

  const selectAccount = (entryId: string, account: Account) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, accountId: account.id, accountName: account.name }
          : entry
      )
    );
    // Clear account error
    if (errors[entryId]?.account) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[entryId]) {
          delete newErrors[entryId].account;
        }
        return newErrors;
      });
    }
    setAccountPickerVisible(null);
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }
  };

  const validateEntries = (): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    let isValid = true;

    entries.forEach((entry) => {
      const entryErrors: Record<string, string> = {};

      if (!entry.accountId) {
        entryErrors.account = "Required";
        isValid = false;
      }

      if (!entry.amount.trim()) {
        entryErrors.amount = "Required";
        isValid = false;
      } else if (
        isNaN(parseFloat(entry.amount)) ||
        parseFloat(entry.amount) < 0
      ) {
        entryErrors.amount = "Invalid amount";
        isValid = false;
      }

      // Image is now required
      if (!entry.imageUrl) {
        entryErrors.image = "Image required";
        isValid = false;
      }

      // Check for balance mismatch
      if (entry.validationResult && !entry.validationResult.isValid) {
        entryErrors.validation = "Balance mismatch";
        isValid = false;
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[entry.id] = entryErrors;
      }
    });

    setErrors(newErrors);

    // Check if all active accounts have balances
    const selectedAccountIds = entries
      .filter((e) => e.accountId !== null)
      .map((e) => e.accountId);
    const activeAccounts = accounts.filter((a) => a.is_active);
    const missingAccounts = activeAccounts.filter(
      (account) => !selectedAccountIds.includes(account.id)
    );

    if (missingAccounts.length > 0) {
      const missingAccountNames = missingAccounts.map((a) => a.name).join(", ");
      Alert.alert(
        "Missing Account Balances",
        `The following active accounts are missing balances: ${missingAccountNames}\n\nPlease add balances for all active accounts.`,
        [{ text: "OK" }]
      );
      isValid = false;
    }

    // Show specific alert for balance mismatches
    const mismatchedEntries = entries.filter(
      (e) => e.validationResult && !e.validationResult.isValid
    );
    if (mismatchedEntries.length > 0) {
      Alert.alert(
        "Balance Mismatch Detected",
        "One or more balances don't match the extracted values from images. Please verify and correct the amounts before saving.",
        [{ text: "OK" }]
      );
    }

    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateEntries()) return;

    setIsSubmitting(true);

    try {
      // Convert all entries to balance data with base64 images
      const balanceDataArray = await Promise.all(
        entries.map(async (entry) => {
          let imageData: string | null = null;

          // Convert image to base64 if present
          if (entry.imageUrl) {
            try {
              imageData = await FileSystem.readAsStringAsync(entry.imageUrl, {
                encoding: FileSystem.EncodingType.Base64,
              });
            } catch (error) {
              console.error("[AddBalance] Failed to read image:", error);
              // Continue without image data
            }
          }

          return {
            account_id: entry.accountId!,
            shift: entry.shift,
            amount: parseFloat(entry.amount),
            source: "mobile_app" as const,
            date: new Date().toISOString().split("T")[0],
            image_data: imageData,
          };
        })
      );

      // Use bulk create endpoint
      const result = await dispatch(
        createBalancesBulk({ balances: balanceDataArray })
      ).unwrap();

      // Refresh dashboard after adding balances
      dispatch(fetchDashboard({}));

      // Clear draft entries after successful submission
      dispatch(clearDraftEntries());

      // Show success/partial success message
      if (result.total_failed > 0) {
        Alert.alert(
          "Partial Success",
          `${result.total_created} of ${result.total_submitted} balances created successfully. ${result.total_failed} failed.`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "Success",
          `${result.total_created} balance${
            result.total_created > 1 ? "s" : ""
          } added successfully!`,
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to add balances"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate missing accounts
  const getMissingAccounts = () => {
    const selectedAccountIds = entries
      .filter((e) => e.accountId !== null)
      .map((e) => e.accountId);
    const activeAccounts = accounts.filter((a) => a.is_active);
    return activeAccounts.filter(
      (account) => !selectedAccountIds.includes(account.id)
    );
  };

  const missingAccounts = getMissingAccounts();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <View className="flex-1">
        {/* Header */}
        <View className="px-5 pt-6 pb-2">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => router.back()}
                className="p-2 bg-white rounded-full shadow-sm mr-4"
              >
                <ArrowLeft color="#C62828" size={24} />
              </TouchableOpacity>
              <View>
                <Text className="text-2xl font-bold text-gray-800">
                  Add Balances
                </Text>
                <Text className="text-gray-500 text-sm">
                  {entries.length} of{" "}
                  {accounts.filter((a) => a.is_active).length} accounts
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={addEntry}
              className="bg-brand-red p-3 rounded-full shadow-md"
            >
              <Plus color="white" size={24} />
            </TouchableOpacity>
          </View>

          {/* Shift Selector */}
          <View className="flex-row bg-white rounded-xl p-1 shadow-sm mb-4">
            <TouchableOpacity
              onPress={() => {
                setCurrentShift("AM");
                setIsInitialized(false);
              }}
              className={`flex-1 py-2 rounded-lg ${
                currentShift === "AM" ? "bg-brand-red" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-bold ${
                  currentShift === "AM" ? "text-white" : "text-gray-600"
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
              className={`flex-1 py-2 rounded-lg ${
                currentShift === "PM" ? "bg-brand-red" : "bg-transparent"
              }`}
            >
              <Text
                className={`text-center font-bold ${
                  currentShift === "PM" ? "text-white" : "text-gray-600"
                }`}
              >
                PM Shift
              </Text>
            </TouchableOpacity>
          </View>

          {/* Missing Accounts Warning */}
          {missingAccounts.length > 0 && (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex-row items-start">
              <AlertTriangle color="#F59E0B" size={16} />
              <View className="flex-1 ml-2">
                <Text className="text-amber-800 font-semibold text-xs">
                  Missing {missingAccounts.length} account
                  {missingAccounts.length > 1 ? "s" : ""}:
                </Text>
                <Text className="text-amber-700 text-xs mt-0.5">
                  {missingAccounts.map((a) => a.name).join(", ")}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Horizontal Scrolling Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          className="flex-1"
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
        >
          {entries.map((entry, index) => (
            <View
              key={entry.id}
              style={{ width: CARD_WIDTH }}
              className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100 mr-4"
            >
              {/* Card Header */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-brand-red">
                  Balance {index + 1}
                </Text>
                {entries.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeEntry(entry.id)}
                    className="p-1"
                  >
                    <X color="#EF4444" size={20} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Account Selection */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Account *
                </Text>
                <TouchableOpacity
                  onPress={() => setAccountPickerVisible(entry.id)}
                  className={`bg-gray-50 rounded-xl px-3 py-2.5 flex-row justify-between items-center ${
                    errors[entry.id]?.account
                      ? "border-2 border-red-500"
                      : "border border-gray-200"
                  }`}
                >
                  <Text
                    className={`${
                      entry.accountName ? "text-gray-800" : "text-gray-400"
                    }`}
                  >
                    {entry.accountName || "Select account"}
                  </Text>
                  <ChevronDown color="#6B7280" size={20} />
                </TouchableOpacity>
                {errors[entry.id]?.account && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors[entry.id].account}
                  </Text>
                )}
              </View>

              {/* Shift Selection */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Shift *
                </Text>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() => updateEntry(entry.id, "shift", "AM")}
                    className={`flex-1 py-2.5 rounded-xl ${
                      entry.shift === "AM"
                        ? "bg-brand-red"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        entry.shift === "AM" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      AM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateEntry(entry.id, "shift", "PM")}
                    className={`flex-1 py-2.5 rounded-xl ${
                      entry.shift === "PM"
                        ? "bg-brand-red"
                        : "bg-gray-100 border border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-center font-bold ${
                        entry.shift === "PM" ? "text-white" : "text-gray-600"
                      }`}
                    >
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Amount *
                </Text>
                <TextInput
                  value={
                    entry.amount ? Number(entry.amount).toLocaleString() : ""
                  }
                  onChangeText={(value) => handleAmountChange(entry.id, value)}
                  placeholder="0"
                  keyboardType="number-pad"
                  className={`bg-gray-50 rounded-xl px-3 py-2.5 text-gray-800 text-lg ${
                    errors[entry.id]?.amount || errors[entry.id]?.validation
                      ? "border-2 border-red-500"
                      : entry.validationResult?.isValid
                      ? "border-2 border-green-500"
                      : "border border-gray-200"
                  }`}
                />
                {errors[entry.id]?.amount && (
                  <Text className="text-red-500 text-xs mt-1">
                    {errors[entry.id].amount}
                  </Text>
                )}

                {/* Validation Status */}
                {entry.validationResult && (
                  <View
                    className={`mt-2 p-2 rounded-lg flex-row items-start ${
                      entry.validationResult.isValid
                        ? "bg-green-50"
                        : "bg-red-50"
                    }`}
                  >
                    {entry.validationResult.isValid ? (
                      <CheckCircle color="#22C55E" size={16} />
                    ) : (
                      <AlertTriangle color="#EF4444" size={16} />
                    )}
                    <Text
                      className={`ml-2 text-xs flex-1 ${
                        entry.validationResult.isValid
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {entry.validationResult.message}
                    </Text>
                  </View>
                )}

                {/* Show extracted balance if available */}
                {entry.extractedBalance !== null && !entry.validationResult && (
                  <Text className="text-gray-500 text-xs mt-1">
                    Extracted from image:{" "}
                    {entry.extractedBalance.toLocaleString()}
                  </Text>
                )}
              </View>

              {/* Image Section */}
              <View>
                <Text className="text-gray-700 font-semibold mb-1 text-sm">
                  Image *
                </Text>
                {entry.imageUrl ? (
                  <View className="relative">
                    <Image
                      source={{ uri: entry.imageUrl }}
                      className="w-full h-32 rounded-xl"
                      resizeMode="cover"
                    />
                    {/* Extraction loading overlay */}
                    {entry.isExtracting && (
                      <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                        <ActivityIndicator color="white" size="large" />
                        <Text className="text-white text-xs mt-2">
                          Extracting balance...
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={() => removeImage(entry.id)}
                      className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full"
                    >
                      <X color="white" size={14} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => showImageOptions(entry.id)}
                      className="absolute bottom-2 right-2 bg-white/90 px-3 py-1.5 rounded-lg flex-row items-center"
                    >
                      <Camera color="#6B7280" size={14} />
                      <Text className="text-gray-600 text-xs ml-1">Change</Text>
                    </TouchableOpacity>
                    {/* Extraction status badge */}
                    {!entry.isExtracting && entry.extractedBalance !== null && (
                      <View className="absolute top-2 left-2 bg-green-500 px-2 py-1 rounded-full flex-row items-center">
                        <CheckCircle color="white" size={12} />
                        <Text className="text-white text-xs ml-1 font-semibold">
                          {entry.extractedBalance.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <View
                      className={`flex-row space-x-2 ${
                        errors[entry.id]?.image ? "opacity-100" : ""
                      }`}
                    >
                      <TouchableOpacity
                        onPress={() => takePhoto(entry.id)}
                        className={`flex-1 bg-gray-50 rounded-xl py-4 items-center ${
                          errors[entry.id]?.image
                            ? "border-2 border-red-500"
                            : "border border-gray-200"
                        }`}
                      >
                        <Camera
                          color={
                            errors[entry.id]?.image ? "#EF4444" : "#6B7280"
                          }
                          size={24}
                        />
                        <Text
                          className={`text-xs mt-1 ${
                            errors[entry.id]?.image
                              ? "text-red-500"
                              : "text-gray-500"
                          }`}
                        >
                          Camera
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => pickImage(entry.id)}
                        className={`flex-1 bg-gray-50 rounded-xl py-4 items-center ${
                          errors[entry.id]?.image
                            ? "border-2 border-red-500"
                            : "border border-gray-200"
                        }`}
                      >
                        <ImageIcon
                          color={
                            errors[entry.id]?.image ? "#EF4444" : "#6B7280"
                          }
                          size={24}
                        />
                        <Text
                          className={`text-xs mt-1 ${
                            errors[entry.id]?.image
                              ? "text-red-500"
                              : "text-gray-500"
                          }`}
                        >
                          Gallery
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {errors[entry.id]?.image && (
                      <Text className="text-red-500 text-xs mt-1 text-center">
                        {errors[entry.id].image}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Add More Card */}
          <TouchableOpacity
            onPress={addEntry}
            style={{ width: CARD_WIDTH * 0.5 }}
            className="bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300 items-center justify-center mr-4"
          >
            <Plus color="#9CA3AF" size={40} />
            <Text className="text-gray-400 font-semibold mt-2">Add More</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Submit Button - Fixed at bottom */}
        <View className="px-5 pb-6 pt-2 bg-gray-50">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`py-4 rounded-xl flex-row items-center justify-center space-x-2 ${
              isSubmitting ? "bg-gray-400" : "bg-brand-red"
            }`}
          >
            <Save color="white" size={20} />
            <Text className="text-white font-bold text-base ml-2">
              {isSubmitting
                ? "Saving..."
                : `Save ${entries.length} Balance${
                    entries.length > 1 ? "s" : ""
                  }`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Picker Modal */}
      <Modal
        visible={accountPickerVisible !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAccountPickerVisible(null)}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setAccountPickerVisible(null)}
          className="bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View className="bg-white rounded-t-3xl max-h-96">
              <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
                <Text className="text-lg font-bold text-gray-800">
                  Select Account
                </Text>
                <TouchableOpacity onPress={() => setAccountPickerVisible(null)}>
                  <X color="#6B7280" size={24} />
                </TouchableOpacity>
              </View>

              {accountsLoading ? (
                <View className="p-8 items-center">
                  <Text className="text-gray-500">Loading accounts...</Text>
                </View>
              ) : accounts.length === 0 ? (
                <View className="p-8 items-center">
                  <Text className="text-gray-500">No accounts available</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setAccountPickerVisible(null);
                      router.push("/accounts");
                    }}
                    className="mt-4 bg-brand-red px-6 py-2 rounded-xl"
                  >
                    <Text className="text-white font-semibold">
                      Add Account
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={accounts}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => {
                    const currentEntry = entries.find(
                      (e) => e.id === accountPickerVisible
                    );
                    const isSelected = currentEntry?.accountId === item.id;
                    const isAlreadySelected = entries.some(
                      (e) =>
                        e.accountId === item.id && e.id !== accountPickerVisible
                    );
                    return (
                      <TouchableOpacity
                        onPress={() =>
                          accountPickerVisible &&
                          selectAccount(accountPickerVisible, item)
                        }
                        disabled={isAlreadySelected}
                        className={`flex-row items-center justify-between p-4 border-b border-gray-100 ${
                          isSelected
                            ? "bg-red-50"
                            : isAlreadySelected
                            ? "bg-gray-50 opacity-50"
                            : ""
                        }`}
                      >
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text
                              className={`font-semibold ${
                                isAlreadySelected
                                  ? "text-gray-400"
                                  : "text-gray-800"
                              }`}
                            >
                              {item.name}
                            </Text>
                            {isAlreadySelected && (
                              <View className="ml-2 bg-green-100 px-2 py-0.5 rounded-full">
                                <Text className="text-green-700 text-xs font-semibold">
                                  ✓ Added
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            className={`text-sm ${
                              isAlreadySelected
                                ? "text-gray-400"
                                : "text-gray-500"
                            }`}
                          >
                            {item.account_type}
                          </Text>
                        </View>
                        {isSelected && <Check color="#DC2626" size={20} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}
