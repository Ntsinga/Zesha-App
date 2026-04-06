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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useBalanceMenuScreen } from "../../hooks/screens/useBalanceMenuScreen";
import { useToast } from "../../components/Toast.web";
import "../../styles/web.css";

export default function BalancePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    shift?: string;
    companyId?: string;
    date?: string;
  }>();
  const { showToast } = useToast();
  const initialShift = params.shift === "PM" ? "PM" : "AM";
  const companyId = params.companyId ? Number(params.companyId) : null;
  const dateOverride = params.date;
  const lockInitialShift = Boolean(params.shift);

  const {
    isLoading,
    isCalculating,
    today,
    formatCurrency,
    selectedShift,
    setSelectedShift,
    shiftPhase,
    isResolvingPhase,
    currentSubtype,
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
  } = useBalanceMenuScreen({
    initialShift,
    lockInitialShift,
    dateOverride,
    companyIdOverride:
      companyId && Number.isFinite(companyId) ? companyId : undefined,
  });

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
      showToast(result?.error || "Failed to calculate reconciliation", "error");
    }
  };

  const showPhaseDependentActions =
    !isResolvingPhase && showCommissionsAndTransactions;
  const reconciliationHeading = isResolvingPhase
    ? `Loading ${selectedShift} Shift`
    : buttonLabel;
  const reconciliationDescription = isResolvingPhase
    ? `Checking the latest ${selectedShift} shift status before showing reconciliation steps`
    : !showCommissionsAndTransactions
      ? `Record float balances and cash count to start the ${selectedShift} shift`
      : `Calculate the ${selectedShift} shift reconciliation to review discrepancies`;

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Daily Reconciliation</h1>
          {/* Phase status pill — shows shift + OPENING/CLOSING/COMPLETE */}
          {(() => {
            const isLoadingPhase = isResolvingPhase;
            const isOpening =
              !isLoadingPhase &&
              currentSubtype === "OPENING" &&
              shiftPhase !== "COMPLETE";
            const isComplete = !isLoadingPhase && shiftPhase === "COMPLETE";
            const bg = isLoadingPhase
              ? "#f3f4f6"
              : isComplete
                ? "#dcfce7"
                : isOpening
                  ? "#dbeafe"
                  : "#fef3c7";
            const color = isLoadingPhase
              ? "#6b7280"
              : isComplete
                ? "#15803d"
                : isOpening
                  ? "#1d4ed8"
                  : "#92400e";
            const label = isLoadingPhase
              ? "Loading"
              : isComplete
                ? "Complete"
                : isOpening
                  ? "Opening"
                  : "Closing";
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    background: selectedShift === "AM" ? "#fee2e2" : "#ede9fe",
                    color: selectedShift === "AM" ? "#991b1b" : "#5b21b6",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  {selectedShift}
                </span>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>·</span>
                <span
                  style={{
                    background: bg,
                    color,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })()}
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
          {showPhaseDependentActions && (
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
          {showPhaseDependentActions && (
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
              <h3 className="section-title-centered">
                {reconciliationHeading}
              </h3>
              <p className="section-description-centered">
                {reconciliationDescription}
              </p>

              <button
                onClick={handleCalculatePress}
                disabled={
                  isResolvingPhase ||
                  isCalculating ||
                  !hasSelectedCashCount ||
                  !hasSelectedBalances ||
                  (showPhaseDependentActions && !hasSelectedCommissions)
                }
                className={`btn-calculate-centered ${
                  isResolvingPhase ||
                  isCalculating ||
                  !hasSelectedCashCount ||
                  !hasSelectedBalances ||
                  (showPhaseDependentActions && !hasSelectedCommissions)
                    ? "loading"
                    : ""
                }`}
              >
                <Calculator size={24} />
                <span>
                  {isResolvingPhase
                    ? "Loading Shift Status..."
                    : isCalculating
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
