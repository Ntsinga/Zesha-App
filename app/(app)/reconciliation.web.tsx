import React, { useState as useLocalState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  Banknote,
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Lock,
  Check,
  XCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ArrowDownCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useReconciliationScreen } from "../../hooks/screens/useReconciliationScreen";
import type { ReconciliationSubtypeEnum, ShiftEnum } from "../../types";
import "../../styles/web.css";

export default function BalanceDetailWeb() {
  // Get params from Expo Router (reactive, works with router.push)
  const params = useLocalSearchParams<{ date: string; shift: string; subtype: string }>();
  const date = params.date || "";
  const shift = (params.shift as ShiftEnum) || "AM";
  const subtype = (params.subtype as ReconciliationSubtypeEnum) || "CLOSING";

  const {
    refreshing,
    isLoading,
    error,
    selectedImage,
    setSelectedImage,
    balances,
    cashCounts,
    commissions,
    totalFloat,
    totalCash,
    totalCommission,
    expectedClosing,
    actualClosing,
    variance,
    status,
    onRefresh,
    handleBack,
    getImageUri,
    formatCurrency,
    formatDate,
    // Reconciliation functionality
    notes,
    setNotes,
    canReview,
    isCalculating,
    isFinalizing,
    isFinalized,
    isApproved,
    handleCalculate,
    handleFinalize,
    handleApprove,
    handleReject,
    // Balance validation
    hasDiscrepancies,
    discrepancyCount,
    totalDiscrepancyAmount,
    validationByAccountId,
    // Linked transactions
    shiftTransactions,
  } = useReconciliationScreen({ date, shift, subtype });

  const isOpening = subtype === "OPENING";

  // Local state for discrepancy confirmation dialog
  const [showDiscrepancyConfirm, setShowDiscrepancyConfirm] =
    useLocalState(false);

  // Show loading while params are being resolved
  if (!date) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading reconciliation details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <AlertTriangle size={48} color="#EF4444" />
          <h2>Error Loading Details</h2>
          <p>{error}</p>
          <button onClick={handleBack} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          <button onClick={handleBack} className="btn-icon" title="Go back">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="header-title">{formatDate(date, "medium")}</h1>
            <span className={`shift-badge ${shift === "AM" ? "am" : "pm"}`}>
              {shift} Shift
            </span>
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 10,
                background: isOpening ? "#e0f2fe" : "#fef3c7",
                color: isOpening ? "#0369a1" : "#92400e",
              }}
            >
              {isOpening ? "Opening" : "Closing"}
            </span>
          </div>
        </div>
        <div className="header-right">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-refresh"
          >
            <RefreshCw className={refreshing ? "spin" : ""} size={18} />
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Summary Cards Row */}
        <div className="stats-row">
          {/* Actual Closing Card */}
          <div className="stat-card highlight">
            <div className="stat-header">
              <span className="stat-label">Actual Closing</span>
              <span className={`status-badge ${status?.toLowerCase()}`}>
                {status === "PASSED" && <CheckCircle size={12} />}
                {status === "FAILED" && <AlertTriangle size={12} />}
                {status === "FLAGGED" && <Clock size={12} />}
                {status === "PASSED"
                  ? "Passed"
                  : status === "FAILED"
                    ? "Failed"
                    : "Flagged"}
              </span>
            </div>
            <div className="stat-number large">
              {formatCurrency(actualClosing)}
            </div>
            <div className="stat-breakdown">
              <div>
                <span className="text-xs">Float</span>
                <div className="font-bold">{formatCurrency(totalFloat)}</div>
              </div>
              <div className="text-right">
                <span className="text-xs">Cash</span>
                <div className="font-bold">{formatCurrency(totalCash)}</div>
              </div>
            </div>
          </div>

          {/* Variance Card */}
          <div className="stat-card">
            <div className="stat-icon">
              {variance >= 0 ? (
                <TrendingUp size={20} color="#16A34A" />
              ) : (
                <TrendingDown size={20} color="#DC2626" />
              )}
            </div>
            <div className="stat-info">
              <span className="stat-label">Variance</span>
              <span
                className={`stat-number ${
                  variance >= 0 ? "success" : "danger"
                }`}
              >
                {variance >= 0 ? "+" : ""}
                {formatCurrency(variance)}
              </span>
            </div>
          </div>

          {/* Expected Card */}
          <div className="stat-card">
            <div className="stat-icon total">
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Expected</span>
              <span className="stat-number">
                {formatCurrency(expectedClosing)}
              </span>
            </div>
          </div>

          {/* Commissions Card — hidden for OPENING */}
          {!isOpening && (
          <div className="stat-card">
            <div className="stat-icon danger">
              <Banknote size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Commissions</span>
              <span className="stat-number danger">
                {formatCurrency(totalCommission)}
              </span>
            </div>
          </div>
          )}
        </div>

        {/* Discrepancy Alert Banner */}
        {hasDiscrepancies && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 20px",
              borderRadius: 12,
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              marginBottom: 24,
            }}
          >
            <ShieldAlert size={22} color="#DC2626" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "#991b1b",
                  marginBottom: 2,
                }}
              >
                Balance Discrepancies Detected
              </div>
              <div style={{ fontSize: 13, color: "#b91c1c" }}>
                {discrepancyCount} account{discrepancyCount !== 1 ? "s" : ""}{" "}
                with a total variance of{" "}
                {formatCurrency(totalDiscrepancyAmount)}. Review the balances
                table below for details.
              </div>
            </div>
          </div>
        )}

        {/* Detail Tables */}
        <div className="detail-grid">
          {/* Commissions Table — hidden for OPENING */}
          {!isOpening && (
          <div className="table-card">
            <div className="card-header">
              <Banknote size={18} />
              <h3>Commissions ({commissions.length})</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Image</th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      No commissions recorded
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => (
                    <tr key={commission.id}>
                      <td>
                        {commission.account?.name ||
                          `Account ${commission.accountId}`}
                      </td>
                      <td className="text-right font-semibold">
                        {formatCurrency(commission.amount)}
                      </td>
                      <td className="text-center">
                        {(commission.imageData || commission.imageUrl) && (
                          <button
                            onClick={() => {
                              const uri = getImageUri(commission);
                              if (uri) setSelectedImage(uri);
                            }}
                            className="btn-icon-small"
                          >
                            <ImageIcon size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* Balances Table */}
          <div className="table-card">
            <div className="card-header">
              <Wallet size={18} />
              <h3>Account Balances ({balances.length})</h3>
              <div className="ml-auto font-bold" style={{ color: "#B8860B" }}>
                {formatCurrency(totalFloat)}
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Source</th>
                  <th className="text-right">Snapshot</th>
                  <th className="text-right">Expected</th>
                  <th className="text-right">Variance</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Image</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty">
                      No balances recorded
                    </td>
                  </tr>
                ) : (
                  balances.map((balance) => {
                    const validation = validationByAccountId[balance.accountId];
                    const vStatus = validation?.validationStatus;
                    return (
                      <tr
                        key={balance.id}
                        style={
                          balance.isAutoGenerated
                            ? { backgroundColor: "#f0f9ff" }
                            : undefined
                        }
                      >
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {balance.account?.name ||
                              `Account ${balance.accountId}`}
                            {balance.isAutoGenerated && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "1px 8px",
                                  borderRadius: 10,
                                  fontSize: 10,
                                  fontWeight: 600,
                                  backgroundColor: "#dbeafe",
                                  color: "#2563eb",
                                }}
                              >
                                <RefreshCw size={10} />
                                Auto-carried
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-xs text-gray-500">
                          {balance.isAutoGenerated
                            ? "Inactive"
                            : balance.source}
                        </td>
                        <td className="text-right font-semibold">
                          {formatCurrency(balance.amount)}
                        </td>
                        <td className="text-right">
                          {validation
                            ? formatCurrency(validation.calculatedBalance)
                            : "—"}
                        </td>
                        <td
                          className={`text-right font-semibold ${
                            validation
                              ? validation.variance > 0
                                ? "text-green-600"
                                : validation.variance < 0
                                  ? "text-red-600"
                                  : ""
                              : ""
                          }`}
                        >
                          {validation
                            ? `${validation.variance >= 0 ? "+" : ""}${formatCurrency(validation.variance)}`
                            : "—"}
                        </td>
                        <td className="text-center">
                          {vStatus && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 10px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor:
                                  vStatus === "MATCHED"
                                    ? "#dcfce7"
                                    : vStatus === "SHORTAGE"
                                      ? "#fef2f2"
                                      : vStatus === "EXCESS"
                                        ? "#fefce8"
                                        : "#f3f4f6",
                                color:
                                  vStatus === "MATCHED"
                                    ? "#16a34a"
                                    : vStatus === "SHORTAGE"
                                      ? "#dc2626"
                                      : vStatus === "EXCESS"
                                        ? "#ca8a04"
                                        : "#6b7280",
                              }}
                            >
                              {vStatus === "MATCHED" && (
                                <ShieldCheck size={12} />
                              )}
                              {vStatus === "SHORTAGE" && (
                                <ArrowDownCircle size={12} />
                              )}
                              {vStatus === "EXCESS" && (
                                <ArrowUpCircle size={12} />
                              )}
                              {vStatus}
                            </span>
                          )}
                        </td>
                        <td className="text-center">
                          {(balance.imageData || balance.imageUrl) && (
                            <button
                              onClick={() => {
                                const uri = getImageUri(balance);
                                if (uri) setSelectedImage(uri);
                              }}
                              className="btn-icon-small"
                            >
                              <ImageIcon size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Cash Count Table */}
          <div className="table-card full-width">
            <div className="card-header">
              <Banknote size={18} color="#16A34A" />
              <h3>Cash Count ({cashCounts.length} denominations)</h3>
              <div className="ml-auto font-bold text-green-700">
                {formatCurrency(totalCash)}
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Denomination</th>
                  <th className="text-center">Quantity</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {cashCounts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="empty">
                      No cash count recorded
                    </td>
                  </tr>
                ) : (
                  cashCounts.map((cc) => (
                    <tr key={cc.id}>
                      <td>{formatCurrency(cc.denomination)}</td>
                      <td className="text-center">×{cc.quantity}</td>
                      <td className="text-right font-semibold">
                        {formatCurrency(cc.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Linked Transactions Table — hidden for OPENING */}
          {!isOpening && (
          <div className="table-card full-width">
            <div className="card-header">
              <ArrowLeftRight size={18} color="#4F46E5" />
              <h3>Transactions ({shiftTransactions.length})</h3>
            </div>
            {shiftTransactions.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#9ca3af",
                }}
              >
                No transactions recorded for this shift
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Account</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Balance After</th>
                    <th>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftTransactions.map((txn) => (
                    <tr key={txn.id}>
                      <td className="text-xs text-gray-500">
                        {txn.transactionTime
                          ? new Date(txn.transactionTime).toLocaleTimeString(
                              [],
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : "—"}
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 10px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor:
                              txn.transactionType === "DEPOSIT"
                                ? "#dcfce7"
                                : txn.transactionType === "WITHDRAW"
                                  ? "#fef2f2"
                                  : "#e0e7ff",
                            color:
                              txn.transactionType === "DEPOSIT"
                                ? "#16a34a"
                                : txn.transactionType === "WITHDRAW"
                                  ? "#dc2626"
                                  : "#4f46e5",
                          }}
                        >
                          {txn.transactionType === "DEPOSIT" ? (
                            <ArrowDownCircle size={12} />
                          ) : txn.transactionType === "WITHDRAW" ? (
                            <ArrowUpCircle size={12} />
                          ) : (
                            <ArrowLeftRight size={12} />
                          )}
                          {txn.transactionType === "FLOAT_PURCHASE"
                            ? "Float"
                            : txn.transactionType}
                        </span>
                      </td>
                      <td>{txn.account?.name || `Account ${txn.accountId}`}</td>
                      <td className="text-right font-semibold">
                        {formatCurrency(txn.amount || 0)}
                      </td>
                      <td className="text-right">
                        {txn.balanceAfter != null
                          ? formatCurrency(txn.balanceAfter)
                          : "—"}
                      </td>
                      <td className="text-xs text-gray-500">
                        {txn.reference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          )}

          {/* Notes Section */}
          <div className="table-card full-width">
            <div className="card-header">
              <AlertTriangle size={18} color="#D97706" />
              <h3>Notes & Comments</h3>
            </div>
            <div style={{ padding: "1rem" }}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this reconciliation..."
                disabled={isFinalized && !canReview}
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  backgroundColor:
                    isFinalized && !canReview ? "#f3f4f6" : "#fff",
                  resize: "vertical",
                  fontFamily: "inherit",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="table-card full-width">
            {/* Status Badge */}
            {isFinalized && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 24px",
                  borderRadius: "24px",
                  backgroundColor: isApproved ? "#dcfce7" : "#fef3c7",
                  margin: "1rem",
                }}
              >
                {isApproved ? (
                  <>
                    <Check size={18} color="#16A34A" />
                    <span
                      style={{
                        color: "#16A34A",
                        fontWeight: 600,
                        marginLeft: 8,
                      }}
                    >
                      Approved
                    </span>
                  </>
                ) : (
                  <>
                    <Lock size={18} color="#D97706" />
                    <span
                      style={{
                        color: "#D97706",
                        fontWeight: 600,
                        marginLeft: 8,
                      }}
                    >
                      Finalized - Awaiting Review
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Clerk Actions - Calculate and Finalize */}
            {!isFinalized && (
              <div style={{ display: "flex", gap: "12px", padding: "1rem" }}>
                <button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <RefreshCw size={18} />
                  {isCalculating ? "Calculating..." : "Calculate"}
                </button>
                <button
                  onClick={async () => {
                    const result = await handleFinalize();
                    if (result?.error === "HAS_DISCREPANCIES") {
                      setShowDiscrepancyConfirm(true);
                    } else if (!result?.success && result?.error) {
                      alert(result.error);
                    }
                  }}
                  disabled={isFinalizing}
                  className={`${hasDiscrepancies ? "btn-danger" : "btn-warning"}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Lock size={18} />
                  {isFinalizing
                    ? "Finalizing..."
                    : hasDiscrepancies
                      ? "Finalize with Discrepancies"
                      : "Finalize & Lock"}
                </button>
              </div>
            )}

            {/* Supervisor/Admin Actions - Approve and Reject */}
            {isFinalized && canReview && !isApproved && (
              <div style={{ display: "flex", gap: "12px", padding: "1rem" }}>
                <button
                  onClick={handleApprove}
                  className="btn-success"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Check size={18} />
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="btn-danger"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <XCircle size={18} />
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="image-modal-overlay"
          onClick={() => setSelectedImage(null)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="modal-close"
            >
              <X size={24} />
            </button>
            <img
              src={selectedImage}
              alt="Balance proof"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      )}

      {/* Discrepancy Confirmation Modal */}
      {showDiscrepancyConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowDiscrepancyConfirm(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, padding: 28 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <ShieldAlert size={28} color="#DC2626" />
              <h2 style={{ margin: 0, fontSize: 20 }}>
                Finalize with Discrepancies?
              </h2>
            </div>
            <p style={{ color: "#6b7280", lineHeight: 1.6, marginBottom: 8 }}>
              There {discrepancyCount === 1 ? "is" : "are"}{" "}
              <strong>{discrepancyCount}</strong> account
              {discrepancyCount !== 1 ? "s" : ""} with balance discrepancies
              totalling{" "}
              <strong>{formatCurrency(totalDiscrepancyAmount)}</strong>.
            </p>
            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              By proceeding, you acknowledge these variances and they will be
              recorded in the reconciliation report. This action cannot be
              undone.
            </p>
            <div
              style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
            >
              <button
                className="btn-cancel"
                onClick={() => setShowDiscrepancyConfirm(false)}
              >
                Go Back & Review
              </button>
              <button
                className="btn-danger"
                onClick={async () => {
                  setShowDiscrepancyConfirm(false);
                  const result = await handleFinalize(true);
                  if (!result?.success && result?.error) {
                    alert(result.error);
                  }
                }}
                disabled={isFinalizing}
              >
                <Lock size={16} />
                {isFinalizing ? "Finalizing..." : "Confirm Finalize"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
