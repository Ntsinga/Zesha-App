import React from "react";
import { RefreshCw } from "lucide-react";
import { useSettingsScreen } from "../../hooks/screens/useSettingsScreen";
import UserManagement from "../../components/UserManagement";
import "../../styles/web.css";

export default function Settings() {
  const { isLoading, refreshing, onRefresh } = useSettingsScreen();

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
        <UserManagement />
      </div>
    </div>
  );
}
