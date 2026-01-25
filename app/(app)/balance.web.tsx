import React from "react";
import {
  Banknote,
  Wallet,
  ChevronRight,
  CheckCircle,
  RefreshCw,
  Calculator,
} from "lucide-react";
import { useRouter } from "expo-router";
import { useBalanceMenuScreen } from "../../hooks/screens/useBalanceMenuScreen";
import "../../styles/web.css";

export default function BalancePage() {
  const router = useRouter();

  const {
    isLoading,
    isCalculating,
    today,
    formatCurrency,
    selectedShift,
    setSelectedShift,
    hasAMShift,
    hasPMShift,
    hasAMBalances,
    hasPMBalances,
    hasAMCommissions,
    hasPMCommissions,
    hasSelectedCashCount,
    hasSelectedBalances,
    hasSelectedCommissions,
    selectedShiftTotal,
    selectedBalanceTotal,
    selectedCommissionTotal,
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleBack,
    handleRefresh,
    handleCalculate,
  } = useBalanceMenuScreen();

  const handleCalculatePress = async () => {
    const result = await handleCalculate();
    if (result?.success) {
      router.push(
        `/reconciliation?date=${today}&shift=${selectedShift}` as any,
      );
    } else {
      alert(result?.error || "Failed to calculate reconciliation");
    }
  };

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
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="loading-text">Loading reconciliation data...</p>
          </div>
        ) : (
          <>
            <div className="balance-menu-grid">
              {/* Cash Count Card */}
              <div
                className={`balance-menu-card ${
                  hasSelectedCashCount ? "completed" : ""
                }`}
                onClick={handleNavigateCashCount}
              >
                <div
                  className={`balance-menu-icon ${
                    hasSelectedCashCount ? "completed" : ""
                  }`}
                >
                  {hasSelectedCashCount ? (
                    <CheckCircle size={32} />
                  ) : (
                    <Banknote size={32} />
                  )}
                </div>
                <div className="balance-menu-content">
                  <div className="balance-menu-title-row">
                    <h3
                      className={`balance-menu-title ${
                        hasSelectedCashCount ? "completed" : ""
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
                      hasSelectedCashCount ? "completed" : ""
                    }`}
                  >
                    {hasSelectedCashCount
                      ? `${selectedShift} Total: ${formatCurrency(selectedShiftTotal)}`
                      : "Count notes and coins by denomination"}
                  </p>
                </div>
                <ChevronRight
                  size={24}
                  className={`balance-menu-arrow ${
                    hasSelectedCashCount ? "completed" : ""
                  }`}
                />
              </div>

              {/* Add Balances Card */}
              <div
                className={`balance-menu-card ${
                  hasSelectedBalances ? "completed" : ""
                }`}
                onClick={handleNavigateAddBalance}
              >
                <div
                  className={`balance-menu-icon balance ${
                    hasSelectedBalances ? "completed" : ""
                  }`}
                >
                  {hasSelectedBalances ? (
                    <CheckCircle size={32} />
                  ) : (
                    <Wallet size={32} />
                  )}
                </div>
                <div className="balance-menu-content">
                  <div className="balance-menu-title-row">
                    <h3
                      className={`balance-menu-title ${
                        hasSelectedBalances ? "completed" : ""
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
                      hasSelectedBalances ? "completed" : ""
                    }`}
                  >
                    {hasSelectedBalances
                      ? `${selectedShift} Total: ${formatCurrency(selectedBalanceTotal)}`
                      : "Add account balances with images"}
                  </p>
                </div>
                <ChevronRight
                  size={24}
                  className={`balance-menu-arrow ${
                    hasSelectedBalances ? "completed" : ""
                  }`}
                />
              </div>

              {/* Add Commissions Card */}
              <div
                className={`balance-menu-card ${
                  hasSelectedCommissions ? "completed" : ""
                }`}
                onClick={handleNavigateCommissions}
              >
                <div
                  className={`balance-menu-icon ${
                    hasSelectedCommissions ? "completed" : "commission"
                  }`}
                >
                  {hasSelectedCommissions ? (
                    <CheckCircle size={32} />
                  ) : (
                    <Banknote size={32} />
                  )}
                </div>
                <div className="balance-menu-content">
                  <div className="balance-menu-title-row">
                    <h3
                      className={`balance-menu-title ${
                        hasSelectedCommissions ? "completed" : ""
                      }`}
                    >
                      Add Commissions
                    </h3>
                    <div className="shift-badges">
                      {hasAMCommissions && (
                        <span className="shift-badge completed">AM</span>
                      )}
                      {hasPMCommissions && (
                        <span className="shift-badge completed">PM</span>
                      )}
                    </div>
                  </div>
                  <p
                    className={`balance-menu-description ${
                      hasSelectedCommissions ? "completed" : ""
                    }`}
                  >
                    {hasSelectedCommissions
                      ? `${selectedShift} Total: ${formatCurrency(selectedCommissionTotal)}`
                      : "Record commission payments with images"}
                  </p>
                </div>
                <ChevronRight
                  size={24}
                  className={`balance-menu-arrow ${
                    hasSelectedCommissions ? "completed" : ""
                  }`}
                />
              </div>
            </div>

            {/* Calculate Reconciliation Section */}
            <div className="reconciliation-section-centered">
              <h3 className="section-title-centered">
                Calculate Reconciliation
              </h3>
              <p className="section-description-centered">
                Select a shift and calculate the reconciliation to review
                discrepancies
              </p>

              {/* Shift Selector */}
              <div className="shift-selector-centered">
                <button
                  onClick={() => setSelectedShift("AM")}
                  className={`shift-selector-btn ${
                    selectedShift === "AM" ? "active" : ""
                  }`}
                >
                  AM Shift
                </button>
                <button
                  onClick={() => setSelectedShift("PM")}
                  className={`shift-selector-btn ${
                    selectedShift === "PM" ? "active" : ""
                  }`}
                >
                  PM Shift
                </button>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculatePress}
                disabled={
                  isCalculating ||
                  !hasSelectedCashCount ||
                  !hasSelectedBalances ||
                  !hasSelectedCommissions
                }
                className={`btn-calculate-centered ${
                  isCalculating ||
                  !hasSelectedCashCount ||
                  !hasSelectedBalances ||
                  !hasSelectedCommissions
                    ? "loading"
                    : ""
                }`}
              >
                <Calculator size={24} />
                <span>
                  {isCalculating
                    ? "Calculating..."
                    : !hasSelectedCashCount ||
                        !hasSelectedBalances ||
                        !hasSelectedCommissions
                      ? "Complete All Steps First"
                      : `Calculate ${selectedShift} Reconciliation`}
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
