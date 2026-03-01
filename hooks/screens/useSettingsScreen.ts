import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCompanyInfoList,
  updateCompanyInfo,
  createCompanyInfo,
} from "../../store/slices/companyInfoSlice";
import { formatCurrency } from "../../utils/formatters";
import type { AppDispatch, RootState } from "../../store";
import type { CompanyInfo } from "../../types";

// Common currency codes
export const CURRENCIES = [
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "ZAR", name: "South African Rand" },
];

export function useSettingsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    items: companies,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.companyInfo);

  // Fallback: use dashboard companyInfo if companyInfoSlice has no items yet
  const dashboardCompanyInfo = useSelector(
    (state: RootState) => state.dashboard.companyInfo ?? undefined,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

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

  const addEmail = (): { success: boolean; message?: string } => {
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail) return { success: false };

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, message: "Please enter a valid email address." };
    }

    if (emails.includes(trimmedEmail)) {
      return { success: false, message: "This email is already added." };
    }

    setEmails([...emails, trimmedEmail]);
    setNewEmail("");
    return { success: true };
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter((e) => e !== emailToRemove));
  };

  const validateForm = (): { valid: boolean; message?: string } => {
    if (!name.trim()) {
      return { valid: false, message: "Company name is required." };
    }

    const workingCapital = parseFloat(totalWorkingCapital) || 0;
    const outstanding = parseFloat(outstandingBalance) || 0;

    if (workingCapital < 0 || outstanding < 0) {
      return { valid: false, message: "Amounts cannot be negative." };
    }

    return { valid: true };
  };

  const handleSave = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    const validation = validateForm();
    if (!validation.valid) {
      return { success: false, message: validation.message! };
    }

    setIsSaving(true);

    try {
      const data = {
        name: name.trim(),
        totalWorkingCapital: parseFloat(totalWorkingCapital) || 0,
        outstandingBalance: parseFloat(outstandingBalance) || 0,
        currency,
        description: description.trim() || undefined,
        emails: emails.length > 0 ? emails : undefined,
      };

      if (company) {
        await dispatch(updateCompanyInfo({ id: company.id, data })).unwrap();
      } else {
        await dispatch(createCompanyInfo(data)).unwrap();
      }

      dispatch(fetchCompanyInfoList({}));

      return {
        success: true,
        message: company
          ? "Company settings updated successfully!"
          : "Company created successfully!",
      };
    } catch (err) {
      return {
        success: false,
        message: typeof err === "string" ? err : err instanceof Error ? err.message : "Failed to save settings",
      };
    } finally {
      setIsSaving(false);
    }
  };

  const getFormattedWorkingCapital = () => {
    const value = parseFloat(totalWorkingCapital) || 0;
    return formatCurrency(value, currency);
  };

  const getFormattedOutstandingBalance = () => {
    const value = parseFloat(outstandingBalance) || 0;
    return formatCurrency(value, currency);
  };

  return {
    // State
    isLoading,
    error,
    refreshing,
    isSaving,
    company,

    // Form state
    name,
    setName,
    totalWorkingCapital,
    setTotalWorkingCapital,
    outstandingBalance,
    setOutstandingBalance,
    currency,
    setCurrency,
    description,
    setDescription,
    emails,
    newEmail,
    setNewEmail,
    showCurrencyPicker,
    setShowCurrencyPicker,

    // Actions
    onRefresh,
    addEmail,
    removeEmail,
    handleSave,

    // Formatters
    getFormattedWorkingCapital,
    getFormattedOutstandingBalance,
  };
}
