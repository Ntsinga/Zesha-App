import React from "react";
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
} from "lucide-react";
import { useReconciliationScreen } from "../../hooks/screens/useReconciliationScreen";
import type { ShiftEnum } from "../../types";
import "../../styles/web.css";

export default function BalanceDetailWeb() {
  // Get params from Expo Router (reactive, works with router.push)
  const params = useLocalSearchParams<{ date: string; shift: string }>();
  const date = params.date || "";
  const shift = (params.shift as ShiftEnum) || "AM";

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
    // New reconciliation functionality
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
  } = useReconciliationScreen({ date, shift });

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
          <p>Loading balance details...</p>
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

          {/* Commissions Card */}
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
        </div>

        {/* Detail Tables */}
        <div className="detail-grid">
          {/* Commissions Table */}
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

          {/* Balances Table */}
          <div className="table-card">
            <div className="card-header">
              <Wallet size={18} />
              <h3>Account Balances ({balances.length})</h3>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Source</th>
                  <th className="text-right">Amount</th>
                  <th className="text-center">Image</th>
                </tr>
              </thead>
              <tbody>
                {balances.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty">
                      No balances recorded
                    </td>
                  </tr>
                ) : (
                  balances.map((balance) => (
                    <tr key={balance.id}>
                      <td>
                        {balance.account?.name ||
                          `Account ${balance.accountId}`}
                      </td>
                      <td className="text-xs text-gray-500">
                        {balance.source}
                      </td>
                      <td className="text-right font-semibold">
                        {formatCurrency(balance.amount)}
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
                  ))
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
                      <td>R{(cc.denomination / 100).toFixed(0)}</td>
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
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="btn-warning"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Lock size={18} />
                  {isFinalizing ? "Finalizing..." : "Finalize & Lock"}
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
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
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
    </div>
  );
}
