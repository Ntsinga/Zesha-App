import React from "react";
import { useRouter } from "expo-router";
import {
  Wallet,
  RefreshCw,
  Banknote,
  PiggyBank,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useDashboardScreen } from "../../hooks/screens/useDashboardScreen";
import "../../styles/web.css";

const CHART_COLORS = [
  "#c0152a",
  "#f59e0b",
  "#16a34a",
  "#4f46e5",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

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
    expectedGrandTotal,
    totalExpenses,
    todayExpenses,
    commissionByAccountId,
    transactionCountsByAccountToday,
    topCommissionAccounts,
    topTransactionAccounts,
    dailyCommission,
    totalBankCommission,
    totalTelecomCommission,
    displayCapital,
    displayFloat,
    displayCash,
    capitalLabel,
    liveGrandTotal,
    formatCurrency,
    formatCompactCurrency,
    onRefresh,
  } = useDashboardScreen();

  // Pie chart data: commission by account
  const commissionPieData = topCommissionAccounts.map((entry) => ({
    name: entry.accountName,
    value: entry.commissionAmount,
  }));

  // Total from the actual pie data to ensure the displayed total matches the slices
  const commissionPieTotal = commissionPieData.reduce((s, d) => s + d.value, 0);

  // Pie chart data: commission by category
  const commissionCategoryData = [
    ...(totalBankCommission > 0
      ? [{ name: "Bank", value: totalBankCommission }]
      : []),
    ...(totalTelecomCommission > 0
      ? [{ name: "Telecom", value: totalTelecomCommission }]
      : []),
  ];
  const CATEGORY_COLORS = ["#4f46e5", "#16a34a"];

  // Bar chart data: transactions by account
  const transactionBarData = topTransactionAccounts.map((entry) => ({
    name: entry.accountName,
    count: entry.transactionCount,
  }));

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
        {/* Top Section: Grand Total + Commission Pie Chart */}
        <div className="dashboard-top">
          {/* Grand Total Card — now includes Variance & Expenses */}
          <div className="grand-total-card">
            <div className="gt-decor-1" />
            <div className="gt-decor-2" />
            <div className="gt-content">
              <div className="gt-header">
                <Banknote size={22} />
                <span>Total Operating Capital</span>
              </div>
              <div className="gt-amount-row">
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
              </div>

              {/* Loss, Expected & Expenses inline */}
              <div className="gt-metrics-row">
                <div className="gt-metric">
                  <div className="gt-metric-top">
                    <span className="gt-metric-label">Loss</span>
                    <div
                      className={`metric-badge ${displayVariance >= 0 ? "positive" : "negative"}`}
                    >
                      {displayVariance >= 0 ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                    </div>
                  </div>
                  <span
                    className={`gt-metric-value ${displayVariance >= 0 ? "positive" : "negative"}`}
                  >
                    {displayVariance >= 0 ? "+" : ""}
                    {formatCurrency(displayVariance)}
                  </span>
                </div>
                <div className="gt-metric">
                  <div className="gt-metric-top">
                    <span className="gt-metric-label">Expected</span>
                  </div>
                  <span className="gt-metric-value">
                    {formatCurrency(expectedGrandTotal)}
                  </span>
                </div>
                <div className="gt-metric">
                  <div className="gt-metric-top">
                    <span className="gt-metric-label">Expenses</span>
                    <div
                      className={`metric-badge ${totalExpenses > 0 ? "negative" : "positive"}`}
                    >
                      <Receipt size={14} />
                    </div>
                  </div>
                  <span
                    className={`gt-metric-value ${totalExpenses > 0 ? "negative" : "positive"}`}
                  >
                    {totalExpenses > 0 ? "-" : ""}
                    {formatCurrency(Math.abs(totalExpenses))}
                  </span>
                  <span className="gt-metric-sub">
                    Today {formatCompactCurrency(todayExpenses)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
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
                <span style={{ fontSize: 13, color: "#6b7280" }}>
                  {capitalLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Commission Charts Card */}
          <div className="chart-card">
            <div className="commission-chart-header">
              <h3 className="chart-title" style={{ margin: 0 }}>
                Commission
              </h3>
              <span className="commission-total">
                {formatCurrency(commissionPieTotal)}
              </span>
            </div>
            <div className="commission-charts-row">
              {/* By Account */}
              <div className="commission-chart-col">
                <p className="commission-chart-subtitle">By Account</p>
                {commissionPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={commissionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        minAngle={5}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(2)}%`
                        }
                        labelLine={false}
                      >
                        {commissionPieData.map((_entry, index) => (
                          <Cell
                            key={`cell-acc-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, props) => {
                          const amt = typeof value === "number" ? value : 0;
                          const pct = (
                            (props.payload.percent ?? 0) * 100
                          ).toFixed(2);
                          return `${formatCurrency(amt)} (${pct}%)`;
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    <p>No data today</p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="commission-chart-divider" />

              {/* By Category */}
              <div className="commission-chart-col">
                <p className="commission-chart-subtitle">By Category</p>
                {commissionCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={commissionCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        minAngle={5}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(2)}%`
                        }
                        labelLine={false}
                      >
                        {commissionCategoryData.map((_entry, index) => (
                          <Cell
                            key={`cell-cat-${index}`}
                            fill={
                              CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, props) => {
                          const amt = typeof value === "number" ? value : 0;
                          const pct = (
                            (props.payload.percent ?? 0) * 100
                          ).toFixed(2);
                          return `${formatCurrency(amt)} (${pct}%)`;
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">
                    <p>No data today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Bar Chart (left) + Current Balances (right) */}
        <div className="dashboard-bottom-split">
          {/* Transactions Bar Chart */}
          <div className="chart-card">
            <h3 className="chart-title">Transactions by Account</h3>
            {transactionBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={transactionBarData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      fontSize: 13,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Transactions"
                    radius={[6, 6, 0, 0]}
                  >
                    {transactionBarData.map((_entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">
                <p>No transactions today</p>
              </div>
            )}
          </div>

          {/* Current Balances Table */}
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
