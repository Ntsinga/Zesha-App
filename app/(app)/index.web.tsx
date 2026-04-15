import React, { useMemo } from "react";
import { useRouter } from "expo-router";
import { Wallet, RefreshCw, Banknote } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
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
    totalPendingExpenses,
    topCommissionAccounts,
    chartTransactionAccounts,
    dailyCommission,
    totalBankCommission,
    totalTelecomCommission,
    displayCapital,
    displayFloat,
    displayCash,
    capitalLabel,
    liveGrandTotal,
    commissionDailyTotals,
    transactionDailyData,
    expensesByCategory,
    formatCurrency,
    formatCompactCurrency,
    onRefresh,
    chartPeriod,
    setChartPeriod,
  } = useDashboardScreen();

  // Pie chart data: commission by account
  const commissionPieData = topCommissionAccounts.map((entry) => ({
    name: entry.accountName,
    value: entry.commissionAmount,
  }));

  const commissionPieTotal = commissionPieData.reduce((s, d) => s + d.value, 0);

  // Pie chart data: commission by category (Bank / Telecom)
  const commissionCategoryData = [
    ...(totalBankCommission > 0
      ? [{ name: "Bank", value: totalBankCommission }]
      : []),
    ...(totalTelecomCommission > 0
      ? [{ name: "Telecom", value: totalTelecomCommission }]
      : []),
  ];
  const CATEGORY_COLORS = ["#4f46e5", "#16a34a"];

  // Bar chart data: period-aware from analytics
  const transactionBarData = chartTransactionAccounts.map((entry) => ({
    name: entry.accountName,
    count: entry.transactionCount,
  }));

  // Commission over time line chart data
  const commissionLineData = useMemo(() => {
    if (chartPeriod === "year") {
      // Build all 12 month slots ending this month
      const now = new Date();
      const slots: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        slots.push(key);
      }
      const monthMap: Record<string, number> = {};
      commissionDailyTotals.forEach((d) => {
        const key = d.date.slice(0, 7); // "YYYY-MM"
        monthMap[key] = (monthMap[key] ?? 0) + d.totalExpectedCommission;
      });
      return slots.map((key) => ({
        date: new Date(key + "-01").toLocaleString("default", {
          month: "short",
          year: "2-digit",
        }),
        commission: monthMap[key] ?? 0,
      }));
    }
    return commissionDailyTotals.map((d) => ({
      date: d.date.slice(5),
      commission: d.totalExpectedCommission,
    }));
  }, [commissionDailyTotals, chartPeriod]);

  // Transaction daily area chart data
  const transactionDailyChartData = useMemo(() => {
    if (chartPeriod === "year") {
      const now = new Date();
      const slots: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        slots.push(key);
      }
      const monthMap: Record<
        string,
        { deposits: number; withdrawals: number }
      > = {};
      transactionDailyData.forEach((d) => {
        const key = d.date.slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { deposits: 0, withdrawals: 0 };
        monthMap[key].deposits += d.totalDeposits;
        monthMap[key].withdrawals += d.totalWithdrawals;
      });
      return slots.map((key) => ({
        date: new Date(key + "-01").toLocaleString("default", {
          month: "short",
          year: "2-digit",
        }),
        deposits: monthMap[key]?.deposits ?? 0,
        withdrawals: monthMap[key]?.withdrawals ?? 0,
      }));
    }
    return transactionDailyData.map((d) => ({
      date: d.date.slice(5),
      deposits: d.totalDeposits,
      withdrawals: d.totalWithdrawals,
    }));
  }, [transactionDailyData, chartPeriod]);

  const PERIOD_LABELS: Record<string, string> = {
    today: "Today",
    week: "Last 7 Days",
    month: "Last 30 Days",
    year: "Past Year",
  };

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
        {/* === Full-width Grand Total Strip === */}
        <div className="gt-strip">
          <div className="gt-strip-main">
            <Banknote size={20} />
            <div className="gt-strip-title-group">
              <span className="gt-strip-label">Total Operating Capital</span>
              <span className="gt-strip-amount">
                {formatCurrency(displayCapital)}
              </span>
            </div>
          </div>
          <div className="gt-strip-metrics">
            <div className="gt-strip-metric">
              <span className="gt-strip-metric-label">Float</span>
              <span className="gt-strip-metric-value">
                {formatCurrency(displayFloat)}
              </span>
            </div>
            <div className="gt-strip-metric">
              <span className="gt-strip-metric-label">Cash</span>
              <span className="gt-strip-metric-value">
                {formatCurrency(displayCash)}
              </span>
            </div>
            <div className="gt-strip-metric-divider" />
            <div className="gt-strip-metric">
              <span className="gt-strip-metric-label">Loss</span>
              <span
                className={`gt-strip-metric-value ${displayVariance >= 0 ? "positive" : "negative"}`}
              >
                {displayVariance >= 0 ? "+" : ""}
                {formatCurrency(displayVariance)}
              </span>
            </div>
            <div className="gt-strip-metric">
              <span className="gt-strip-metric-label">Expected</span>
              <span className="gt-strip-metric-value">
                {formatCurrency(expectedGrandTotal)}
              </span>
            </div>
            <div className="gt-strip-metric">
              <span className="gt-strip-metric-label">Total Expenses</span>
              <span
                className={`gt-strip-metric-value ${totalPendingExpenses > 0 ? "negative" : ""}`}
              >
                {totalPendingExpenses > 0 ? "-" : ""}
                {formatCurrency(Math.abs(totalPendingExpenses))}
              </span>
            </div>
            {todayExpenses > 0 && (
              <div className="gt-strip-metric">
                <span className="gt-strip-metric-label">Today's Expenses</span>
                <span className="gt-strip-metric-value negative">
                  -{formatCurrency(todayExpenses)}
                </span>
              </div>
            )}
            <div className="gt-strip-metric-divider" />
            <div className="gt-strip-metric">
              <span className="gt-strip-metric-label">Net Profit</span>
              <span
                className={`gt-strip-metric-value ${expectedGrandTotal - totalPendingExpenses >= 0 ? "positive" : "negative"}`}
              >
                {expectedGrandTotal - totalPendingExpenses >= 0 ? "+" : ""}
                {formatCurrency(expectedGrandTotal - totalPendingExpenses)}
              </span>
            </div>
          </div>
          <div className="gt-strip-live">
            {liveGrandTotal !== null && <span className="gt-live-dot" />}
            <span className="gt-strip-live-label">{capitalLabel}</span>
          </div>
        </div>

        {/* === Horizontal Scrollable Balance Pills === */}
        <div className="balance-pills-container">
          {accounts.map((account) => (
            <div key={account.accountId} className="balance-pill">
              <span className="balance-pill-name">{account.accountName}</span>
              <span className="balance-pill-amount">
                {formatCurrency(account.balance || 0)}
              </span>
            </div>
          ))}
          {accounts.length === 0 && (
            <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
              No accounts
            </span>
          )}
        </div>

        {/* === Chart Section === */}
        <div className="dashboard-charts-section">
          {/* Filter Pills */}
          <div className="chart-filter-bar">
            {(["today", "week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                className={`chart-filter-btn${chartPeriod === p ? " active" : ""}`}
                onClick={() => setChartPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {/* 2×2 Chart Grid */}
          <div className="dashboard-charts-grid">
            {/* Top-left: Commission Pie Charts */}
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
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={commissionPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                          minAngle={5}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
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
                          formatter={(value) => {
                            const amt = typeof value === "number" ? value : 0;
                            return formatCurrency(amt);
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">
                      <p>No data for this period</p>
                    </div>
                  )}
                </div>

                <div className="commission-chart-divider" />

                {/* By Category */}
                <div className="commission-chart-col">
                  <p className="commission-chart-subtitle">By Category</p>
                  {commissionCategoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={commissionCategoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={68}
                          paddingAngle={3}
                          dataKey="value"
                          minAngle={5}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
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
                          formatter={(value) => {
                            const amt = typeof value === "number" ? value : 0;
                            return formatCurrency(amt);
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="chart-empty">
                      <p>No data for this period</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top-right: Transactions Bar Chart */}
            <div className="chart-card">
              <h3 className="chart-title">Transactions by Account</h3>
              {transactionBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={transactionBarData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#6b7280" }}
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
                  <p>No transactions for this period</p>
                </div>
              )}
            </div>

            {/* Bottom-left: Commission Over Time (Line Chart) */}
            <div className="chart-card">
              <h3 className="chart-title">Commission Over Time</h3>
              {commissionLineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={commissionLineData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                      }}
                      formatter={(value) => {
                        const amt = typeof value === "number" ? value : 0;
                        return [formatCurrency(amt), "Commission"];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="commission"
                      stroke="#c0152a"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#c0152a" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <p>No commission data for this period</p>
                </div>
              )}
            </div>

            {/* Bottom-right: Expenses by Category (Pie Chart) */}
            <div className="chart-card">
              <h3 className="chart-title">Expenses by Category</h3>
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      minAngle={5}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(1)}%`
                      }
                      labelLine={false}
                    >
                      {expensesByCategory.map((_entry, index) => (
                        <Cell
                          key={`exp-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => {
                        const amt = typeof value === "number" ? value : 0;
                        return formatCurrency(amt);
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
                  <p>No expense data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
