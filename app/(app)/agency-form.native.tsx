import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUserRole } from "@/store/slices/authSlice";
import {
  fetchCompanyInfoList,
  createCompanyInfo,
  updateCompanyInfo,
} from "@/store/slices/companyInfoSlice";
import type { CompanyInfoCreate, CompanyInfoUpdate } from "@/types";
import { CURRENCIES } from "@/hooks/screens/useSettingsScreen";
import {
  ArrowLeft,
  Building2,
  Save,
  X,
  Plus,
  Mail,
  ChevronDown,
} from "lucide-react-native";

export default function AgencyFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();
  const userRole = useAppSelector(selectUserRole);
  const { items: agencies, isLoading } = useAppSelector(
    (state) => state.companyInfo,
  );

  const isEditing = Boolean(id);
  const editingAgency = isEditing
    ? agencies.find((a) => a.id === Number(id))
    : null;

  // Form state
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("UGX");
  const [totalWorkingCapital, setTotalWorkingCapital] = useState("");
  const [outstandingBalance, setOutstandingBalance] = useState("");
  const [description, setDescription] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // Check if user is superadmin
  const isSuperAdmin = userRole === "Super Administrator";

  // Load agency data when editing
  useEffect(() => {
    if (isEditing && editingAgency) {
      setName(editingAgency.name);
      setCurrency(editingAgency.currency);
      setTotalWorkingCapital(editingAgency.totalWorkingCapital.toString());
      setOutstandingBalance(editingAgency.outstandingBalance.toString());
      setDescription(editingAgency.description || "");
      setEmails(editingAgency.emails || []);
    }
  }, [isEditing, editingAgency]);

  // Load agencies if not already loaded
  useEffect(() => {
    if (isSuperAdmin && agencies.length === 0) {
      dispatch(fetchCompanyInfoList({}));
    }
  }, [dispatch, isSuperAdmin, agencies.length]);

  // Access denied for non-superadmins
  if (!isSuperAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Building2 size={48} color="#9CA3AF" />
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedText}>
            You need Super Administrator privileges to access this area.
          </Text>
        </View>
      </View>
    );
  }

  // Add email
  const handleAddEmail = () => {
    if (emailInput && emailInput.includes("@")) {
      setEmails([...emails, emailInput]);
      setEmailInput("");
    }
  };

  // Remove email
  const handleRemoveEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  // Handle submit
  const handleSubmit = async () => {
    setFormError(null);

    if (!name.trim()) {
      setFormError("Agency name is required");
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing && id) {
        const updateData: CompanyInfoUpdate = {
          name,
          currency,
          totalWorkingCapital: Number(totalWorkingCapital) || 0,
          outstandingBalance: Number(outstandingBalance) || 0,
          description,
          emails,
        };
        await dispatch(
          updateCompanyInfo({ id: Number(id), data: updateData }),
        ).unwrap();
      } else {
        const createData: CompanyInfoCreate = {
          name,
          currency,
          totalWorkingCapital: Number(totalWorkingCapital) || 0,
          outstandingBalance: Number(outstandingBalance) || 0,
          description,
          emails,
        };
        await dispatch(createCompanyInfo(createData)).unwrap();
      }

      dispatch(fetchCompanyInfoList({}));
      router.back();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save agency",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back to Agencies</Text>
        </TouchableOpacity>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <Building2 size={24} color="#C62828" />
            <Text style={styles.formCardTitle}>
              {isEditing ? "Edit Agency" : "Create New Agency"}
            </Text>
          </View>

          {formError && (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{formError}</Text>
            </View>
          )}

          {/* Agency Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Agency Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter agency name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Currency Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Currency</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCurrencyPicker(!showCurrencyPicker)}
            >
              <Text style={styles.pickerButtonText}>
                {selectedCurrency
                  ? `${selectedCurrency.code} - ${selectedCurrency.name}`
                  : "Select Currency"}
              </Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>

            {showCurrencyPicker && (
              <View style={styles.pickerOptions}>
                {CURRENCIES.map((curr) => (
                  <TouchableOpacity
                    key={curr.code}
                    style={[
                      styles.pickerOption,
                      currency === curr.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setCurrency(curr.code);
                      setShowCurrencyPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        currency === curr.code &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {curr.code} - {curr.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Working Capital */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Total Working Capital</Text>
            <TextInput
              style={styles.input}
              value={totalWorkingCapital}
              onChangeText={setTotalWorkingCapital}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Outstanding Balance */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Outstanding Balance</Text>
            <TextInput
              style={styles.input}
              value={outstandingBalance}
              onChangeText={setOutstandingBalance}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description of the agency"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Emails */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Notification Emails</Text>
            <View style={styles.emailInputRow}>
              <TextInput
                style={[styles.input, styles.emailInput]}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="Add email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.addEmailButton}
                onPress={handleAddEmail}
              >
                <Plus size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {emails.length > 0 && (
              <View style={styles.emailTags}>
                {emails.map((email, index) => (
                  <View key={index} style={styles.emailTag}>
                    <Mail size={14} color="#6B7280" />
                    <Text style={styles.emailTagText}>{email}</Text>
                    <TouchableOpacity onPress={() => handleRemoveEmail(index)}>
                      <X size={14} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, isSaving && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving}
            >
              <Save size={18} color="#fff" />
              <Text style={styles.submitButtonText}>
                {isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Update Agency"
                    : "Create Agency"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  formCardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  errorAlert: {
    backgroundColor: "#FEE2E2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorAlertText: {
    color: "#DC2626",
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#FFFFFF",
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    marginRight: 8,
  },
  pickerOptions: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    maxHeight: 200,
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  pickerOptionSelected: {
    backgroundColor: "#FEE2E2",
  },
  pickerOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  pickerOptionTextSelected: {
    color: "#C62828",
    fontWeight: "600",
  },
  emailInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  emailInput: {
    flex: 1,
  },
  addEmailButton: {
    backgroundColor: "#C62828",
    borderRadius: 10,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  emailTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  emailTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  emailTagText: {
    fontSize: 13,
    color: "#4B5563",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C62828",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  accessDenied: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
  },
  accessDeniedText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
});
