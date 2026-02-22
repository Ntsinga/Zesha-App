import React from "react";
import { useRouter } from "expo-router";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Camera,
  RefreshCw,
  Banknote,
  PiggyBank,
  Receipt,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useDashboardScreen } from "../../hooks/screens/useDashboardScreen";
import "../../styles/web.css";

/**
 * Web Dashboard - optimized for desktop with CSS classes for maintainability
 */
export default function DashboardWeb() {
  const router = useRouter();
  const {
    isLoading,
    refreshing,
    currentShift,
    snapshotDate,
    accounts,
    totalFloat,
    totalCash,
    grandTotal,
    expectedGrandTotal,
    capitalVariance,
    totalExpenses,
    outstandingBalance,
    totalCommission,
    dailyCommission,
    transactionCount,
    recentTransactions,
    formatCurrency,
    formatCompactCurrency,
    onRefresh,
    handleShiftChange,
  } = useDashboardScreen();

  if (isLoading && !refreshing) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner" />
          <p className="loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Fixed Top Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Dashboard</h1>
          <span className="header-date">{snapshotDate}</span>
        </div>
        <div className="header-right">
          <div className="shift-toggle">
            {(["AM", "PM"] as const).map((shift) => (
              <button
                key={shift}
                onClick={() => handleShiftChange(shift)}
                className={`shift-btn ${
                  currentShift === shift ? "active" : ""
                }`}
              >
                {shift}
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-refresh"
          >
            <RefreshCw className={refreshing ? "spin" : ""} size={18} />
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* Top Section: Grand Total + Key Metrics side by side */}
        <div className="dashboard-top">
          {/* Grand Total Card */}
          <div className="grand-total-card">
            <div className="gt-decor-1" />
            <div className="gt-decor-2" />
            <div className="gt-content">
              <div className="gt-header">
                <Banknote size={22} />
                <span>Total Operating Capital</span>
              </div>
              <p className="gt-amount">{formatCurrency(grandTotal)}</p>
              <div className="gt-breakdown">
                <div className="gt-item">
                  <span className="gt-label">Float</span>
                  <span className="gt-value">
                    {formatCompactCurrency(totalFloat)}
                  </span>
                </div>
                <div className="gt-item">
                  <span className="gt-label">Cash</span>
                  <span className="gt-value">
                    {formatCompactCurrency(totalCash)}
                  </span>
                </div>
                <div className="gt-item">
                  <span className="gt-label">Outstanding</span>
                  <span className="gt-value">
                    {formatCompactCurrency(outstandingBalance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Card - Combined */}
          <div className="metrics-card">
            <h3 className="metrics-title">Key Metrics</h3>
            <div className="metrics-content">
              <div className="metric">
                <div className="metric-top">
                  <span className="metric-name">Variance</span>
                  <div
                    className={`metric-badge ${
                      capitalVariance >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {capitalVariance >= 0 ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}
                  </div>
                </div>
                <p
                  className={`metric-amount ${
                    capitalVariance >= 0 ? "positive" : "negative"
                  }`}
                >
                  {capitalVariance >= 0 ? "+" : ""}
                  {formatCurrency(capitalVariance)}
                </p>
                <span className="metric-sub">
                  vs expected {formatCompactCurrency(expectedGrandTotal)}
                </span>
              </div>
              <div className="metric-divider" />
              <div className="metric">
                <div className="metric-top">
                  <span className="metric-name">Expenses</span>
                  <div className="metric-badge negative">
                    <Receipt size={16} />
                  </div>
                </div>
                <p className="metric-amount negative">
                  -{formatCurrency(totalExpenses)}
                </p>
                <button
                  onClick={() => router.push("/expenses")}
                  className="metric-link"
                >
                  View Details →
                </button>
              </div>
              <div className="metric-divider" />
              <div className="metric">
                <div className="metric-top">
                  <span className="metric-name">Commission</span>
                  <div className="metric-badge positive">
                    <DollarSign size={16} />
                  </div>
                </div>
                <p className="metric-amount positive">
                  +{formatCurrency(dailyCommission)}
                </p>
                <span className="metric-sub">
                  Total: {formatCurrency(totalCommission)}
                </span>
              </div>
              <div className="metric-divider" />
              <div className="metric">
                <div className="metric-top">
                  <span className="metric-name">Transactions</span>
                  <div className="metric-badge" style={{ backgroundColor: "#e0e7ff", color: "#4f46e5" }}>
                    <ArrowLeftRight size={16} />
                  </div>
                </div>
                <p className="metric-amount" style={{ color: "#4f46e5" }}>
                  {transactionCount}
                </p>
                <button
                  onClick={() => router.push("/transactions")}
                  className="metric-link"
                >
                  View All →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Table + Quick Actions */}
        <div className="dashboard-bottom">
          {/* Accounts Table */}
          <div className="table-card">
            <div className="table-header">
              <h3>Current Balances</h3>
              <button
                onClick={() => router.push("/balance")}
                className="btn-add"
              >
                <Wallet size={16} />
                Add Float Balance
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Shift</th>
                  <th>Balance</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, idx) => (
                  <tr key={`account-${idx}`}>
                    <td>{account.accountName}</td>
                    <td>
                      <span
                        className={`shift-badge ${
                          account.shift === "AM" ? "am" : "pm"
                        }`}
                      >
                        {account.shift}
                      </span>
                    </td>
                    <td className="amount">
                      {formatCurrency(account.balance || 0)}
                    </td>
                    <td>
                      <button className="btn-view">
                        <Camera size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      <PiggyBank size={40} />
                      <p>No balances recorded for this shift</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="actions-card">
            <h3>Quick Actions</h3>
            <div className="actions-list">
              <button
                onClick={() => router.push("/balance")}
                className="action-btn primary"
              >
                <Wallet size={20} />
                <span>Daily Reconciliation</span>
              </button>
              <button
                onClick={() => router.push("/transactions")}
                className="action-btn"
              >
                <ArrowLeftRight size={20} />
                <span>Record Transaction</span>
              </button>
              <button
                onClick={() => router.push("/add-cash-count")}
                className="action-btn"
              >
                <Banknote size={20} />
                <span>Cash Count</span>
              </button>
              <button
                onClick={() => router.push("/expenses")}
                className="action-btn"
              >
                <Receipt size={20} />
                <span>Add Expense</span>
              </button>
              <button
                onClick={() => router.push("/history")}
                className="action-btn"
              >
                <TrendingUp size={20} />
                <span>View History</span>
              </button>
            </div>

            {/* Recent Transactions Feed */}
            {recentTransactions.length > 0 && (
              <>
                <h3 style={{ marginTop: 24 }}>Recent Transactions</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                        borderRadius: 10,
                        backgroundColor: "#f8fafc",
                        border: "1px solid #f1f5f9",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor:
                            txn.transactionType === "DEPOSIT"
                              ? "#dcfce7"
                              : txn.transactionType === "WITHDRAW"
                                ? "#fef2f2"
                                : "#e0e7ff",
                        }}
                      >
                        {txn.transactionType === "DEPOSIT" ? (
                          <ArrowDownCircle size={14} color="#16a34a" />
                        ) : txn.transactionType === "WITHDRAW" ? (
                          <ArrowUpCircle size={14} color="#dc2626" />
                        ) : (
                          <ArrowLeftRight size={14} color="#4f46e5" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#1e293b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {txn.account?.name || `Account ${txn.accountId}`}
                        </div>
                        <div
                          style={{ fontSize: 11, color: "#94a3b8" }}
                        >
                          {txn.transactionType === "FLOAT_PURCHASE"
                            ? "Float"
                            : txn.transactionType}{" "}
                          · {txn.shift}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color:
                            txn.transactionType === "DEPOSIT"
                              ? "#16a34a"
                              : txn.transactionType === "WITHDRAW"
                                ? "#dc2626"
                                : "#4f46e5",
                        }}
                      >
                        {txn.transactionType === "WITHDRAW" ? "-" : "+"}
                        {formatCurrency(txn.amount || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
