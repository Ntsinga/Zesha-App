import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import {
  createBalancesBulk,
  fetchBalances,
  clearDraftEntries,
} from "../../store/slices/balancesSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { selectCompanyId } from "../../store/slices/authSlice";
import {
  extractBalanceFromImage,
  validateBalance,
} from "../../services/balanceExtractor";
import type { AppDispatch, RootState } from "../../store";
import type {
  ShiftEnum,
  Account,
  DraftBalanceEntry,
  BalanceValidationResult,
} from "@/types";

// Re-export for consumers that import from this hook
export type { BalanceValidationResult };

// BalanceEntry is the same as DraftBalanceEntry
export type BalanceEntry = DraftBalanceEntry;

const createEmptyEntry = (shift: ShiftEnum = "AM"): BalanceEntry => ({
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

export function useAddBalanceScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const params = useLocalSearchParams();
  const shiftFromParams = (params.shift as ShiftEnum) || null;

  // Selectors
  const companyId = useSelector(selectCompanyId);
  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts,
  );
  const {
    items: balances,
    draftEntries,
    isLoading: balancesLoading,
  } = useSelector((state: RootState) => state.balances);

  // Combined loading state - wait for both to finish
  const isDataLoading = accountsLoading || balancesLoading;

  // Today's date
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // State
  const [entries, setEntries] = useState<BalanceEntry[]>([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {},
  );
  const [currentShift, setCurrentShift] = useState<ShiftEnum>("AM");
  const [isInitialized, setIsInitialized] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState<
    string | null
  >(null);

  // Fetch data on mount - force refresh to get latest data
  useEffect(() => {
    dispatch(fetchAccounts({ isActive: true, forceRefresh: true }));
    dispatch(
      fetchBalances({ dateFrom: today, dateTo: today, forceRefresh: true }),
    );
  }, [dispatch, today]);

  // Compute which shift has data
  const { hasAMData, hasPMData } = useMemo(() => {
    const amBalances = balances.filter(
      (bal) => bal.date.startsWith(today) && bal.shift === "AM",
    );
    const pmBalances = balances.filter(
      (bal) => bal.date.startsWith(today) && bal.shift === "PM",
    );
    return {
      hasAMData: amBalances.length > 0,
      hasPMData: pmBalances.length > 0,
    };
  }, [balances, today]);

  // Determine the correct shift to use
  const correctShift = useMemo((): ShiftEnum => {
    // If shift is provided via params, use it
    if (shiftFromParams) return shiftFromParams;
    // Otherwise, determine from data
    if (hasPMData && !hasAMData) return "PM";
    if (hasAMData && !hasPMData) return "AM";
    return "AM"; // Default to AM if both or neither have data
  }, [hasAMData, hasPMData, shiftFromParams]);

  // Initialize entries from existing balances or draft entries
  useEffect(() => {
    if (isInitialized || isDataLoading || accounts.length === 0) return;

    // Auto-select the correct shift based on data
    setCurrentShift(correctShift);

    console.log("[AddBalance] Prepopulation check:", {
      balancesCount: balances.length,
      today,
      correctShift,
      accountsLoaded: accounts.length,
    });

    // Use correctShift for prepopulation
    const todayBalances = balances.filter(
      (bal) => bal.date.startsWith(today) && bal.shift === correctShift,
    );

    console.log("[AddBalance] Today balances for shift:", {
      shift: correctShift,
      count: todayBalances.length,
      balances: todayBalances.map((b) => ({
        accountId: b.accountId,
        amount: b.amount,
      })),
    });

    if (todayBalances.length > 0) {
      const prepopulatedEntries: BalanceEntry[] = todayBalances.map((bal) => {
        let accountName = "";
        if (bal.account) {
          accountName = bal.account.name;
        } else {
          const account = accounts.find((acc) => acc.id === bal.accountId);
          accountName = account?.name || `Account ${bal.accountId}`;
        }

        let imageUri = "";
        if (bal.imageData) {
          imageUri = `data:image/jpeg;base64,${bal.imageData}`;
        } else if (bal.imageUrl) {
          imageUri = bal.imageUrl;
        }

        return {
          id: `existing-${bal.id}`,
          accountId: bal.accountId,
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
        "[AddBalance] Prepopulating with existing balances:",
        prepopulatedEntries.length,
      );
      setEntries(prepopulatedEntries);
      setIsInitialized(true);
    } else if (draftEntries.length > 0) {
      console.log("[AddBalance] Restoring draft entries:", draftEntries.length);
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
    correctShift,
    isInitialized,
    isDataLoading,
    accounts,
  ]);

  // Active accounts
  const activeAccounts = useMemo(
    () => accounts.filter((acc) => acc.isActive),
    [accounts],
  );

  // Get available accounts for a specific entry (exclude already selected)
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

  // Missing accounts (active accounts without entries)
  const missingAccounts = useMemo(() => {
    const selectedAccountIds = entries
      .filter((e) => e.accountId !== null)
      .map((e) => e.accountId);
    return activeAccounts.filter(
      (account) => !selectedAccountIds.includes(account.id),
    );
  }, [entries, activeAccounts]);

  // Update entry field
  const updateEntry = useCallback(
    (id: string, field: keyof BalanceEntry, value: any) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry,
        ),
      );

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
    },
    [errors],
  );

  // Handle amount change with validation
  const handleAmountChange = useCallback(
    (entryId: string, value: string) => {
      const cleanValue = value.replace(/[,\s]/g, "");
      if (cleanValue && !/^\d*\.?\d*$/.test(cleanValue)) {
        return;
      }

      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;
          const updatedEntry = { ...entry, amount: cleanValue };

          // Validate against extracted balance if available
          if (entry.extractedBalance !== null && cleanValue.trim()) {
            const inputBalance = parseFloat(cleanValue);
            if (!isNaN(inputBalance)) {
              const difference = Math.abs(
                entry.extractedBalance - inputBalance,
              );
              const isValid = difference < 0.01; // Allow small float differences
              updatedEntry.validationResult = {
                isValid,
                extractedBalance: entry.extractedBalance,
                inputBalance,
                difference,
                message: isValid ? "Balance matches" : "Balance mismatch",
              };
            }
          } else {
            updatedEntry.validationResult = null;
          }

          return updatedEntry;
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
        // Extract balance from the image
        const result = await extractBalanceFromImage(previewUrl);

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
          console.warn("[Web Balance] Extraction unsuccessful:", result.error);
        }
      } catch (error) {
        console.error("[Web Balance] Exception during extraction:", error);
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

      if (Object.keys(entryErrors).length > 0) {
        newErrors[entry.id] = entryErrors;
      }
    });

    setErrors(newErrors);

    // Check if all active accounts have balances
    if (missingAccounts.length > 0) {
      isValid = false;
    }

    return isValid;
  }, [entries, missingAccounts]);

  // Submit all entries
  const handleSubmit = useCallback(async (): Promise<{
    success: boolean;
    message: string;
    totalCreated?: number;
    totalFailed?: number;
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
      const balanceDataArray = await Promise.all(
        entries.map(async (entry) => {
          let imageData: string | null = null;

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
            // Already base64
            imageData = entry.imageUrl.split(",")[1];
          }

          return {
            companyId: companyId,
            accountId: entry.accountId!,
            shift: currentShift,
            amount: parseFloat(entry.amount),
            source: "mobile_app" as const,
            date: today,
            imageData: imageData,
          };
        }),
      );

      const result = await dispatch(
        createBalancesBulk({ balances: balanceDataArray }),
      ).unwrap();

      // Refresh data
      dispatch(fetchDashboard({}));
      dispatch(clearDraftEntries());

      if (result.totalFailed > 0) {
        return {
          success: true,
          message: `${result.totalCreated} of ${result.totalSubmitted} balances created successfully. ${result.totalFailed} failed.`,
          totalCreated: result.totalCreated,
          totalFailed: result.totalFailed,
        };
      } else {
        return {
          success: true,
          message: `${result.totalCreated} balance${
            result.totalCreated > 1 ? "s" : ""
          } added successfully!`,
          totalCreated: result.totalCreated,
          totalFailed: 0,
        };
      }
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to add balances",
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
    missingAccounts,
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
