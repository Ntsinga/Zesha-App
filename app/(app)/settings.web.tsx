import React, { useState } from "react";
import { RefreshCw, Save, Building2 } from "lucide-react";
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
    onRefresh,
    isSaving,
    company,
    canEditSettings,
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
    handleSave,
  } = useSettingsScreen();

  const [saveMessage, setSaveMessage] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);

  const onSave = async () => {
    setSaveMessage(null);
    const result = await handleSave();
    setSaveMessage({ text: result.message, ok: result.success });
    if (result.success) setTimeout(() => setSaveMessage(null), 4000);
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
        {/* Company Settings Card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={18} color="#6B7280" />
              <span className="card-title">Company Settings</span>
            </div>
            {!canEditSettings && (
              <span
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  background: "#F3F4F6",
                  borderRadius: 6,
                  padding: "2px 10px",
                }}
              >
                View only — Admin access required
              </span>
            )}
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label>Company Name</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Company name"
                  disabled={!canEditSettings}
                  style={
                    !canEditSettings
                      ? {
                          background: "#F9FAFB",
                          color: "#6B7280",
                          cursor: "not-allowed",
                        }
                      : undefined
                  }
                />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select
                  className="form-input"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  disabled={!canEditSettings}
                  style={
                    !canEditSettings
                      ? {
                          background: "#F9FAFB",
                          color: "#6B7280",
                          cursor: "not-allowed",
                        }
                      : undefined
                  }
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Working Capital</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={totalWorkingCapital}
                  onChange={(e) => setTotalWorkingCapital(e.target.value)}
                  placeholder="0"
                  disabled={!canEditSettings}
                  style={
                    !canEditSettings
                      ? {
                          background: "#F9FAFB",
                          color: "#6B7280",
                          cursor: "not-allowed",
                        }
                      : undefined
                  }
                />
                <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                  The total capital deployed across all accounts
                </span>
              </div>
              <div className="form-group">
                <label>Outstanding Balance</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={outstandingBalance}
                  onChange={(e) => setOutstandingBalance(e.target.value)}
                  placeholder="0"
                  disabled={!canEditSettings}
                  style={
                    !canEditSettings
                      ? {
                          background: "#F9FAFB",
                          color: "#6B7280",
                          cursor: "not-allowed",
                        }
                      : undefined
                  }
                />
                <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>
                  Capital not yet in circulation (deducted from expected total)
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                disabled={!canEditSettings}
                style={
                  !canEditSettings
                    ? {
                        background: "#F9FAFB",
                        color: "#6B7280",
                        cursor: "not-allowed",
                      }
                    : undefined
                }
              />
            </div>

            {saveMessage && (
              <p
                style={{
                  fontSize: 13,
                  color: saveMessage.ok ? "#16a34a" : "#dc2626",
                  marginBottom: 8,
                }}
              >
                {saveMessage.text}
              </p>
            )}

            {canEditSettings && (
              <button
                className="btn-primary"
                onClick={onSave}
                disabled={isSaving}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <Save size={15} />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        <UserManagement />
      </div>
    </div>
  );
}
