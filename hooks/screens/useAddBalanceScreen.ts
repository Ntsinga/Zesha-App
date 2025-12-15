import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createBalancesBulk,
  fetchBalances,
  clearDraftEntries,
} from "../../store/slices/balancesSlice";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import type { AppDispatch, RootState } from "../../store";
import type { ShiftEnum, Account } from "../../types";

export interface BalanceValidationResult {
  isValid: boolean;
  extractedBalance: number | null;
  inputBalance: number;
  difference: number | null;
  message: string;
}

export interface BalanceEntry {
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

  // Selectors
  const { items: accounts, isLoading: accountsLoading } = useSelector(
    (state: RootState) => state.accounts
  );
  const { items: balances, draftEntries } = useSelector(
    (state: RootState) => state.balances
  );

  // State
  const [entries, setEntries] = useState<BalanceEntry[]>([createEmptyEntry()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const [currentShift, setCurrentShift] = useState<ShiftEnum>("AM");
  const [isInitialized, setIsInitialized] = useState(false);
  const [accountPickerVisible, setAccountPickerVisible] = useState<
    string | null
  >(null);

  // Today's date
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Fetch data on mount
  useEffect(() => {
    dispatch(fetchAccounts({ is_active: true }));
    dispatch(fetchBalances({ date_from: today, date_to: today }));
  }, [dispatch, today]);

  // Initialize entries from existing balances or draft entries
  useEffect(() => {
    if (isInitialized || accountsLoading) return;

    const todayBalances = balances.filter(
      (bal) => bal.date.startsWith(today) && bal.shift === currentShift
    );

    if (todayBalances.length > 0) {
      const prepopulatedEntries: BalanceEntry[] = todayBalances.map((bal) => {
        let accountName = "";
        if (bal.account) {
          accountName = bal.account.name;
        } else {
          const account = accounts.find((acc) => acc.id === bal.account_id);
          accountName = account?.name || `Account ${bal.account_id}`;
        }

        let imageUri = "";
        if (bal.image_data) {
          imageUri = `data:image/jpeg;base64,${bal.image_data}`;
        } else if (bal.image_url) {
          imageUri = bal.image_url;
        }

        return {
          id: `existing-${bal.id}`,
          accountId: bal.account_id,
          accountName: accountName,
          shift: bal.shift,
          amount: bal.amount.toString(),
          imageUrl: imageUri,
          extractedBalance: null,
          isExtracting: false,
          validationResult: null,
        };
      });

      setEntries(prepopulatedEntries);
      setIsInitialized(true);
    } else if (draftEntries.length > 0) {
      setEntries(draftEntries);
      setIsInitialized(true);
    } else {
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

  // Active accounts
  const activeAccounts = useMemo(
    () => accounts.filter((acc) => acc.is_active),
    [accounts]
  );

  // Get available accounts for a specific entry (exclude already selected)
  const getAvailableAccounts = useCallback(
    (entryId: string) => {
      const selectedAccountIds = entries
        .filter((e) => e.id !== entryId && e.accountId)
        .map((e) => e.accountId);

      return activeAccounts.filter(
        (acc) => !selectedAccountIds.includes(acc.id)
      );
    },
    [entries, activeAccounts]
  );

  // Missing accounts (active accounts without entries)
  const missingAccounts = useMemo(() => {
    const selectedAccountIds = entries
      .filter((e) => e.accountId !== null)
      .map((e) => e.accountId);
    return activeAccounts.filter(
      (account) => !selectedAccountIds.includes(account.id)
    );
  }, [entries, activeAccounts]);

  // Update entry field
  const updateEntry = useCallback(
    (id: string, field: keyof BalanceEntry, value: any) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === id ? { ...entry, [field]: value } : entry
        )
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
    [errors]
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
                entry.extractedBalance - inputBalance
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
        })
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
    [errors]
  );

  // Select account for entry
  const selectAccount = useCallback(
    (entryId: string, account: Account) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? { ...entry, accountId: account.id, accountName: account.name }
            : entry
        )
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
    [errors]
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
    [entries.length]
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
          : entry
      )
    );
  }, []);

  // Handle image upload (web)
  const handleImageUpload = useCallback(
    (entryId: string, file: File, previewUrl: string) => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                imageUrl: previewUrl,
                imageFile: file,
                isExtracting: false, // Could add OCR extraction here
              }
            : entry
        )
      );
    },
    []
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
    return isValid;
  }, [entries]);

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
            account_id: entry.accountId!,
            shift: currentShift,
            amount: parseFloat(entry.amount),
            source: "mobile_app" as const,
            date: today,
            image_data: imageData,
          };
        })
      );

      const result = await dispatch(
        createBalancesBulk({ balances: balanceDataArray })
      ).unwrap();

      // Refresh data
      dispatch(fetchDashboard({}));
      dispatch(clearDraftEntries());

      if (result.total_failed > 0) {
        return {
          success: true,
          message: `${result.total_created} of ${result.total_submitted} balances created successfully. ${result.total_failed} failed.`,
          totalCreated: result.total_created,
          totalFailed: result.total_failed,
        };
      } else {
        return {
          success: true,
          message: `${result.total_created} balance${
            result.total_created > 1 ? "s" : ""
          } added successfully!`,
          totalCreated: result.total_created,
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
  }, [entries, currentShift, today, dispatch, validateEntries]);

  return {
    // State
    entries,
    errors,
    isSubmitting,
    accountsLoading,
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
