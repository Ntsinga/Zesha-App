import React from "react";
import {
  Banknote,
  RefreshCw,
  TrendingUp,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  RotateCcw,
  Hash,
} from "lucide-react";
import { useCommissionsScreen } from "../../hooks/screens/useCommissionsScreen";
import type { ShiftEnum } from "../../types";
import "../../styles/web.css";

export default function CommissionsPage() {
  const {
    isLoading,
    refreshing,
    filterShift,
    setFilterShift,
    filterAccountId,
    setFilterAccountId,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filteredCommissions,
    accounts,
    metrics,
    onRefresh,
    handleResetFilters,
    formatCurrency,
    formatDateTime,
  } = useCommissionsScreen();

  if (isLoading && filteredCommissions.length === 0) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading expected commissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Expected Commissions</h1>
          <span className="header-date">
            Auto-calculated from transactions
          </span>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={onRefresh}
            disabled={isLoading || refreshing}
          >
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        {/* Summary Cards */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon" style={{ color: "#7c3aed" }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Expected</span>
              <span className="stat-value" style={{ color: "#7c3aed" }}>
                {formatCurrency(metrics.totalCommission)}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: "#22c55e" }}>
              <ArrowDownLeft size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Deposit Commission</span>
              <span className="stat-value">
                {formatCurrency(metrics.depositCommission)}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: "#ef4444" }}>
              <ArrowUpRight size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Withdraw Commission</span>
              <span className="stat-value">
                {formatCurrency(metrics.withdrawCommission)}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Hash size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Transactions</span>
              <span className="stat-value">{metrics.recordCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div
            className="filter-group"
            style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}
          >
            <Filter size={16} />

            {/* Date From */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar size={14} style={{ color: "#64748b" }} />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="filter-select"
                style={{ width: "auto" }}
              />
            </div>
            <span style={{ color: "#94a3b8", fontSize: "13px" }}>to</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="filter-select"
              style={{ width: "auto" }}
            />

            {/* Shift Filter */}
            <select
              value={filterShift}
              onChange={(e) =>
                setFilterShift(e.target.value as ShiftEnum | "ALL")
              }
              className="filter-select"
            >
              <option value="ALL">All Shifts</option>
              <option value="AM">AM Shift</option>
              <option value="PM">PM Shift</option>
            </select>

            {/* Account Filter */}
            <select
              value={filterAccountId ?? ""}
              onChange={(e) =>
                setFilterAccountId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="filter-select"
            >
              <option value="">All Accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Reset */}
            <button
              onClick={handleResetFilters}
              className="btn-icon-sm"
              title="Reset filters"
              style={{ padding: "6px 10px" }}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Expected Commissions Table */}
        {filteredCommissions.length === 0 ? (
          <div className="empty-state">
            <Banknote size={48} className="empty-icon" />
            <h3>No expected commissions</h3>
            <p>
              Commissions are auto-calculated when DEPOSIT or WITHDRAW
              transactions are recorded on accounts with commission rates
            </p>
          </div>
        ) : (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Shift</th>
                  <th>Transaction Amt</th>
                  <th>Rate</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.map((ec) => (
                  <tr key={ec.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {ec.transactionTime
                        ? formatDateTime(ec.transactionTime)
                        : ec.date}
                    </td>
                    <td className="font-medium">
                      {ec.accountName || `Account #${ec.accountId}`}
                    </td>
                    <td>
                      <span
                        className="category-badge"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background:
                            ec.transactionType === "DEPOSIT"
                              ? "rgba(34,197,94,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            ec.transactionType === "DEPOSIT"
                              ? "#22c55e"
                              : "#ef4444",
                          borderColor:
                            ec.transactionType === "DEPOSIT"
                              ? "rgba(34,197,94,0.3)"
                              : "rgba(239,68,68,0.3)",
                        }}
                      >
                        {ec.transactionType === "DEPOSIT" ? (
                          <ArrowDownLeft size={14} />
                        ) : (
                          <ArrowUpRight size={14} />
                        )}
                        {ec.transactionType === "DEPOSIT"
                          ? "Deposit"
                          : "Withdraw"}
                      </span>
                    </td>
                    <td>
                      <span className="shift-badge">{ec.shift}</span>
                    </td>
                    <td>{formatCurrency(ec.transactionAmount)}</td>
                    <td style={{ color: "#7c3aed", fontWeight: 500 }}>
                      {parseFloat(String(ec.commissionRate))}%
                    </td>
                    <td
                      style={{
                        color: "#7c3aed",
                        fontWeight: 600,
                        fontSize: "14px",
                      }}
                    >
                      {formatCurrency(ec.commissionAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
