import React from "react";
import {
  Banknote,
  Wallet,
  ChevronRight,
  CheckCircle,
  RefreshCw,
  Calculator,
  ArrowLeftRight,
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
    shiftPhase,
    currentSubtype,
    handoverDecision,
    setHandoverDecision,
    showHandoverModal,
    buttonLabel,
    showCommissionsAndTransactions,
    hasAMShift,
    hasPMShift,
    hasAMBalances,
    hasPMBalances,
    hasAMCommissions,
    hasPMCommissions,
    hasAMTransactions,
    hasPMTransactions,
    hasSelectedCashCount,
    hasSelectedBalances,
    hasSelectedCommissions,
    hasSelectedTransactions,
    selectedShiftTotal,
    selectedBalanceTotal,
    selectedCommissionTotal,
    selectedTransactionCount,
    selectedTransactionTotal,
    handleNavigateCashCount,
    handleNavigateAddBalance,
    handleNavigateCommissions,
    handleNavigateTransactions,
    handleBack,
    handleRefresh,
    handleCalculate,
  } = useBalanceMenuScreen();

  // Icon styles are fully inline to bypass react-native-css-interop's wrap-jsx,
  // which was causing the icon div to unmount/remount on className resolution
  // and producing a flash of unstyled / zero-sized content (FOUC).
  const iconBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    minWidth: 64,
    minHeight: 64,
    borderRadius: 12,
    flexShrink: 0,
  };

  const handleCalculatePress = async () => {
    const result = await handleCalculate();
    if (result?.success) {
      router.push(
        `/reconciliation?date=${today}&shift=${selectedShift}&subtype=${currentSubtype}` as any,
      );
    } else {
      alert(result?.error || "Failed to calculate reconciliation");
    }
  };

  return (
    <div className="page-wrapper">
      {/* Handover Modal — PM shift, no records yet, awaiting decision */}
      {showHandoverModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: 32,
              maxWidth: 400,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#1f2937",
                textAlign: "center",
                marginBottom: 10,
              }}
            >
              PM Shift
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "#6b7280",
                textAlign: "center",
                marginBottom: 28,
                lineHeight: "1.5",
              }}
            >
              Are you taking over from the AM worker? This helps record a proper
              float handover opening.
            </p>
            <button
              onClick={() => setHandoverDecision(true)}
              style={{
                display: "block",
                width: "100%",
                background: "#C62828",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: 12,
              }}
            >
              Yes, I’m taking over
            </button>
            <button
              onClick={() => setHandoverDecision(false)}
              style={{
                display: "block",
                width: "100%",
                background: "#f3f4f6",
                color: "#374151",
                border: "none",
                borderRadius: 12,
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              No, I’m covering the full day
            </button>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Daily Reconciliation</h1>
          <span className="header-date">Choose an option to continue</span>
        </div>
        <div className="header-right">
          {/* Shift Selector */}
          <div className="shift-selector-centered" style={{ margin: 0 }}>
            <button
              onClick={() => setSelectedShift("AM")}
              className={`shift-selector-btn ${selectedShift === "AM" ? "active" : ""}`}
            >
              AM Shift
            </button>
            <button
              onClick={() => setSelectedShift("PM")}
              className={`shift-selector-btn ${selectedShift === "PM" ? "active" : ""}`}
            >
              PM Shift
            </button>
          </div>
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
      <div className="dashboard-content" style={{ position: "relative" }}>
        {/* Loading overlay – renders on top while cards stay mounted (prevents FOUC) */}
        {isLoading && (
          <div
            className="loading-container"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "var(--page-bg, #f8fafc)",
            }}
          >
            <div className="spinner"></div>
            <p className="loading-text">Loading reconciliation data...</p>
          </div>
        )}

        <div className="balance-menu-grid">
          {/* Cash Count Card */}
          <div
            className={`balance-menu-card ${
              hasSelectedCashCount ? "completed" : ""
            }`}
            onClick={handleNavigateCashCount}
          >
            <div
              style={{
                ...iconBase,
                background: hasSelectedCashCount ? "#dcfce7" : "#fecaca",
                color: hasSelectedCashCount ? "#16a34a" : "#dc2626",
              }}
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
              style={{
                ...iconBase,
                background: hasSelectedBalances ? "#dcfce7" : "#fef3c7",
                color: hasSelectedBalances ? "#16a34a" : "#d97706",
              }}
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

          {/* Add Commissions Card — only shown when commissions are relevant */}
          {showCommissionsAndTransactions && (
            <div
              className={`balance-menu-card ${
                hasSelectedCommissions ? "completed" : ""
              }`}
              onClick={handleNavigateCommissions}
            >
              <div
                style={{
                  ...iconBase,
                  background: hasSelectedCommissions ? "#dcfce7" : "#fecaca",
                  color: hasSelectedCommissions ? "#16a34a" : "#dc2626",
                }}
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
          )}

          {/* Record Transactions Card — only shown when transactions are relevant */}
          {showCommissionsAndTransactions && (
            <div
              className={`balance-menu-card ${
                hasSelectedTransactions ? "completed" : ""
              }`}
              onClick={handleNavigateTransactions}
            >
              <div
                style={{
                  ...iconBase,
                  background: hasSelectedTransactions ? "#dcfce7" : "#e0e7ff",
                  color: hasSelectedTransactions ? "#16a34a" : "#4f46e5",
                }}
              >
                {hasSelectedTransactions ? (
                  <CheckCircle size={32} />
                ) : (
                  <ArrowLeftRight size={32} />
                )}
              </div>
              <div className="balance-menu-content">
                <div className="balance-menu-title-row">
                  <h3
                    className={`balance-menu-title ${
                      hasSelectedTransactions ? "completed" : ""
                    }`}
                  >
                    Record Transactions
                  </h3>
                  <div className="shift-badges">
                    {hasAMTransactions && (
                      <span className="shift-badge completed">AM</span>
                    )}
                    {hasPMTransactions && (
                      <span className="shift-badge completed">PM</span>
                    )}
                  </div>
                </div>
                <p
                  className={`balance-menu-description ${
                    hasSelectedTransactions ? "completed" : ""
                  }`}
                >
                  {hasSelectedTransactions
                    ? `${selectedShift}: ${selectedTransactionCount} transaction${selectedTransactionCount !== 1 ? "s" : ""} (${formatCurrency(selectedTransactionTotal)})`
                    : "Log deposits, withdrawals & float purchases"}
                </p>
              </div>
              <ChevronRight
                size={24}
                className={`balance-menu-arrow ${
                  hasSelectedTransactions ? "completed" : ""
                }`}
              />
            </div>
          )}
        </div>

        {/* Calculate Reconciliation Section */}
        <div className="reconciliation-section-centered">
          {shiftPhase === "COMPLETE" ? (
            <>
              <h3 className="section-title-centered">
                {selectedShift} Shift Complete
              </h3>
              <p className="section-description-centered">
                All reconciliations for the {selectedShift} shift have been
                finalized.
              </p>
            </>
          ) : (
            <>
              <h3 className="section-title-centered">{buttonLabel}</h3>
              <p className="section-description-centered">
                {!showCommissionsAndTransactions
                  ? `Record float balances and cash count to start the ${selectedShift} shift`
                  : `Calculate the ${selectedShift} shift reconciliation to review discrepancies`}
              </p>

              <button
                onClick={handleCalculatePress}
                disabled={
                  isCalculating ||
                  !hasSelectedCashCount ||
                  !hasSelectedBalances ||
                  (showCommissionsAndTransactions && !hasSelectedCommissions)
                }
                className={`btn-calculate-centered ${
                  isCalculating ||
                  !hasSelectedCashCount ||
                  !hasSelectedBalances ||
                  (showCommissionsAndTransactions && !hasSelectedCommissions)
                    ? "loading"
                    : ""
                }`}
              >
                <Calculator size={24} />
                <span>
                  {isCalculating
                    ? "Calculating..."
                    : !hasSelectedCashCount || !hasSelectedBalances
                      ? "Complete Required Steps First"
                      : buttonLabel}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
