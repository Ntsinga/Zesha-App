import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectUserRole } from "@/store/slices/authSlice";
import {
  fetchCompanyInfoList,
  createCompanyInfo,
  updateCompanyInfo,
} from "@/store/slices/companyInfoSlice";
import type {
  CompanyInfo,
  CompanyInfoCreate,
  CompanyInfoUpdate,
} from "@/types";
import { CURRENCIES } from "@/hooks/screens/useSettingsScreen";
import { ArrowLeft, Building2, Save, X, Plus, Mail } from "lucide-react";
import "../../styles/web.css";

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
  const [formData, setFormData] = useState<CompanyInfoCreate>({
    name: "",
    currency: "UGX",
    totalWorkingCapital: 0,
    outstandingBalance: 0,
    description: "",
    emails: [],
  });
  const [emailInput, setEmailInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check if user is superadmin
  const isSuperAdmin = userRole === "Super Administrator";

  // Load agency data when editing
  useEffect(() => {
    if (isEditing && editingAgency) {
      setFormData({
        name: editingAgency.name,
        currency: editingAgency.currency,
        totalWorkingCapital: editingAgency.totalWorkingCapital,
        outstandingBalance: editingAgency.outstandingBalance,
        description: editingAgency.description || "",
        emails: editingAgency.emails || [],
      });
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
      <div className="page-wrapper">
        <div className="access-denied">
          <Building2 size={48} className="text-muted" />
          <h2>Access Denied</h2>
          <p>You need Super Administrator privileges to access this area.</p>
        </div>
      </div>
    );
  }

  // Add email to list
  const handleAddEmail = () => {
    if (emailInput && emailInput.includes("@")) {
      setFormData((prev) => ({
        ...prev,
        emails: [...(prev.emails || []), emailInput],
      }));
      setEmailInput("");
    }
  };

  // Remove email from list
  const handleRemoveEmail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emails: (prev.emails || []).filter((_, i) => i !== index),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Agency name is required");
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing && id) {
        const updateData: CompanyInfoUpdate = {
          name: formData.name,
          currency: formData.currency,
          totalWorkingCapital: formData.totalWorkingCapital,
          outstandingBalance: formData.outstandingBalance,
          description: formData.description,
          emails: formData.emails,
        };
        await dispatch(
          updateCompanyInfo({ id: Number(id), data: updateData }),
        ).unwrap();
        alert("Agency updated successfully!");
      } else {
        await dispatch(createCompanyInfo(formData)).unwrap();
        alert("Agency created successfully!");
      }

      // Refresh list and navigate back to agencies page
      await dispatch(fetchCompanyInfoList({}));
      router.push("/agencies");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to save agency",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push("/agencies");
  };

  return (
    <div className="page-wrapper">
      <div className="dashboard-content">
        {/* Back button and title */}
        <div className="agency-form-header">
          <button className="btn-back" onClick={handleCancel}>
            <ArrowLeft size={20} />
            <span>Back to Agencies</span>
          </button>
        </div>

        {/* Form Card */}
        <div className="agency-form-card">
          <div className="agency-form-card-header">
            <Building2 size={24} className="text-primary" />
            <h2>{isEditing ? "Edit Agency" : "Create New Agency"}</h2>
          </div>

          <form onSubmit={handleSubmit} className="agency-form">
            {formError && <div className="alert alert-error">{formError}</div>}

            {/* Agency Name */}
            <div className="form-group">
              <label htmlFor="name">Agency Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter agency name"
                className="form-input"
                required
              />
            </div>

            {/* Currency */}
            <div className="form-group">
              <label htmlFor="currency">Currency</label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, currency: e.target.value }))
                }
                className="form-select"
              >
                {CURRENCIES.map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.code} - {curr.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Working Capital */}
            <div className="form-group">
              <label htmlFor="capital">Total Working Capital</label>
              <input
                type="number"
                id="capital"
                value={formData.totalWorkingCapital || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    totalWorkingCapital: Number(e.target.value) || 0,
                  }))
                }
                placeholder="0"
                className="form-input"
                min="0"
              />
            </div>

            {/* Outstanding Balance */}
            <div className="form-group">
              <label htmlFor="balance">Outstanding Balance</label>
              <input
                type="number"
                id="balance"
                value={formData.outstandingBalance || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    outstandingBalance: Number(e.target.value) || 0,
                  }))
                }
                placeholder="0"
                className="form-input"
                min="0"
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of the agency"
                className="form-textarea"
                rows={3}
              />
            </div>

            {/* Notification Emails */}
            <div className="form-group">
              <label>Notification Emails</label>
              <div className="email-input-row">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Add email address"
                  className="form-input"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddEmail}
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>

              {formData.emails && formData.emails.length > 0 && (
                <div className="email-tags">
                  {formData.emails.map((email, index) => (
                    <div key={index} className="email-tag">
                      <Mail size={14} />
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(index)}
                        className="email-tag-remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                <Save size={18} />
                {isSaving
                  ? "Saving..."
                  : isEditing
                    ? "Update Agency"
                    : "Create Agency"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
