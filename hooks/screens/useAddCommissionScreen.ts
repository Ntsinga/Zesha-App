import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocalSearchParams } from "expo-router";
import {
  createCommissionsBulk,
  updateCommissionsBulk,
  fetchCommissions,
  saveDraftEntries,
  clearDraftEntries,
} from "../../store/slices/commissionsSlice";
import { useNetworkContext } from "@/hooks/useNetworkStatus";
import { queueOfflineMutation } from "@/utils/offlineQueue";
import { fetchDashboard } from "../../store/slices/dashboardSlice";
import { fetchAccounts } from "../../store/slices/accountsSlice";
import { selectEffectiveCompanyId } from "../../store/slices/authSlice";
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
  // Shift is passed from the balance menu screen - use it as-is
  const currentShift: ShiftEnum = (params.shift as ShiftEnum) || "AM";

  // Selectors
  const companyId = useSelector(selectEffectiveCompanyId);
  const { isConnected } = useNetworkContext();
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

  // Initialize entries from existing commissions
  useEffect(() => {
    if (isInitialized || isDataLoading || accounts.length === 0) return;

    // Use currentShift (from params) for prepopulation
    const shiftCommissions = commissions.filter(
      (com) => com.date.startsWith(today) && com.shift === currentShift,
    );

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
      setEntries(draftEntries as CommissionEntry[]);
      setIsInitialized(true);
    } else {
      setEntries([createEmptyEntry(currentShift)]);
      setIsInitialized(true);
    }
  }, [
    commissions,
    draftEntries,
    today,
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

    // Offline queue — only supports creating new entries (not updates)
    if (!isConnected) {
      const existingEntries = entries.filter((e) => e.id.startsWith("existing-"));
      if (existingEntries.length > 0) {
        return {
          success: false,
          message: "Updating existing commissions requires an internet connection.",
        };
      }

      const newEntries = entries.filter((e) => !e.id.startsWith("existing-"));
      const imageUris: string[] = [];
      const commissionsData = newEntries.map((entry) => {
        if (entry.imageUrl) imageUris.push(entry.imageUrl);
        return {
          companyId,
          accountId: entry.accountId!,
          shift: currentShift,
          amount: parseFloat(entry.amount),
          date: today,
        };
      });

      try {
        await queueOfflineMutation({
          entityType: "commissionBulk",
          method: "POST",
          endpoint: "/commissions/bulk",
          payload: { commissions: commissionsData },
          imageUris: imageUris.length > 0 ? imageUris : undefined,
        });
        dispatch(clearDraftEntries());
        return {
          success: true,
          message: `${newEntries.length} commission(s) queued for sync when back online.`,
        };
      } catch {
        return { success: false, message: "Failed to queue commissions for offline sync." };
      }
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
        const commissionsData = await Promise.all(
          newEntries.map(async (entry) => {
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

        const createResult = await dispatch(
          createCommissionsBulk(commissionsData),
        ).unwrap();

        // createCommissionsBulk returns Commission[], count the successes
        totalCreated = Array.isArray(createResult) ? createResult.length : 0;
      }

      // Clear draft entries after successful submission
      dispatch(clearDraftEntries());

      // Refresh dashboard
      await dispatch(fetchDashboard({})).unwrap();

      // Build success message
      const operations: string[] = [];
      if (totalCreated > 0) operations.push(`${totalCreated} created`);
      if (totalUpdated > 0) operations.push(`${totalUpdated} updated`);

      if (totalFailed > 0) {
        return {
          success: true,
          message: `${operations.join(", ")}. ${totalFailed} failed.`,
        };
      } else {
        return {
          success: true,
          message: `Commissions successfully ${operations.join(" and ")}!`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || "Failed to save commissions",
      };
    } finally {
      setIsSubmitting(false);
    }
  }, [entries, currentShift, today, companyId, dispatch, validateEntries, isConnected]);

  // Compute if we have existing entries (for update vs create UI)
  const hasExistingEntries = useMemo(
    () => entries.some((e) => e.id.startsWith("existing-")),
    [entries],
  );

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
    hasExistingEntries,

    // Actions
    updateEntry,
    handleAmountChange,
    selectAccount,
    addEntry,
    removeEntry,
    clearImage,
    handleImageUpload,
    handleSubmit,
    setAccountPickerVisible,
  };
}
