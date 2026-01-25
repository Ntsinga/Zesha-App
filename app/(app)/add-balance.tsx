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
  createBalance,
  saveDraftEntries,
  clearDraftEntries,
  createBalancesBulk,
  updateBalancesBulk,
  fetchBalances,
} from "../../store/slices/balancesSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import {
  extractBalanceFromImage,
  validateBalance,
  BalanceValidationResult,
} from "../../services/balanceExtractor";
import * as FileSystem from "expo-file-system/legacy";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum, BalanceCreate, Account } from "../../types";
import { useCurrencyFormatter } from "../../hooks/useCurrency";

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

export default function AddBalancePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();
  const params = useLocalSearchParams();
  const shiftFromParams = (params.shift as ShiftEnum) || "AM";

  // Get companyId from auth state
  const { user } = useSelector((state: RootState) => state.auth);
  const companyId = user?.companyId;

  // Get accounts, draft entries, and balances from Redux store
  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts,
  );

  const { draftEntries, items: balances } = useSelector(
    (state: RootState) => state.balances,
  );

  const [entries, setEntries] = useState<BalanceEntry[]>([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [accountPickerVisible, setAccountPickerVisible] = useState<
    string | null
  >(null);
  const [currentShift, setCurrentShift] = useState<ShiftEnum>(shiftFromParams);
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Get today's date
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toISOString()
    .split("T")[0];

  // Fetch accounts and balances on mount - force refresh to get latest data
  useEffect(() => {
    dispatch(fetchAccounts({ isActive: true, forceRefresh: true }));
    dispatch(
      fetchBalances({ dateFrom: today, dateTo: today, forceRefresh: true }),
    );
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
      (bal) => bal.date.startsWith(today) && bal.shift === currentShift,
    );

    console.log("[AddBalance] Today balances for shift:", {
      shift: currentShift,
      count: todayBalances.length,
      balances: todayBalances.map((b) => ({
        accountId: b.accountId,
        amount: b.amount,
        date: b.date,
      })),
    });

    if (todayBalances.length > 0) {
      // Prepopulate with existing balances
      const prepopulatedEntries: BalanceEntry[] = todayBalances.map((bal) => {
        // Get account name from relationship or find by id
        let accountName = "";
        let accountId = bal.accountId;

        if (bal.account) {
          // Use relationship data if available
          accountName = bal.account.name;
        } else {
          // Fallback: find account by id
          const account = accounts.find((acc) => acc.id === bal.accountId);
          accountName = account?.name || `Account ${bal.accountId}`;
        }

        // Determine the image URL - prioritize imageData (base64) over imageUrl
        let imageUri = "";
        if (bal.imageData) {
          // Mobile app upload - use base64 data
          imageUri = `data:image/jpeg;base64,${bal.imageData}`;
        } else if (bal.imageUrl) {
          // WhatsApp or URL upload
          imageUri = bal.imageUrl;
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
        prepopulatedEntries.length,
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
        "[AddBalance] No existing balances or drafts, initializing empty",
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
        [{ text: "OK" }],
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
        [{ text: "OK" }],
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
      console.log(
        `[AddBalance] Calling extractBalanceFromImage for entry ${entryId}...`,
      );
      const result = await extractBalanceFromImage(imageUri);
      console.log(`[AddBalance] Extraction result:`, result);

      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;

          const extractedBalance = result.balance;
          console.log(
            `[AddBalance] Extracted balance for entry ${entryId}:`,
            extractedBalance,
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
                inputBalance,
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
        }),
      );

      if (!result.success) {
        console.warn(`[AddBalance] Extraction unsuccessful:`, result.error);
        Alert.alert(
          "Extraction Notice",
          result.error ||
            "Could not extract balance from image. Please verify manually.",
        );
      }
    } catch (error) {
      console.error(`[AddBalance] Exception during extraction:`, error);
      if (error instanceof Error) {
        console.error(`[AddBalance] Error stack:`, error.stack);
      }
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, isExtracting: false } : entry,
        ),
      );
      Alert.alert(
        "Extraction Error",
        `Failed to extract balance: ${
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

  const updateEntry = (
    id: string,
    field: keyof BalanceEntry,
    value: string | number | null,
  ) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
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
          : entry,
      ),
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

  // Validate a single entry and set its errors
  const validateSingleEntry = (entryId: string): boolean => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return false;

    const entryErrors: Record<string, string> = {};
    let isValid = true;

    if (!entry.accountId) {
      entryErrors.account = "Account is required";
      isValid = false;
    }

    if (!entry.amount.trim()) {
      entryErrors.amount = "Amount is required";
      isValid = false;
    } else if (
      isNaN(parseFloat(entry.amount)) ||
      parseFloat(entry.amount) < 0
    ) {
      entryErrors.amount = "Invalid amount";
      isValid = false;
    }

    if (!entry.imageUrl) {
      entryErrors.image = "Image is required";
      isValid = false;
    }

    if (entry.validationResult && !entry.validationResult.isValid) {
      entryErrors.validation = "Balance mismatch detected";
      isValid = false;
    }

    setErrors((prev) => {
      if (Object.keys(entryErrors).length > 0) {
        return { ...prev, [entryId]: entryErrors };
      } else {
        const newErrors = { ...prev };
        delete newErrors[entryId];
        return newErrors;
      }
    });

    return isValid;
  };

  // Handle closing the entry modal with validation
  const handleCloseEntryModal = () => {
    if (editingEntryId) {
      const entry = entries.find((e) => e.id === editingEntryId);

      // Check if entry is pristine (empty/untouched)
      const isPristine =
        entry && !entry.accountId && !entry.amount.trim() && !entry.imageUrl;

      // If pristine, allow closing without validation
      if (isPristine) {
        setEditingEntryId(null);
        return;
      }

      // Otherwise validate before closing
      const isValid = validateSingleEntry(editingEntryId);
      if (!isValid) {
        // Keep modal open - errors are shown inline
        return;
      }
    }
    setEditingEntryId(null);
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
    const activeAccounts = accounts.filter((a) => a.isActive);
    const missingAccounts = activeAccounts.filter(
      (account) => !selectedAccountIds.includes(account.id),
    );

    if (missingAccounts.length > 0) {
      const missingAccountNames = missingAccounts.map((a) => a.name).join(", ");
      Alert.alert(
        "Missing Account Balances",
        `The following active accounts are missing balances: ${missingAccountNames}\n\nPlease add balances for all active accounts.`,
        [{ text: "OK" }],
      );
      isValid = false;
    }

    // Show specific alert for balance mismatches
    const mismatchedEntries = entries.filter(
      (e) => e.validationResult && !e.validationResult.isValid,
    );
    if (mismatchedEntries.length > 0) {
      Alert.alert(
        "Balance Mismatch Detected",
        "One or more balances don't match the extracted values from images. Please verify and correct the amounts before saving.",
        [{ text: "OK" }],
      );
    }

    return isValid;
  };

  // Check if we have existing entries (for update vs create)
  const hasExistingEntries = entries.some((e) => e.id.startsWith("existing-"));

  const handleSubmit = async () => {
    if (!validateEntries()) return;

    if (!companyId) {
      Alert.alert("Error", "Company not found. Please log in again.");
      return;
    }

    setIsSubmitting(true);

    try {
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

            let imageData: string | null = null;

            // Convert image to base64 if present and it's a local file
            if (entry.imageUrl && !entry.imageUrl.startsWith("data:image")) {
              try {
                imageData = await FileSystem.readAsStringAsync(entry.imageUrl, {
                  encoding: FileSystem.EncodingType.Base64,
                });
              } catch (error) {
                console.error("[AddBalance] Failed to read image:", error);
              }
            } else if (
              entry.imageUrl &&
              entry.imageUrl.startsWith("data:image")
            ) {
              // Already base64
              imageData = entry.imageUrl.split(",")[1];
            }

            return {
              id: numericId,
              accountId: entry.accountId!,
              shift: currentShift,
              amount: parseFloat(entry.amount),
              imageData: imageData || undefined,
            };
          }),
        );

        const updateResult = await dispatch(
          updateBalancesBulk({ balances: updateDataArray }),
        ).unwrap();

        totalUpdated = updateResult.totalUpdated;
        totalFailed += updateResult.totalFailed;
      }

      // Handle creates for new entries
      if (newEntries.length > 0) {
        const balanceDataArray = await Promise.all(
          newEntries.map(async (entry) => {
            let imageData: string | null = null;

            // Convert image to base64 if present
            if (entry.imageUrl) {
              try {
                imageData = await FileSystem.readAsStringAsync(entry.imageUrl, {
                  encoding: FileSystem.EncodingType.Base64,
                });
              } catch (error) {
                console.error("[AddBalance] Failed to read image:", error);
              }
            }

            return {
              accountId: entry.accountId!,
              shift: currentShift,
              amount: parseFloat(entry.amount),
              source: "mobile_app" as const,
              date: today,
              imageData: imageData,
              companyId: companyId || 0,
            };
          }),
        );

        const createResult = await dispatch(
          createBalancesBulk({ balances: balanceDataArray }),
        ).unwrap();

        totalCreated = createResult.totalCreated;
        totalFailed += createResult.totalFailed;
      }

      // Refresh dashboard after adding/updating balances
      dispatch(fetchDashboard({}));

      // Clear draft entries after successful submission
      dispatch(clearDraftEntries());

      // Build success message
      const operations: string[] = [];
      if (totalCreated > 0)
        operations.push(
          `${totalCreated} balance${totalCreated > 1 ? "s" : ""} created`,
        );
      if (totalUpdated > 0)
        operations.push(
          `${totalUpdated} balance${totalUpdated > 1 ? "s" : ""} updated`,
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
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save balances",
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
    const activeAccounts = accounts.filter((a) => a.isActive);
    return activeAccounts.filter(
      (account) => !selectedAccountIds.includes(account.id),
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
                  Add Float Balances
                </Text>
                <Text className="text-gray-500 text-sm">
                  {entries.length} of{" "}
                  {accounts.filter((a) => a.isActive).length} accounts
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
                setEntries([createEmptyEntry()]);
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
                setEntries([createEmptyEntry()]);
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

        {/* Entry List */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {entries.map((entry, index) => {
            const isComplete =
              entry.accountId && entry.amount && entry.imageUrl;
            const hasError =
              errors[entry.id] && Object.keys(errors[entry.id]).length > 0;
            const hasMismatch =
              entry.validationResult && !entry.validationResult.isValid;

            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => setEditingEntryId(entry.id)}
                className={`bg-white rounded-2xl p-4 mb-3 border ${
                  hasError || hasMismatch
                    ? "border-red-300 bg-red-50"
                    : isComplete
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200"
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    {/* Status indicator */}
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                        hasError || hasMismatch
                          ? "bg-red-100"
                          : isComplete
                            ? "bg-green-100"
                            : "bg-gray-100"
                      }`}
                    >
                      {hasError || hasMismatch ? (
                        <AlertTriangle color="#EF4444" size={20} />
                      ) : isComplete ? (
                        <CheckCircle color="#22C55E" size={20} />
                      ) : (
                        <Text className="text-gray-500 font-bold">
                          {index + 1}
                        </Text>
                      )}
                    </View>

                    {/* Entry info */}
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">
                        {entry.accountName || "Select account"}
                      </Text>
                      <View className="flex-row items-center mt-0.5">
                        {entry.amount ? (
                          <Text className="text-gray-600 text-sm">
                            R {Number(entry.amount).toLocaleString()}
                          </Text>
                        ) : (
                          <Text className="text-gray-400 text-sm">
                            No amount
                          </Text>
                        )}
                        {entry.imageUrl && (
                          <View className="flex-row items-center ml-2">
                            <Camera color="#6B7280" size={12} />
                            <Text className="text-gray-500 text-xs ml-1">
                              Image
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="flex-row items-center">
                    {entries.length > 1 && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          removeEntry(entry.id);
                        }}
                        className="p-2"
                      >
                        <X color="#EF4444" size={18} />
                      </TouchableOpacity>
                    )}
                    <ChevronDown
                      color="#9CA3AF"
                      size={20}
                      style={{ transform: [{ rotate: "-90deg" }] }}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add More Button */}
          <TouchableOpacity
            onPress={() => {
              const newEntry = createEmptyEntry();
              setEntries((prev) => [...prev, newEntry]);
              setEditingEntryId(newEntry.id);
            }}
            className="bg-gray-100 rounded-2xl p-4 border-2 border-dashed border-gray-300 flex-row items-center justify-center"
          >
            <Plus color="#9CA3AF" size={24} />
            <Text className="text-gray-500 font-semibold ml-2">
              Add Another Balance
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Total and Submit Button - Fixed at bottom */}
        <View className="my-20 px-5 pb-6 pt-2 bg-gray-50">
          {/* Total Display */}
          <View className="flex-row justify-between items-center mb-3 px-2">
            <Text className="text-gray-600 font-medium">
              Total Float Balance:
            </Text>
            <Text className="text-xl font-bold text-gray-900">
              {formatCurrency(
                entries.reduce(
                  (sum, entry) => sum + (parseFloat(entry.amount) || 0),
                  0,
                ),
              )}
            </Text>
          </View>

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
                ? hasExistingEntries
                  ? "Updating..."
                  : "Submitting..."
                : hasExistingEntries
                  ? `Update ${entries.length} Balance${
                      entries.length > 1 ? "s" : ""
                    }`
                  : `Submit ${entries.length} Balance${
                      entries.length > 1 ? "s" : ""
                    }`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Entry Form Modal */}
      <Modal
        visible={editingEntryId !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseEntryModal}
      >
        {(() => {
          const entry = entries.find((e) => e.id === editingEntryId);
          if (!entry) return null;
          const entryIndex = entries.findIndex((e) => e.id === editingEntryId);

          return (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1 bg-white"
            >
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-5 pt-4 pb-3 border-b border-gray-200">
                <TouchableOpacity
                  onPress={handleCloseEntryModal}
                  className="p-2"
                >
                  <X color="#6B7280" size={24} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">
                  Balance {entryIndex + 1}
                </Text>
                <TouchableOpacity
                  onPress={handleCloseEntryModal}
                  className="bg-brand-red px-4 py-2 rounded-xl"
                >
                  <Text className="text-white font-semibold">Done</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Content */}
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Account Selection */}
                <View className="mb-5">
                  <Text className="text-gray-700 font-semibold mb-2">
                    Account *
                  </Text>
                  <TouchableOpacity
                    onPress={() => setAccountPickerVisible(entry.id)}
                    className={`bg-gray-50 rounded-xl px-4 py-3.5 flex-row justify-between items-center ${
                      errors[entry.id]?.account
                        ? "border-2 border-red-500"
                        : "border border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-base ${
                        entry.accountName ? "text-gray-800" : "text-gray-400"
                      }`}
                    >
                      {entry.accountName || "Select account"}
                    </Text>
                    <ChevronDown color="#6B7280" size={20} />
                  </TouchableOpacity>
                  {errors[entry.id]?.account && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors[entry.id].account}
                    </Text>
                  )}
                </View>

                {/* Amount */}
                <View className="mb-5">
                  <Text className="text-gray-700 font-semibold mb-2">
                    Amount *
                  </Text>
                  <TextInput
                    value={
                      entry.amount ? Number(entry.amount).toLocaleString() : ""
                    }
                    onChangeText={(value) =>
                      handleAmountChange(entry.id, value)
                    }
                    placeholder="0"
                    keyboardType="number-pad"
                    className={`bg-gray-50 rounded-xl px-4 py-3.5 text-gray-800 text-xl ${
                      errors[entry.id]?.amount || errors[entry.id]?.validation
                        ? "border-2 border-red-500"
                        : entry.validationResult?.isValid
                          ? "border-2 border-green-500"
                          : "border border-gray-200"
                    }`}
                  />
                  {errors[entry.id]?.amount && (
                    <Text className="text-red-500 text-sm mt-1">
                      {errors[entry.id].amount}
                    </Text>
                  )}

                  {/* Validation Status */}
                  {entry.validationResult && (
                    <View
                      className={`mt-3 p-3 rounded-xl flex-row items-start ${
                        entry.validationResult.isValid
                          ? "bg-green-50"
                          : "bg-red-50"
                      }`}
                    >
                      {entry.validationResult.isValid ? (
                        <CheckCircle color="#22C55E" size={20} />
                      ) : (
                        <AlertTriangle color="#EF4444" size={20} />
                      )}
                      <Text
                        className={`ml-2 text-sm flex-1 ${
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
                  {entry.extractedBalance !== null &&
                    !entry.validationResult && (
                      <Text className="text-gray-500 text-sm mt-2">
                        Extracted from image: R{" "}
                        {entry.extractedBalance.toLocaleString()}
                      </Text>
                    )}
                </View>

                {/* Image Section */}
                <View className="mb-5">
                  <Text className="text-gray-700 font-semibold mb-2">
                    Image *
                  </Text>
                  {entry.imageUrl ? (
                    <View className="relative">
                      <Image
                        source={{ uri: entry.imageUrl }}
                        className="w-full h-48 rounded-xl"
                        resizeMode="cover"
                      />
                      {/* Extraction loading overlay */}
                      {entry.isExtracting && (
                        <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
                          <ActivityIndicator color="white" size="large" />
                          <Text className="text-white text-sm mt-2">
                            Extracting balance...
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => removeImage(entry.id)}
                        className="absolute top-3 right-3 bg-red-500 p-2 rounded-full"
                      >
                        <X color="white" size={18} />
                      </TouchableOpacity>
                      {/* Extraction status badge */}
                      {!entry.isExtracting &&
                        entry.extractedBalance !== null && (
                          <View className="absolute top-3 left-3 bg-green-500 px-3 py-1.5 rounded-full flex-row items-center">
                            <CheckCircle color="white" size={14} />
                            <Text className="text-white text-sm ml-1 font-semibold">
                              R {entry.extractedBalance.toLocaleString()}
                            </Text>
                          </View>
                        )}
                    </View>
                  ) : (
                    <View>
                      <View className="flex-row" style={{ gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => takePhoto(entry.id)}
                          className={`flex-1 bg-gray-50 rounded-xl py-6 items-center ${
                            errors[entry.id]?.image
                              ? "border-2 border-red-500"
                              : "border border-gray-200"
                          }`}
                        >
                          <Camera
                            color={
                              errors[entry.id]?.image ? "#EF4444" : "#6B7280"
                            }
                            size={32}
                          />
                          <Text
                            className={`text-sm mt-2 ${
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
                          className={`flex-1 bg-gray-50 rounded-xl py-6 items-center ${
                            errors[entry.id]?.image
                              ? "border-2 border-red-500"
                              : "border border-gray-200"
                          }`}
                        >
                          <ImageIcon
                            color={
                              errors[entry.id]?.image ? "#EF4444" : "#6B7280"
                            }
                            size={32}
                          />
                          <Text
                            className={`text-sm mt-2 ${
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
                        <Text className="text-red-500 text-sm mt-2 text-center">
                          {errors[entry.id].image}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          );
        })()}
      </Modal>

      {/* Account Picker Modal */}
      <Modal
        visible={accountPickerVisible !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setAccountPickerVisible(null)}
      >
        <View style={{ flex: 1 }} className="bg-black/50 justify-end">
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setAccountPickerVisible(null)}
          />
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
                  <Text className="text-white font-semibold">Add Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={accounts}
                keyExtractor={(item) => item.id.toString()}
                nestedScrollEnabled={true}
                renderItem={({ item }) => {
                  const currentEntry = entries.find(
                    (e) => e.id === accountPickerVisible,
                  );
                  const isSelected = currentEntry?.accountId === item.id;
                  const isAlreadySelected = entries.some(
                    (e) =>
                      e.accountId === item.id && e.id !== accountPickerVisible,
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
                          {item.accountType}
                        </Text>
                      </View>
                      {isSelected && <Check color="#DC2626" size={20} />}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
