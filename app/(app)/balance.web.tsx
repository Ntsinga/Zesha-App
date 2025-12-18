import React from "react";
import {
  Banknote,
  Wallet,
  ChevronRight,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useBalanceMenuScreen } from "../../hooks/screens/useBalanceMenuScreen";
import "../../styles/web.css";

export default function BalancePage() {
  const {
    isLoading,
    formatCurrency,
    hasAMShift,
    hasPMShift,
    latestShift,
    latestShiftTotal,
    hasTodayCashCount,
    hasAMBalances,
    hasPMBalances,
    latestBalanceShift,
    hasTodayBalances,
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleBack,
    handleRefresh,
  } = useBalanceMenuScreen();

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Daily Reconciliation</h1>
          <span className="header-date">Choose an option to continue</span>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? "spin" : ""} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        <div className="balance-menu-grid">
          {/* Cash Count Card */}
          <div
            className={`balance-menu-card ${
              hasTodayCashCount ? "completed" : ""
            }`}
            onClick={handleNavigateCashCount}
          >
            <div
              className={`balance-menu-icon ${
                hasTodayCashCount ? "completed" : ""
              }`}
            >
              {hasTodayCashCount ? (
                <CheckCircle size={32} />
              ) : (
                <Banknote size={32} />
              )}
            </div>
            <div className="balance-menu-content">
              <div className="balance-menu-title-row">
                <h3
                  className={`balance-menu-title ${
                    hasTodayCashCount ? "completed" : ""
                  }`}
                >
                  Cash Count
                </h3>
                <div className="shift-badges">
                  {hasAMShift && (
                    <span className="shift-badge completed">AM</span>
                  )}
                  {hasPMShift && (
                    <span className="shift-badge completed">PM</span>
                  )}
                </div>
              </div>
              <p
                className={`balance-menu-description ${
                  hasTodayCashCount ? "completed" : ""
                }`}
              >
                {hasTodayCashCount
                  ? `${latestShift} Total: ${formatCurrency(latestShiftTotal)}`
                  : "Count notes and coins by denomination"}
              </p>
            </div>
            <ChevronRight
              size={24}
              className={`balance-menu-arrow ${
                hasTodayCashCount ? "completed" : ""
              }`}
            />
          </div>

          {/* Add Balances Card */}
          <div
            className={`balance-menu-card ${
              hasTodayBalances ? "completed" : ""
            }`}
            onClick={handleNavigateAddBalance}
          >
            <div
              className={`balance-menu-icon balance ${
                hasTodayBalances ? "completed" : ""
              }`}
            >
              {hasTodayBalances ? (
                <CheckCircle size={32} />
              ) : (
                <Wallet size={32} />
              )}
            </div>
            <div className="balance-menu-content">
              <div className="balance-menu-title-row">
                <h3
                  className={`balance-menu-title ${
                    hasTodayBalances ? "completed" : ""
                  }`}
                >
                  Add Float Balances
                </h3>
                <div className="shift-badges">
                  {hasAMBalances && (
                    <span className="shift-badge completed">AM</span>
                  )}
                  {hasPMBalances && (
                    <span className="shift-badge completed">PM</span>
                  )}
                </div>
              </div>
              <p
                className={`balance-menu-description ${
                  hasTodayBalances ? "completed" : ""
                }`}
              >
                {hasTodayBalances
                  ? `${latestBalanceShift} - All accounts completed`
                  : "Add account balances with images"}
              </p>
            </div>
            <ChevronRight
              size={24}
              className={`balance-menu-arrow ${
                hasTodayBalances ? "completed" : ""
              }`}
            />
          </div>

          {/* Add Commissions Card */}
          <div
            className="balance-menu-card"
            onClick={handleNavigateCommissions}
          >
            <div className="balance-menu-icon commission">
              <Banknote size={32} />
            </div>
            <div className="balance-menu-content">
              <h3 className="balance-menu-title">Add Commissions</h3>
              <p className="balance-menu-description">
                Record commission payments with images
              </p>
            </div>
            <ChevronRight size={24} className="balance-menu-arrow" />
          </div>
        </div>
      </div>
    </div>
  );
}
