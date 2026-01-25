import React, { useState } from "react";
import {
  Building,
  DollarSign,
  Mail,
  Plus,
  X,
  Save,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  useSettingsScreen,
  CURRENCIES,
} from "../../hooks/screens/useSettingsScreen";
import UserManagement from "../../components/UserManagement";
import "../../styles/web.css";

export default function Settings() {
  const {
    isLoading,
    refreshing,
    isSaving,
    company,
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
    onRefresh,
    addEmail,
    removeEmail,
    handleSave,
    getFormattedWorkingCapital,
    getFormattedOutstandingBalance,
  } = useSettingsScreen();

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onAddEmail = () => {
    const result = addEmail();
    if (!result.success && result.message) {
      setMessage({ type: "error", text: result.message });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const onSubmit = async () => {
    const result = await handleSave();
    setMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });

    if (result.success) {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (isLoading && !refreshing) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner" />
          <p className="loading-text">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Settings</h1>
          <span className="header-date">Company Information</span>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        {message && (
          <div
            className={`alert ${
              message.type === "success" ? "alert-success" : "alert-error"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="settings-grid">
          {/* Company Details Card */}
          <div className="settings-card">
            <div className="settings-card-header">
              <Building size={24} className="text-primary" />
              <h2>Company Details</h2>
            </div>

            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter company name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the company"
                className="form-textarea"
                rows={3}
              />
            </div>
          </div>

          {/* Financial Settings Card */}
          <div className="settings-card">
            <div className="settings-card-header">
              <DollarSign size={24} className="text-primary" />
              <h2>Financial Settings</h2>
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <div className="select-wrapper">
                <button
                  className="form-select"
                  onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                >
                  <span>
                    {currency} -{" "}
                    {CURRENCIES.find((c) => c.code === currency)?.name ||
                      currency}
                  </span>
                  <ChevronDown size={16} />
                </button>

                {showCurrencyPicker && (
                  <div className="select-dropdown">
                    {CURRENCIES.map((curr) => (
                      <button
                        key={curr.code}
                        className={`select-option ${
                          currency === curr.code ? "selected" : ""
                        }`}
                        onClick={() => {
                          setCurrency(curr.code);
                          setShowCurrencyPicker(false);
                        }}
                      >
                        {curr.code} - {curr.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Total Working Capital</label>
              <input
                type="number"
                value={totalWorkingCapital}
                onChange={(e) => setTotalWorkingCapital(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
              />
              {totalWorkingCapital && (
                <span className="form-hint">
                  {getFormattedWorkingCapital()}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Outstanding Balance</label>
              <input
                type="number"
                value={outstandingBalance}
                onChange={(e) => setOutstandingBalance(e.target.value)}
                placeholder="0.00"
                className="form-input"
                step="0.01"
              />
              {outstandingBalance && (
                <span className="form-hint">
                  {getFormattedOutstandingBalance()}
                </span>
              )}
            </div>
          </div>

          {/* Email Notifications Card */}
          <div className="settings-card full-width">
            <div className="settings-card-header">
              <Mail size={24} className="text-primary" />
              <h2>Email Notifications</h2>
            </div>

            <div className="email-input-row">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Add email address"
                className="form-input"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onAddEmail();
                  }
                }}
              />
              <button className="btn-primary" onClick={onAddEmail}>
                <Plus size={16} />
                Add
              </button>
            </div>

            {emails.length === 0 ? (
              <p className="empty-text">No email addresses added</p>
            ) : (
              <div className="email-list">
                {emails.map((email, index) => (
                  <div key={index} className="email-item">
                    <span>{email}</span>
                    <button
                      className="btn-icon-sm danger"
                      onClick={() => removeEmail(email)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Management Card */}
          <UserManagement />
        </div>

        {/* Save Button */}
        <div className="settings-footer">
          <button
            className="btn-primary btn-lg"
            onClick={onSubmit}
            disabled={isSaving}
          >
            <Save size={20} />
            {isSaving ? "Saving..." : "Save Settings"}
          </button>

          {company && (
            <p className="settings-meta">
              Company ID: {company.id} • Last updated:{" "}
              {company.updatedAt
                ? new Date(company.updatedAt).toLocaleDateString()
                : "N/A"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
