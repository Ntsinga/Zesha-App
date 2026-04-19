import React, { useState } from "react";
import { useRouter } from "expo-router";
import { RefreshCw, Save, Building2, Shield, ArrowRight } from "lucide-react";
import {
  useSettingsScreen,
  CURRENCIES,
} from "../../hooks/screens/useSettingsScreen";
import UserManagement from "../../components/UserManagement";
import "../../styles/web.css";

export default function Settings() {
  const router = useRouter();
  const {
    isLoading,
    refreshing,
    onRefresh,
    isSaving,
    company,
    canEditSettings,
    isSuperAdmin,
    isViewingAgency,
    viewingAgencyName,
    showCompanySettings,
    name,
    setName,
    totalWorkingCapital,
    setTotalWorkingCapital,
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
      </header>

      {/* Content */}
      <div className="dashboard-content">
        {!showCompanySettings && isSuperAdmin ? (
          <>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Shield size={18} color="#6B7280" />
                  <span className="card-title">Super Admin View</span>
                </div>
              </div>
              <div className="card-body">
                <p style={{ color: "#4B5563", marginBottom: 16 }}>
                  You are in super admin mode
                  {viewingAgencyName ? ` for ${viewingAgencyName}` : ""}.
                  Company settings are only available after you enter an agency.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => router.push("/agencies")}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Building2 size={15} />
                  Manage Agencies
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Building2 size={18} color="#6B7280" />
                  <span className="card-title">
                    {isSuperAdmin && isViewingAgency
                      ? `Agency Settings${viewingAgencyName ? ` · ${viewingAgencyName}` : ""}`
                      : "Company Settings"}
                  </span>
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
                    <span
                      style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}
                    >
                      The total capital deployed across all accounts
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

            {canEditSettings && <UserManagement />}
          </>
        )}
      </div>
    </div>
  );
}
