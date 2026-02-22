import React, { useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  Plus,
  X,
  Upload,
  Check,
  AlertTriangle,
  ChevronDown,
  Loader2,
  Save,
  Eye,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useAddCommissionScreen } from "../../hooks/screens/useAddCommissionScreen";
import "../../styles/web.css";

/**
 * Add Commission Web - Desktop optimized form for adding commissions
 */
export default function AddCommissionWeb() {
  const router = useRouter();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    entries,
    errors,
    isSubmitting,
    accountsLoading,
    currentShift,
    accountPickerVisible,
    activeAccounts,
    getAvailableAccounts,
    hasExistingEntries,
    handleAmountChange,
    selectAccount,
    addEntry,
    removeEntry,
    clearImage,
    handleImageUpload,
    handleSubmit,
    setAccountPickerVisible,
  } = useAddCommissionScreen();

  // Handle file input change
  const handleFileChange = (
    entryId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      handleImageUpload(entryId, file, previewUrl);
    }
  };

  // Handle form submission
  const onSubmit = async () => {
    const result = await handleSubmit();
    if (result.success) {
      setSuccessMessage(result.message);
      setTimeout(() => {
        router.back();
      }, 1500);
    } else {
      alert(result.message);
    }
  };

  // Get entry status
  const getEntryStatus = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return "incomplete";

    const hasError = errors[entryId] && Object.keys(errors[entryId]).length > 0;
    if (hasError) return "error";

    const isComplete =
      entry.accountId !== null && entry.amount.trim() !== "" && entry.imageUrl;
    return isComplete ? "complete" : "incomplete";
  };

  // Count complete entries
  const completeCount = entries.filter(
    (e) => e.accountId !== null && e.amount.trim() !== "" && e.imageUrl,
  ).length;

  if (accountsLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <Loader2 className="spinning" size={32} />
          <p className="loading-text">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <button className="btn-back" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="header-title">Add Commissions</h1>
            <span className="header-date">
              {completeCount} of {entries.length} entries
            </span>
          </div>
        </div>
        <div className="header-right">
          <span
            className={`shift-badge ${currentShift === "AM" ? "am" : "pm"}`}
          >
            {currentShift} Shift
          </span>
          <button onClick={addEntry} className="btn-primary">
            <Plus size={18} />
            Add Entry
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        {/* Success Message */}
        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        {/* Entries Grid */}
        <div className="add-form-container">
          <div className="entries-grid">
            {entries.map((entry, index) => {
              const entryStatus = getEntryStatus(entry.id);
              const entryErrors = errors[entry.id] || {};
              const availableAccounts = getAvailableAccounts(entry.id);

              return (
                <div
                  key={entry.id}
                  className={`entry-card ${
                    entryStatus === "error" ? "has-error" : ""
                  } ${entryStatus === "complete" ? "is-complete" : ""}`}
                >
                  {/* Card Header */}
                  <div className="entry-card-header">
                    <div className="entry-card-title">
                      <span className="entry-card-number">{index + 1}</span>
                      <span>{entry.accountName || "Select Account"}</span>
                    </div>
                    <div className="entry-card-actions">
                      <span className={`entry-status ${entryStatus}`}>
                        {entryStatus === "complete" && (
                          <>
                            <Check size={12} /> Complete
                          </>
                        )}
                        {entryStatus === "incomplete" && "Incomplete"}
                        {entryStatus === "error" && (
                          <>
                            <AlertTriangle size={12} /> Error
                          </>
                        )}
                      </span>
                      {entries.length > 1 && (
                        <button
                          className="btn-remove-entry"
                          onClick={() => removeEntry(entry.id)}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="entry-card-body">
                    {/* Account Selector */}
                    <div className="form-group">
                      <label className="form-label">Account</label>
                      <div className="account-selector">
                        <button
                          type="button"
                          className={`account-selector-btn ${
                            !entry.accountId ? "placeholder" : ""
                          } ${entryErrors.accountName ? "has-error" : ""}`}
                          onClick={() =>
                            setAccountPickerVisible(
                              accountPickerVisible === entry.id
                                ? null
                                : entry.id,
                            )
                          }
                        >
                          <span>
                            {entry.accountName || "Select an account"}
                          </span>
                          <ChevronDown size={18} />
                        </button>

                        {accountPickerVisible === entry.id && (
                          <div className="account-dropdown">
                            {availableAccounts.length > 0 ? (
                              availableAccounts.map((account) => (
                                <button
                                  key={account.id}
                                  className={`account-dropdown-item ${
                                    entry.accountId === account.id
                                      ? "selected"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    selectAccount(entry.id, account)
                                  }
                                >
                                  <span>{account.name}</span>
                                  <span className="account-dropdown-category">
                                    {account.accountType}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="account-dropdown-item">
                                No available accounts
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {entryErrors.accountName && (
                        <span className="form-error">
                          {entryErrors.accountName}
                        </span>
                      )}
                    </div>

                    {/* Amount Input */}
                    <div className="form-group">
                      <label className="form-label">Commission Amount</label>
                      <div className="amount-input-wrapper">
                        <span className="currency-symbol">R</span>
                        <input
                          type="text"
                          className={`amount-input ${
                            entryErrors.amount ? "has-error" : ""
                          } ${
                            entry.validationResult?.isValid ? "is-valid" : ""
                          }`}
                          placeholder="0.00"
                          value={entry.amount}
                          onChange={(e) =>
                            handleAmountChange(entry.id, e.target.value)
                          }
                        />
                      </div>
                      {entryErrors.amount && (
                        <span className="form-error">{entryErrors.amount}</span>
                      )}
                      {entry.validationResult && (
                        <div
                          className={`validation-status ${
                            entry.validationResult.isValid ? "success" : "error"
                          }`}
                        >
                          {entry.validationResult.isValid ? (
                            <>
                              <Check size={14} /> Amount verified
                            </>
                          ) : (
                            <>
                              <AlertTriangle size={14} />{" "}
                              {entry.validationResult.message}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Image Upload */}
                    <div className="form-group">
                      <label className="form-label">
                        Commission Screenshot
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => {
                          fileInputRefs.current[entry.id] = el;
                        }}
                        onChange={(e) => handleFileChange(entry.id, e)}
                        style={{ display: "none" }}
                      />

                      {!entry.imageUrl ? (
                        <div
                          className={`image-upload-area ${
                            entryErrors.imageUrl ? "has-error" : ""
                          }`}
                          onClick={() =>
                            fileInputRefs.current[entry.id]?.click()
                          }
                        >
                          <div className="image-upload-icon">
                            <Upload size={24} />
                          </div>
                          <div className="image-upload-text">
                            Click to upload screenshot
                          </div>
                          <div className="image-upload-hint">
                            PNG, JPG up to 10MB
                          </div>
                        </div>
                      ) : (
                        <div className="image-preview-container">
                          <img
                            src={entry.imageUrl}
                            alt="Commission screenshot"
                            className="image-preview"
                          />
                          {entry.isExtracting && (
                            <div className="image-extracting-overlay">
                              <Loader2 size={32} className="spinner" />
                              <span>Extracting commission...</span>
                            </div>
                          )}
                          {!entry.isExtracting &&
                            entry.extractedBalance !== null && (
                              <div className="image-extracted-badge">
                                <Check size={14} />R
                                {entry.extractedBalance.toLocaleString()}
                              </div>
                            )}
                          <div className="image-preview-overlay">
                            <button
                              className="btn-preview-action"
                              onClick={() => setPreviewImage(entry.imageUrl)}
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              className="btn-preview-action danger"
                              onClick={() => clearImage(entry.id)}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      )}
                      {entryErrors.imageUrl && (
                        <span className="form-error">
                          {entryErrors.imageUrl}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Entry Card */}
            <button className="btn-add-entry" onClick={addEntry}>
              <Plus size={24} />
              <span>Add Another Entry</span>
            </button>
          </div>
        </div>

        {/* Fixed Footer Actions */}
        <div className="form-actions-footer">
          <div className="form-actions-left">
            <button className="btn-cancel" onClick={() => router.back()}>
              Cancel
            </button>
            <div className="form-summary">
              <strong>{completeCount}</strong> of{" "}
              <strong>{entries.length}</strong> entries complete
            </div>
          </div>
          <div className="form-actions-right">
            <button
              className="btn-submit"
              onClick={onSubmit}
              disabled={isSubmitting || completeCount === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinning" size={18} />
                  {hasExistingEntries ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {hasExistingEntries
                    ? "Update Commissions"
                    : "Save Commissions"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="image-modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setPreviewImage(null)}
            >
              <X size={20} />
            </button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
}
