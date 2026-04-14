import React from "react";
import { useRouter } from "expo-router";
import {
  Wallet,
  RefreshCw,
  Banknote,
  PiggyBank,
  Receipt,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  CheckCircle,
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
    snapshotDate,
    accounts,
    displayVariance,
    totalExpenses,
    todayExpenses,
    dailyCommission,
    totalBankCommission,
    totalTelecomCommission,
    transactionCount,
    topTransactionAccount,
    topCommissionAccount,
    commissionByAccountId,
    transactionCountsByAccountToday,
    displayCapital,
    displayFloat,
    displayCash,
    capitalLabel,
    liveGrandTotal,
    formatCurrency,
    formatCompactCurrency,
    onRefresh,
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
              <p className="gt-amount">{formatCurrency(displayCapital)}</p>
              <div className="gt-breakdown">
                <div className="gt-item">
                  <span className="gt-label">Float</span>
                  <span className="gt-value">
                    {formatCurrency(displayFloat)}
                  </span>
                </div>
                <div className="gt-item">
                  <span className="gt-label">Cash</span>
                  <span className="gt-value">
                    {formatCurrency(displayCash)}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {liveGrandTotal !== null && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "#4ade80",
                      display: "inline-block",
                      flexShrink: 0,
                      animation: "pulse 2s infinite",
                    }}
                  />
                )}
                <span style={{ fontSize: 11, color: "#6b7280" }}>
                  {capitalLabel}
                </span>
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
                      displayVariance >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {displayVariance >= 0 ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}
                  </div>
                </div>
                <p
                  className={`metric-amount ${
                    displayVariance >= 0 ? "positive" : "negative"
                  }`}
                >
                  {displayVariance >= 0 ? "+" : ""}
                  {formatCurrency(displayVariance)}
                </p>
              </div>
              <div className="metric-divider" />
              <div className="metric">
                <div className="metric-top">
                  <span className="metric-name">Expenses</span>
                  <div
                    className={`metric-badge ${totalExpenses > 0 ? "negative" : "positive"}`}
                  >
                    <Receipt size={16} />
                  </div>
                </div>
                <p
                  className={`metric-amount ${totalExpenses > 0 ? "negative" : "positive"}`}
                >
                  {totalExpenses > 0 ? "-" : totalExpenses < 0 ? "+" : ""}
                  {formatCurrency(Math.abs(totalExpenses))}
                </p>
                <div className="metric-footer">
                  <span className="metric-sub">
                    Today{" "}
                    <span
                      className={
                        todayExpenses > 0
                          ? "metric-sub-value-neg"
                          : "metric-sub-value"
                      }
                    >
                      {formatCompactCurrency(todayExpenses)}
                    </span>
                  </span>
                  <button
                    onClick={() => router.push("/expenses")}
                    className="metric-link"
                  >
                    View Details →
                  </button>
                </div>
              </div>
              <div className="metric-divider" />
              <div className="metric">
                <div className="metric-top">
                  <span className="metric-name">Daily Commission</span>
                  <div className="metric-badge positive">
                    <DollarSign size={16} />
                  </div>
                </div>
                <p className="metric-amount positive">
                  +{formatCurrency(dailyCommission)}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 4,
                    fontSize: 11,
                    color: "#64748b",
                  }}
                >
                  <CheckCircle size={11} color="#16a34a" />
                  <span>
                    Bank: {formatCompactCurrency(totalBankCommission)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 2,
                    fontSize: 11,
                    color: "#64748b",
                  }}
                >
                  <CheckCircle size={11} color="#16a34a" />
                  <span>
                    Telecom: {formatCompactCurrency(totalTelecomCommission)}
                  </span>
                </div>
                <div className="metric-footer">
                  {topCommissionAccount ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(22,163,74,0.08)",
                        borderRadius: "6px",
                        padding: "5px 8px",
                        gap: 8,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#15803d",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {topCommissionAccount.accountName}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#16a34a",
                          flexShrink: 0,
                        }}
                      >
                        +
                        {formatCompactCurrency(
                          topCommissionAccount.commissionAmount,
                        )}
                      </span>
                    </div>
                  ) : (
                    <span className="metric-sub">No commission yet</span>
                  )}
                  <button
                    onClick={() => router.push("/commissions")}
                    className="metric-link"
                  >
                    View Details →
                  </button>
                </div>
              </div>
              <div className="metric-divider" />
              <div className="metric">
                <div className="metric-top">
                  <span className="metric-name">Transactions</span>
                  <div
                    className="metric-badge"
                    style={{ backgroundColor: "#e0e7ff", color: "#4f46e5" }}
                  >
                    <ArrowLeftRight size={16} />
                  </div>
                </div>
                <p className="metric-amount" style={{ color: "#4f46e5" }}>
                  {transactionCount}
                </p>
                <div className="metric-footer">
                  {topTransactionAccount ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(79,70,229,0.08)",
                        borderRadius: "6px",
                        padding: "5px 8px",
                        gap: 8,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#4338ca",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {topTransactionAccount.accountName}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#4f46e5",
                          flexShrink: 0,
                        }}
                      >
                        {topTransactionAccount.transactionCount} txns
                      </span>
                    </div>
                  ) : (
                    <span className="metric-sub">today</span>
                  )}
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
        </div>

        {/* Bottom Section: Current Balances */}
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
                  <th style={{ textAlign: "right" }}>Current Balance</th>
                  <th style={{ textAlign: "right" }}>Commission Today</th>
                  <th style={{ textAlign: "right" }}>Txns Today</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, idx) => {
                  const commission =
                    commissionByAccountId.get(account.accountId) ?? 0;
                  const txnCount =
                    transactionCountsByAccountToday.get(account.accountId) ?? 0;
                  return (
                    <tr key={`account-${idx}`}>
                      <td>{account.accountName}</td>
                      <td className="amount">
                        {formatCurrency(account.balance || 0)}
                      </td>
                      <td
                        className="amount"
                        style={{
                          color:
                            commission > 0
                              ? "var(--color-success)"
                              : "var(--color-text-muted)",
                        }}
                      >
                        {commission > 0
                          ? `+${formatCurrency(commission)}`
                          : "—"}
                      </td>
                      <td
                        className="amount"
                        style={{
                          color:
                            txnCount > 0
                              ? "#4f46e5"
                              : "var(--color-text-muted)",
                        }}
                      >
                        {txnCount > 0 ? txnCount : "—"}
                      </td>
                    </tr>
                  );
                })}
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty">
                      <PiggyBank size={40} />
                      <p>No accounts found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
