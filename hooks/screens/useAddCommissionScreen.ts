import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import {
  createCommissionsBulk,
  fetchCommissions,
  saveDraftEntries,
  clearDraftEntries,
} from "../../store/slices/commissionsSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { selectCompanyId } from "../../store/slices/authSlice";
import {
  extractBalanceFromImage,
  validateBalance,
} from "../../services/balanceExtractor";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum, Account } from "../../types";

export interface BalanceValidationResult {
  isValid: boolean;
  extractedBalance: number | null;
  inputBalance: number;
  difference: number | null;
  message: string;
}

export interface CommissionEntry {
  id: string;
  accountId: number | null;
  accountName: string;
  shift: ShiftEnum;
  amount: string;
  imageUrl: string;
  imageFile?: File; // For web file upload
  extractedBalance: number | null;
  isExtracting: boolean;
  validationResult: BalanceValidationResult | null;
}

const createEmptyEntry = (shift: ShiftEnum = "AM"): CommissionEntry => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  accountId: null,
  accountName: "",
  shift,
  amount: "",
  imageUrl: "",
  extractedBalance: null,
  isExtracting: false,
  validationResult: null,
});

export function useAddCommissionScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const params = useLocalSearchParams();
  const shiftFromParams = (params.shift as ShiftEnum) || null;

  // Selectors
  const companyId = useSelector(selectCompanyId);
  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts,
  );
  const {
    items: commissions,
    draftEntries,
    isLoading: commissionsLoading,
  } = useSelector((state: RootState) => state.commissions);

  // Combined loading state - wait for both to finish
  const isDataLoading = accountsLoading || commissionsLoading;

  // Today's date
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // State
  const [entries, setEntries] = useState<CommissionEntry[]>([
    createEmptyEntry(),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [currentShift, setCurrentShift] = useState<ShiftEnum>("AM");
  const [isInitialized, setIsInitialized] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState<
    string | null
  >(null);

  // Fetch data on mount - force refresh to get latest commissions
  useEffect(() => {
    dispatch(fetchAccounts({ isActive: true, forceRefresh: true }));
    dispatch(
      fetchCommissions({ dateFrom: today, dateTo: today, forceRefresh: true }),
    );
  }, [dispatch, today]);

  // Compute which shift has data
  const { hasAMData, hasPMData } = useMemo(() => {
    const amCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === "AM",
    );
    const pmCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === "PM",
    );
    return {
      hasAMData: amCommissions.length > 0,
      hasPMData: pmCommissions.length > 0,
    };
  }, [commissions, today]);

  // Determine the correct shift to use
  const correctShift = useMemo((): ShiftEnum => {
    // If shift is provided via params, use it
    if (shiftFromParams) return shiftFromParams;
    // Otherwise, determine from data
    if (hasPMData && !hasAMData) return "PM";
    if (hasAMData && !hasPMData) return "AM";
    return "AM"; // Default to AM if both or neither have data
  }, [hasAMData, hasPMData, shiftFromParams]);

  // Initialize entries from existing commissions
  useEffect(() => {
    if (isInitialized || isDataLoading || accounts.length === 0) return;

    // Auto-select the correct shift based on data
    setCurrentShift(correctShift);

    console.log("[AddCommission] Prepopulation check:", {
      commissionsCount: commissions.length,
      today,
      correctShift,
      currentShift,
      accountsLoaded: accounts.length,
    });

    // Use correctShift for prepopulation
    const shiftCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === correctShift,
    );

    console.log("[AddCommission] Shift commissions:", {
      shift: currentShift,
      count: shiftCommissions.length,
      commissions: shiftCommissions.map((c) => ({
        accountId: c.accountId,
        amount: c.amount,
        date: c.date,
      })),
    });

    if (shiftCommissions.length > 0) {
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
            shift: correctShift,
            amount: com.amount.toString(),
            imageUrl: imageUri,
            extractedBalance: null,
            isExtracting: false,
            validationResult: null,
          };
        },
      );

      console.log(
        "[AddCommission] Prepopulating entries:",
        prepopulatedEntries.length,
      );
      setEntries(prepopulatedEntries);
      setIsInitialized(true);
    } else if (draftEntries.length > 0) {
      // Load draft entries if no existing commissions
      console.log(
        "[AddCommission] Loading draft entries:",
        draftEntries.length,
      );
      setEntries(draftEntries as CommissionEntry[]);
      setIsInitialized(true);
    } else {
      console.log(
        "[AddCommission] No existing commissions or drafts, initializing empty",
      );
      setEntries([createEmptyEntry(correctShift)]);
      setIsInitialized(true);
    }
  }, [
    commissions,
    draftEntries,
    today,
    correctShift,
    currentShift,
    isInitialized,
    isDataLoading,
    accounts,
  ]);

  // Auto-save draft entries to Redux whenever they change (only if not from existing commissions)
  useEffect(() => {
    if (
      isInitialized &&
      entries.length > 0 &&
      !entries.some((e) => e.id.startsWith("existing-"))
    ) {
      dispatch(saveDraftEntries(entries as any[]));
    }
  }, [entries, dispatch, isInitialized]);

  // Active accounts
  const activeAccounts = useMemo(
    () => accounts.filter((acc) => acc.isActive),
    [accounts],
  );

  // Get available accounts for a specific entry
  const getAvailableAccounts = useCallback(
    (entryId: string) => {
      const selectedAccountIds = entries
        .filter((e) => e.id !== entryId && e.accountId)
        .map((e) => e.accountId);

      return activeAccounts.filter(
        (acc) => !selectedAccountIds.includes(acc.id),
      );
    },
    [entries, activeAccounts],
  );

  // Update entry field
  const updateEntry = useCallback(
    (id: string, field: keyof CommissionEntry, value: any) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry,
        ),
      );

      const errorField = field === "accountId" ? "accountName" : field;
      if (errors[id]?.[errorField]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors[id]) {
            delete newErrors[id][errorField];
          }
          return newErrors;
        });
      }
    },
    [errors],
  );

  // Handle amount change with validation
  const handleAmountChange = useCallback(
    (entryId: string, value: string) => {
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;

          let validationResult: BalanceValidationResult | null = null;

          // Validate against extracted balance if available
          if (entry.extractedBalance !== null && value.trim()) {
            const inputBalance = parseFloat(value);
            if (!isNaN(inputBalance)) {
              const difference = Math.abs(
                entry.extractedBalance - inputBalance,
              );
              const isValid = difference < 0.01;
              validationResult = {
                isValid,
                extractedBalance: entry.extractedBalance,
                inputBalance,
                difference,
                message: isValid ? "Amount matches" : "Amount mismatch",
              };
            }
          }

          return {
            ...entry,
            amount: value,
            validationResult,
          };
        }),
      );

      if (errors[entryId]?.amount) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors[entryId]) {
            delete newErrors[entryId].amount;
          }
          return newErrors;
        });
      }
    },
    [errors],
  );

  // Select account for entry
  const selectAccount = useCallback(
    (entryId: string, account: Account) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, accountId: account.id, accountName: account.name }
            : entry,
        ),
      );

      if (errors[entryId]?.accountName) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          if (newErrors[entryId]) {
            delete newErrors[entryId].accountName;
          }
          return newErrors;
        });
      }

      setAccountPickerVisible(null);
    },
    [errors],
  );

  // Add new entry
  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, createEmptyEntry(currentShift)]);
  }, [currentShift]);

  // Remove entry
  const removeEntry = useCallback(
    (id: string) => {
      if (entries.length > 1) {
        setEntries((prev) => prev.filter((entry) => entry.id !== id));
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[id];
          return newErrors;
        });
      }
    },
    [entries.length],
  );

  // Clear image from entry
  const clearImage = useCallback((entryId: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              imageUrl: "",
              imageFile: undefined,
              extractedBalance: null,
              validationResult: null,
            }
          : entry,
      ),
    );
  }, []);

  // Handle image upload (web)
  const handleImageUpload = useCallback(
    async (entryId: string, file: File, previewUrl: string) => {
      // Set image and extracting state
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                imageUrl: previewUrl,
                imageFile: file,
                isExtracting: true,
                validationResult: null,
              }
            : entry,
        ),
      );

      try {
        // Extract commission from the image
        const result = await extractBalanceFromImage(previewUrl, "commission");

        setEntries((prev) =>
          prev.map((entry) => {
            if (entry.id !== entryId) return entry;

            const extractedBalance = result.balance;

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
          console.warn(
            "[Web Commission] Extraction unsuccessful:",
            result.error,
          );
        }
      } catch (error) {
        console.error("[Web Commission] Exception during extraction:", error);
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? { ...entry, isExtracting: false, extractedBalance: null }
              : entry,
          ),
        );
      }
    },
    [],
  );

  // Change shift and reinitialize
  const handleShiftChange = useCallback((shift: ShiftEnum) => {
    setCurrentShift(shift);
    setIsInitialized(false);
    setEntries([createEmptyEntry(shift)]);
  }, []);

  // Validate all entries
  const validateEntries = useCallback((): boolean => {
    const newErrors: Record<string, Record<string, string>> = {};
    let isValid = true;

    entries.forEach((entry) => {
      const entryErrors: Record<string, string> = {};

      if (!entry.accountId) {
        entryErrors.accountName = "Account is required";
        isValid = false;
      }

      if (!entry.imageUrl) {
        entryErrors.imageUrl = "Image is required";
        isValid = false;
      }

      if (!entry.amount || isNaN(parseFloat(entry.amount))) {
        entryErrors.amount = "Valid amount is required";
        isValid = false;
      } else if (parseFloat(entry.amount) < 0) {
        entryErrors.amount = "Amount must be positive";
        isValid = false;
      }

      if (Object.keys(entryErrors).length > 0) {
        newErrors[entry.id] = entryErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [entries]);

  // Submit all entries
  const handleSubmit = useCallback(async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    if (!validateEntries()) {
      return { success: false, message: "Please fix validation errors" };
    }

    if (!companyId) {
      return {
        success: false,
        message: "Company not found. Please log in again.",
      };
    }

    setIsSubmitting(true);

    try {
      const commissionsData = await Promise.all(
        entries.map(async (entry) => {
          let imageData: string | undefined;

          // Handle file upload for web
          if (entry.imageFile) {
            const reader = new FileReader();
            imageData = await new Promise((resolve) => {
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(",")[1];
                resolve(base64);
              };
              reader.readAsDataURL(entry.imageFile!);
            });
          } else if (
            entry.imageUrl &&
            entry.imageUrl.startsWith("data:image")
          ) {
            imageData = entry.imageUrl.split(",")[1];
          }

          return {
            companyId: companyId,
            accountId: entry.accountId!,
            shift: currentShift,
            amount: parseFloat(entry.amount),
            date: today,
            imageData: imageData,
          };
        }),
      );

      await dispatch(createCommissionsBulk(commissionsData)).unwrap();

      // Clear draft entries after successful submission
      dispatch(clearDraftEntries());

      // Refresh dashboard
      await dispatch(fetchDashboard({})).unwrap();

      return {
        success: true,
        message: "Commissions saved successfully!",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to save commissions",
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [entries, currentShift, today, companyId, dispatch, validateEntries]);

  return {
    // State
    entries,
    errors,
    isSubmitting,
    accountsLoading: isDataLoading,
    isInitialized,
    currentShift,
    today,
    accountPickerVisible,

    // Computed
    activeAccounts,
    getAvailableAccounts,

    // Actions
    updateEntry,
    handleAmountChange,
    selectAccount,
    addEntry,
    removeEntry,
    clearImage,
    handleImageUpload,
    handleShiftChange,
    handleSubmit,
    setAccountPickerVisible,
  };
}
