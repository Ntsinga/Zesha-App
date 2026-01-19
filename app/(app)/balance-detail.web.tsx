import React from "react";
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
} from "lucide-react";
import { useBalanceDetailScreen } from "../../hooks/screens/useBalanceDetailScreen";
import type { ShiftEnum } from "../../types";
import "../../styles/web.css";

export default function BalanceDetailWeb() {
  // Get params from URL
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const date = urlParams.get("date") || new Date().toISOString().split("T")[0];
  const shift = (urlParams.get("shift") as ShiftEnum) || "AM";

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
  } = useBalanceDetailScreen({ date, shift });

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
                          `Account ${commission.account_id}`}
                      </td>
                      <td className="text-right font-semibold">
                        {formatCurrency(commission.amount)}
                      </td>
                      <td className="text-center">
                        {(commission.image_data || commission.image_url) && (
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
                          `Account ${balance.account_id}`}
                      </td>
                      <td className="text-xs text-gray-500">
                        {balance.source}
                      </td>
                      <td className="text-right font-semibold">
                        {formatCurrency(balance.amount)}
                      </td>
                      <td className="text-center">
                        {(balance.image_data || balance.image_url) && (
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
