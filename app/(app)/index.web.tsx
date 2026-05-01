import React, { useMemo } from "react";
import { Wallet, RefreshCw } from "lucide-react";
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
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
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

const CATEGORY_COLORS = {
  BANK: "#4f46e5",
  TELECOM: "#16a34a",
} as const;

const CATEGORY_ACCOUNT_COLORS = {
  BANK: ["#4f46e5", "#0ea5e9", "#8b5cf6", "#f59e0b"],
  TELECOM: ["#16a34a", "#c0152a", "#14b8a6", "#f59e0b"],
} as const;

/**
 * Web Dashboard - optimized for desktop with CSS classes for maintainability
 */
export default function DashboardWeb() {
  const {
    isLoading,
    isInitializing,
    hasCoreDashboardData,
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
    commissionBreakdown,
    totalBankCommission,
    totalTelecomCommission,
    displayCapital,
    displayFloat,
    displayCash,
    capitalLabel,
    liveGrandTotal,
    commissionDailyTotals,
    netEarningsTrendData,
    formatCurrency,
    formatCompactCurrency,
    onRefresh,
    chartPeriod,
    setChartPeriod,
  } = useDashboardScreen();

  const commissionCategoryData = useMemo(() => {
    const items: {
      name: string;
      category: "BANK" | "TELECOM";
      value: number;
      fill: string;
    }[] = [];

    if (totalTelecomCommission > 0) {
      items.push({
        name: "Telecom",
        category: "TELECOM",
        value: totalTelecomCommission,
        fill: CATEGORY_COLORS.TELECOM,
      });
    }

    if (totalBankCommission > 0) {
      items.push({
        name: "Bank",
        category: "BANK",
        value: totalBankCommission,
        fill: CATEGORY_COLORS.BANK,
      });
    }

    return items;
  }, [totalBankCommission, totalTelecomCommission]);

  const commissionChartTotal = commissionCategoryData.reduce(
    (sum, entry) => sum + entry.value,
    0,
  );

  const commissionAccountData = useMemo(() => {
    let bankIndex = 0;
    let telecomIndex = 0;

    const sourceAccounts =
      commissionBreakdown.length > 0
        ? [...commissionBreakdown]
            .filter((entry) => entry.totalExpectedCommission > 0)
            .sort(
              (left, right) =>
                right.totalExpectedCommission - left.totalExpectedCommission,
            )
            .slice(0, 6)
            .map((entry) => ({
              name: entry.accountName,
              category: entry.accountType,
              value: entry.totalExpectedCommission,
            }))
        : topCommissionAccounts.map((entry) => ({
            name: entry.accountName,
            category: entry.accountType,
            value: entry.commissionAmount,
          }));

    return sourceAccounts.map((entry) => {
      const palette = CATEGORY_ACCOUNT_COLORS[entry.category];
      const colorIndex =
        entry.category === "BANK" ? bankIndex++ : telecomIndex++;
      return {
        name: entry.name,
        category: entry.category,
        value: entry.value,
        fill: palette[colorIndex % palette.length],
      };
    });
  }, [commissionBreakdown, topCommissionAccounts]);

  // Bar chart data: period-aware from analytics
  const transactionBarData = chartTransactionAccounts.map((entry) => ({
    name: entry.accountName,
    count: entry.transactionCount,
  }));

  const netEarningsTotal = netEarningsTrendData.reduce(
    (sum, entry) => sum + entry.netEarnings,
    0,
  );

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

  const PERIOD_LABELS: Record<string, string> = {
    today: "Today",
    week: "Last 7 Days",
    month: "Last 30 Days",
    year: "Past Year",
  };

  if (isInitializing || (!hasCoreDashboardData && isLoading && !refreshing)) {
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
      </header>

      {/* Dashboard Content */}
      <div className="dashboard-content">
        {/* === Full-width Grand Total Strip === */}
        <div className="gt-strip">
          <div className="gt-strip-main">
            <div className="gt-strip-title-group">
              <span className="gt-strip-label">Total Operating Capital</span>
              <span className="gt-strip-amount">
                {formatCurrency(displayCapital)}
              </span>
            </div>
          </div>
          <div className="gt-strip-metrics">
            {/* Group: Available */}
            <div className="gt-strip-group">
              <span className="gt-strip-group-label">Available</span>
              <div className="gt-strip-group-items">
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
              </div>
            </div>
            <div className="gt-strip-metric-divider" />
            {/* Group: Projection */}
            <div className="gt-strip-group">
              <span className="gt-strip-group-label">Performance</span>
              <div className="gt-strip-group-items">
                <div className="gt-strip-metric">
                  <span className="gt-strip-metric-label">Expected</span>
                  <span className="gt-strip-metric-value">
                    {formatCurrency(expectedGrandTotal)}
                  </span>
                </div>
                <div className="gt-strip-metric">
                  <span className="gt-strip-metric-label">
                    {displayVariance > 0 ? "Excess" : "Loss"}
                  </span>
                  <span
                    className={`gt-strip-metric-value ${displayVariance >= 0 ? "positive" : "negative"}`}
                  >
                    {displayVariance >= 0 ? "+" : ""}
                    {formatCurrency(displayVariance)}
                  </span>
                </div>
              </div>
            </div>
            <div className="gt-strip-metric-divider" />
            {/* Group: Outflow */}
            <div className="gt-strip-group">
              <span className="gt-strip-group-label">
                Outflow
                {totalPendingExpenses > 0 &&
                  displayCapital > 0 &&
                  totalPendingExpenses / displayCapital > 0.3 && (
                    <span className="gt-strip-expense-badge">
                      {Math.round(
                        (totalPendingExpenses / displayCapital) * 100,
                      )}
                      % of capital
                    </span>
                  )}
              </span>
              <div className="gt-strip-group-items">
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
                    <span className="gt-strip-metric-label">Today</span>
                    <span className="gt-strip-metric-value negative">
                      -{formatCurrency(todayExpenses)}
                    </span>
                  </div>
                )}
              </div>
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
            {/* Top-left: Combined Commission Donut */}
            <div className="chart-card">
              <div className="commission-chart-header">
                <h3 className="chart-title" style={{ margin: 0 }}>
                  Commission
                </h3>
                <span className="commission-total">
                  {formatCurrency(commissionChartTotal)}
                  <span className="commission-total-label">total</span>
                </span>
              </div>
              <p className="commission-mix-note">
                Inner ring shows category. Outer ring shows the top earning
                accounts.
              </p>
              {commissionAccountData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={commissionCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={70}
                        dataKey="value"
                        stroke="none"
                      >
                        {commissionCategoryData.map((entry) => (
                          <Cell
                            key={`category-${entry.category}`}
                            fill={entry.fill}
                          />
                        ))}
                      </Pie>
                      <Pie
                        data={commissionAccountData}
                        cx="50%"
                        cy="50%"
                        innerRadius={82}
                        outerRadius={112}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        labelLine={false}
                        label={(props: PieLabelRenderProps) => {
                          const {
                            value = 0,
                            cx = 0,
                            cy = 0,
                            midAngle = 0,
                            outerRadius = 112,
                          } = props;
                          const numValue = Number(value) || 0;
                          const pct =
                            commissionChartTotal > 0
                              ? Math.round(
                                  (numValue / commissionChartTotal) * 100,
                                )
                              : 0;
                          if (pct < 5) return null;
                          const RADIAN = Math.PI / 180;
                          const radius = (Number(outerRadius) || 112) + 18;
                          const x =
                            Number(cx) +
                            radius * Math.cos(-Number(midAngle) * RADIAN);
                          const y =
                            Number(cy) +
                            radius * Math.sin(-Number(midAngle) * RADIAN);
                          return (
                            <text
                              x={x}
                              y={y}
                              textAnchor={x > cx ? "start" : "end"}
                              dominantBaseline="central"
                              fontSize={11}
                              fill="#6b7280"
                              fontWeight={600}
                            >
                              {pct}%
                            </text>
                          );
                        }}
                      >
                        {commissionAccountData.map((entry, index) => (
                          <Cell
                            key={`account-${entry.name}-${index}`}
                            fill={entry.fill}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, item) => {
                          const amount = typeof value === "number" ? value : 0;
                          const payload = item.payload as {
                            name: string;
                            category?: "BANK" | "TELECOM";
                          };
                          const label = payload.category
                            ? `${payload.name} (${payload.category === "BANK" ? "Bank" : "Telecom"})`
                            : payload.name;
                          return [formatCurrency(amount), label];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="commission-mix-legend">
                    {commissionCategoryData.map((entry) => (
                      <div
                        key={entry.category}
                        className="commission-mix-chip is-category"
                      >
                        <span
                          className="commission-mix-swatch"
                          style={{ background: entry.fill }}
                        />
                        <span>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="commission-mix-legend is-accounts">
                    {commissionAccountData.map((entry) => (
                      <div
                        key={`${entry.category}-${entry.name}`}
                        className="commission-mix-chip"
                      >
                        <span
                          className="commission-mix-swatch"
                          style={{ background: entry.fill }}
                        />
                        <span>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="chart-empty">
                  <p>No data for this period</p>
                </div>
              )}
            </div>

            {/* Top-right: Transactions Bar Chart */}
            <div className="chart-card">
              <div className="commission-chart-header">
                <div>
                  <h3 className="chart-title" style={{ margin: 0 }}>
                    Transactions by Account
                  </h3>
                  <span className="chart-period-hint">
                    {PERIOD_LABELS[chartPeriod]}
                  </span>
                </div>
                {transactionBarData.length > 0 && (
                  <span className="commission-total">
                    {transactionBarData.reduce((s, d) => s + d.count, 0)}
                    <span className="commission-total-label">total</span>
                  </span>
                )}
              </div>
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

            {/* Bottom-right: Net Earnings Over Time */}
            <div className="chart-card">
              <div className="commission-chart-header">
                <h3 className="chart-title" style={{ margin: 0 }}>
                  Net Earnings Over Time
                </h3>
                <span
                  className={`commission-total ${netEarningsTotal < 0 ? "negative" : ""}`}
                >
                  {formatCurrency(netEarningsTotal)}
                  <span className="commission-total-label">period total</span>
                </span>
              </div>
              {netEarningsTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={netEarningsTrendData}
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
                      tickFormatter={(value) =>
                        value >= 1000 || value <= -1000
                          ? `${(value / 1000).toFixed(0)}k`
                          : String(value)
                      }
                    />
                    <ReferenceLine
                      y={0}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 13,
                      }}
                      formatter={(value, name) => {
                        const amount = typeof value === "number" ? value : 0;
                        if (name === "commission") {
                          return [formatCurrency(amount), "Commission"];
                        }
                        if (name === "expenses") {
                          return [formatCurrency(amount), "Expenses"];
                        }
                        return [formatCurrency(amount), "Net Earnings"];
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="commission"
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="netEarnings"
                      stroke="#0f766e"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "#0f766e" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  <p>No net earnings data for this period</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
