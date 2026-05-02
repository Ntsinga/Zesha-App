import React from "react";
import {
  RefreshCw,
  Plus,
  Upload,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  X,
  Filter,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Activity,
  Hash,
  Calendar,
  AlertTriangle,
  Wallet,
  CheckCircle,
  FileText,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  ShieldX,
} from "lucide-react";
import { useTransactionsScreen } from "../../hooks/screens/useTransactionsScreen";
import { formatAmountInput, parseAmountInput } from "../../utils/formatters";
import type { TransactionTypeEnum, TransactionSubtypeEnum } from "../../types";
import type {
  StatementParsedRow,
  StatementOverlapStatus,
  StatementReviewDesignation,
} from "../../types/transaction";
import "../../styles/web.css";

function isOverlapBlocked(status?: StatementOverlapStatus): boolean {
  return (
    status === "EXACT_MATCH" ||
    status === "POSSIBLE_MATCH" ||
    status === "REFERENCE_CONFLICT" ||
    status === "AMBIGUOUS_FLOAT_MATCH"
  );
}

/**
 * Web Transactions Screen - Full CRUD with filtering, metrics, and float purchases
 */
export default function TransactionsWeb() {
  const {
    transactions,
    accounts,
    metrics,
    companyId,
    transactionCommissionPreview,
    isLoading,
    isCreating,
    error,
    filterType,
    setFilterType,
    filterShift,
    setFilterShift,
    filterAccountId,
    setFilterAccountId,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    topTransactionAccount,
    showAddTransaction,
    setShowAddTransaction,
    showFloatPurchase,
    setShowFloatPurchase,
    showCapitalInjection,
    setShowCapitalInjection,
    showStatementImport,
    setShowStatementImport,
    showReverseConfirm,
    setShowReverseConfirm,
    transactionToReverse,
    transactionForm,
    setTransactionForm,
    floatPurchaseForm,
    setFloatPurchaseForm,
    capitalInjectionForm,
    setCapitalInjectionForm,
    statementAccountId,
    statementProvider,
    statementFile,
    statementPreview,
    statementImportResult,
    statementReviewDesignations,
    selectedReviewRowCount,
    overlapBlockedStatementRowCount,
    importableStatementRowCount,
    handleCreateTransaction,
    handleCreateFloatPurchase,
    handleCreateCapitalInjection,
    handleStatementAccountChange,
    handleStatementProviderChange,
    handleStatementFileChange,
    handleStatementReviewDesignationChange,
    handlePreviewStatement,
    handleImportStatement,
    closeStatementImport,
    handleReverse,
    handleConfirmTransaction,
    confirmReverse,
    handleRefresh,
    handleClearError,
    handleResetFilters,
    submitError,
    clearSubmitError,
    isPreviewingStatement,
    isImportingStatement,
    formatCurrency,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    formatDateTime,
  } = useTransactionsScreen();

  const telecomAccounts = accounts.filter(
    (account) => account.accountType === "TELECOM",
  );

  // ---- Statement import local state ----
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [statementRowFilter, setStatementRowFilter] = React.useState<
    "ALL" | "READY" | "REVIEW" | "SKIP" | "BLOCKED"
  >("ALL");

  // Reset filter tab whenever preview data changes (new file / cleared)
  React.useEffect(() => {
    setStatementRowFilter("ALL");
  }, [statementPreview]);

  const blockedPreviewRowCount = React.useMemo(
    () =>
      (statementPreview?.rows ?? []).filter((r) =>
        isOverlapBlocked(r.overlapStatus),
      ).length,
    [statementPreview],
  );

  const filteredPreviewRows = React.useMemo(
    () =>
      (statementPreview?.rows ?? []).filter((r) => {
        if (statementRowFilter === "ALL") return true;
        if (statementRowFilter === "BLOCKED")
          return isOverlapBlocked(r.overlapStatus);
        return r.decision === statementRowFilter;
      }),
    [statementPreview, statementRowFilter],
  );

  const importStep = statementImportResult ? 3 : statementPreview ? 2 : 1;

  const reviewDesignationOptions: Array<{
    value: StatementReviewDesignation;
    label: string;
  }> = [
    { value: "KEEP_REVIEW", label: "Keep for review" },
    { value: "REGULAR_DEPOSIT", label: "Regular deposit" },
    { value: "REGULAR_WITHDRAW", label: "Regular withdraw" },
    { value: "FLOAT_PURCHASE_IN", label: "Float purchase in" },
    { value: "FLOAT_PURCHASE_OUT", label: "Float purchase out" },
    { value: "AIRTIME_DEPOSIT", label: "Airtime deposit" },
    { value: "VOICE_BUNDLE_DEPOSIT", label: "Voice bundle deposit" },
    { value: "DATA_BUNDLE_DEPOSIT", label: "Data bundle deposit" },
    { value: "BILL_PAYMENT_DEPOSIT", label: "Bill payment deposit" },
  ];

  const getMappedSubtypeLabel = React.useCallback(
    (subtype?: StatementParsedRow["mappedTransactionSubtype"] | null) => {
      switch (subtype) {
        case "AIRTIME":
          return "Airtime";
        case "VOICE_BUNDLE":
          return "Voice Bundle";
        case "DATA_BUNDLE":
          return "Data Bundle";
        case "BILL_PAYMENT":
          return "Bill Payment";
        case "AGENT_TO_AGENT":
          return "Agent to Agent";
        default:
          return null;
      }
    },
    [],
  );

  const getMappedDesignationLabel = React.useCallback(
    (row: StatementParsedRow) => {
      if (!row.mappedTransactionType) {
        return null;
      }

      const typeLabel = getTransactionTypeLabel(row.mappedTransactionType);
      const subtypeLabel = getMappedSubtypeLabel(row.mappedTransactionSubtype);
      return subtypeLabel ? `${typeLabel} · ${subtypeLabel}` : typeLabel;
    },
    [getMappedSubtypeLabel, getTransactionTypeLabel],
  );

  const totalOverlapFindingCount = React.useMemo(() => {
    if (!statementPreview) {
      return 0;
    }

    return (
      statementPreview.overlapSummary.exactMatchCount +
      statementPreview.overlapSummary.possibleMatchCount +
      statementPreview.overlapSummary.referenceConflictCount +
      statementPreview.overlapSummary.ambiguousMatchCount
    );
  }, [statementPreview]);

  const overlapSummaryText = React.useMemo(() => {
    if (!statementPreview) {
      return null;
    }

    const parts: string[] = [];
    if (statementPreview.overlapSummary.exactMatchCount > 0) {
      parts.push(
        `${statementPreview.overlapSummary.exactMatchCount} duplicate${statementPreview.overlapSummary.exactMatchCount === 1 ? "" : "s"}`,
      );
    }
    if (statementPreview.overlapSummary.possibleMatchCount > 0) {
      parts.push(
        `${statementPreview.overlapSummary.possibleMatchCount} possible overlap${statementPreview.overlapSummary.possibleMatchCount === 1 ? "" : "s"}`,
      );
    }
    if (statementPreview.overlapSummary.referenceConflictCount > 0) {
      parts.push(
        `${statementPreview.overlapSummary.referenceConflictCount} reference conflict${statementPreview.overlapSummary.referenceConflictCount === 1 ? "" : "s"}`,
      );
    }
    if (statementPreview.overlapSummary.ambiguousMatchCount > 0) {
      parts.push(
        `${statementPreview.overlapSummary.ambiguousMatchCount} ambiguous float match${statementPreview.overlapSummary.ambiguousMatchCount === 1 ? "" : "es"}`,
      );
    }

    return parts.join(", ");
  }, [statementPreview]);

  const getOverlapBadge = React.useCallback(
    (status?: StatementOverlapStatus) => {
      switch (status) {
        case "EXACT_MATCH":
          return {
            label: "Duplicate",
            color: "#475569",
            background: "rgba(148,163,184,0.14)",
            border: "rgba(148,163,184,0.25)",
          };
        case "POSSIBLE_MATCH":
          return {
            label: "Possible overlap",
            color: "#b45309",
            background: "rgba(245,158,11,0.12)",
            border: "rgba(245,158,11,0.28)",
          };
        case "REFERENCE_CONFLICT":
          return {
            label: "Reference conflict",
            color: "#b91c1c",
            background: "rgba(239,68,68,0.10)",
            border: "rgba(239,68,68,0.24)",
          };
        case "AMBIGUOUS_FLOAT_MATCH":
          return {
            label: "Float ambiguous",
            color: "#7c3aed",
            background: "rgba(124,58,237,0.10)",
            border: "rgba(124,58,237,0.24)",
          };
        case "NO_MATCH":
          return {
            label: "Clear",
            color: "#15803d",
            background: "rgba(34,197,94,0.12)",
            border: "rgba(34,197,94,0.24)",
          };
        case "REFERENCE_ONLY_MATCH":
          return {
            label: "Ref only",
            color: "#0369a1",
            background: "rgba(14,165,233,0.10)",
            border: "rgba(14,165,233,0.24)",
          };
        case "UNMAPPED_ROW":
          return {
            label: "Unmapped",
            color: "#64748b",
            background: "rgba(148,163,184,0.10)",
            border: "rgba(148,163,184,0.20)",
          };
        default:
          return {
            label: "No status",
            color: "#64748b",
            background: "rgba(148,163,184,0.12)",
            border: "rgba(148,163,184,0.24)",
          };
      }
    },
    [],
  );

  const handleDropZoneDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file?.type === "application/pdf") {
        handleStatementFileChange(file);
      }
    },
    [handleStatementFileChange],
  );

  const TypeIcon = ({ type }: { type: TransactionTypeEnum }) => {
    switch (type) {
      case "DEPOSIT":
        return <ArrowDownLeft size={14} />;
      case "WITHDRAW":
        return <ArrowUpRight size={14} />;
      case "FLOAT_PURCHASE":
        return <ArrowLeftRight size={14} />;
      case "CAPITAL_INJECTION":
        return <Wallet size={14} />;
    }
  };

  if (isLoading && transactions.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner" />
          <p className="loading-text">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Error Banner */}
      {error && (
        <div className="banner banner-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={handleClearError} className="banner-dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Transactions</h1>
          <span className="header-date">
            {metrics.transactionCount} transaction
            {metrics.transactionCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="header-right" style={{ gap: "8px", display: "flex" }}>
          <button
            onClick={() => setShowCapitalInjection(true)}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              border: "1px solid #99f6e4",
              background: "rgba(20,184,166,0.1)",
              color: "#0d9488",
              cursor: "pointer",
            }}
          >
            <Wallet size={16} />
            Capital Injection
          </button>
          <button
            onClick={() => setShowFloatPurchase(true)}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              border: "1px solid #e2e8f0",
              background: "#f1f5f9",
              color: "#475569",
              cursor: "pointer",
            }}
          >
            <ArrowLeftRight size={16} />
            Float Purchase
          </button>
          <button
            onClick={() => setShowStatementImport(true)}
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <Upload size={16} />
            Import Statement
          </button>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="btn-add"
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Metrics Row */}
        <div
          className="metrics-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "0px",
          }}
        >
          {/* Total Deposits */}
          <div className="summary-card" style={{ padding: "16px" }}>
            <div
              className="summary-icon"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
            >
              <TrendingUp size={17} />
            </div>
            <div className="summary-details">
              <span className="summary-label">Deposits</span>
              <span className="summary-amount" style={{ color: "#22c55e" }}>
                +{formatCurrency(metrics.totalDeposits)}
              </span>
            </div>
            <div className="summary-count">
              <span className="count-number">{metrics.depositCount}</span>
              <span className="count-label">txns</span>
            </div>
          </div>

          {/* Total Withdrawals */}
          <div className="summary-card" style={{ padding: "16px" }}>
            <div
              className="summary-icon"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}
            >
              <TrendingDown size={17} />
            </div>
            <div className="summary-details">
              <span className="summary-label">Withdrawals</span>
              <span className="summary-amount" style={{ color: "#ef4444" }}>
                -{formatCurrency(metrics.totalWithdrawals)}
              </span>
            </div>
            <div className="summary-count">
              <span className="count-number">{metrics.withdrawCount}</span>
              <span className="count-label">txns</span>
            </div>
          </div>

          {/* Top Account */}
          <div className="summary-card" style={{ padding: "16px" }}>
            <div className="summary-icon">
              <Hash size={17} />
            </div>
            <div className="summary-details">
              <span className="summary-label">Top Account</span>
              <span className="summary-amount">
                {topTransactionAccount?.accountName ?? "No activity"}
              </span>
            </div>
            {topTransactionAccount && (
              <div className="summary-count">
                <span className="count-number">
                  {topTransactionAccount.transactionCount}
                </span>
                <span className="count-label">txns</span>
              </div>
            )}
          </div>

          {/* Expected Commission */}
          {metrics.totalExpectedCommission > 0 && (
            <div className="summary-card" style={{ padding: "16px" }}>
              <div className="summary-icon" style={{ color: "#7c3aed" }}>
                <Activity size={17} />
              </div>
              <div className="summary-details">
                <span className="summary-label">Expected Commission</span>
                <span className="summary-amount" style={{ color: "#7c3aed" }}>
                  {formatCurrency(metrics.totalExpectedCommission)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div
            className="filter-group"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}
          >
            <Filter size={16} />

            {/* Range preset badges */}
            {(() => {
              const d = new Date();
              const pad = (n: number) => String(n).padStart(2, "0");
              const todayStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              const monthStart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
              const yearStart = `${d.getFullYear()}-01-01`;
              const activeBadge =
                filterDateFrom === todayStr && filterDateTo === todayStr
                  ? "today"
                  : filterDateFrom === monthStart && filterDateTo === todayStr
                    ? "month"
                    : filterDateFrom === yearStart && filterDateTo === todayStr
                      ? "year"
                      : "custom";
              return (
                <div className="range-badges">
                  <button
                    className={`range-badge${activeBadge === "today" ? " active" : ""}`}
                    onClick={() => {
                      setFilterDateFrom(todayStr);
                      setFilterDateTo(todayStr);
                    }}
                  >
                    Today
                  </button>
                  <button
                    className={`range-badge${activeBadge === "month" ? " active" : ""}`}
                    onClick={() => {
                      setFilterDateFrom(monthStart);
                      setFilterDateTo(todayStr);
                    }}
                  >
                    This Month
                  </button>
                  <button
                    className={`range-badge${activeBadge === "year" ? " active" : ""}`}
                    onClick={() => {
                      setFilterDateFrom(yearStart);
                      setFilterDateTo(todayStr);
                    }}
                  >
                    This Year
                  </button>
                </div>
              );
            })()}

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as TransactionTypeEnum | "ALL")
              }
              className="filter-select"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAW">Withdrawals</option>
              <option value="FLOAT_PURCHASE">Float Purchases</option>
              <option value="CAPITAL_INJECTION">Capital Injections</option>
            </select>

            {/* Account filter */}
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

            {/* Date From */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Calendar size={14} style={{ color: "#64748b" }} />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="filter-select"
                style={{ padding: "6px 8px" }}
              />
            </div>

            {/* Date To */}
            <span style={{ color: "#64748b", alignSelf: "center" }}>to</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="filter-select"
              style={{ padding: "6px 8px" }}
            />

            <button
              onClick={handleResetFilters}
              className="btn-refresh"
              title="Reset filters"
              style={{ padding: "6px 10px" }}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date/Time</th>
                <th>Type</th>
                <th>Account</th>
                <th>Shift</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Balance After</th>
                <th>Reference</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty">
                    <Activity size={40} />
                    <p>No transactions found</p>
                    <p style={{ fontSize: "12px", color: "#64748b" }}>
                      Add a transaction or adjust your filters
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {formatDateTime(txn.transactionTime)}
                    </td>
                    <td>
                      <span
                        className="category-badge"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background:
                            txn.transactionType === "DEPOSIT"
                              ? "rgba(34,197,94,0.15)"
                              : txn.transactionType === "WITHDRAW"
                                ? "rgba(239,68,68,0.15)"
                                : txn.transactionType === "CAPITAL_INJECTION"
                                  ? "rgba(20,184,166,0.15)"
                                  : "rgba(59,130,246,0.15)",
                          color:
                            txn.transactionType === "DEPOSIT"
                              ? "#22c55e"
                              : txn.transactionType === "WITHDRAW"
                                ? "#ef4444"
                                : txn.transactionType === "CAPITAL_INJECTION"
                                  ? "#14b8a6"
                                  : "#3b82f6",
                          borderColor:
                            txn.transactionType === "DEPOSIT"
                              ? "rgba(34,197,94,0.3)"
                              : txn.transactionType === "WITHDRAW"
                                ? "rgba(239,68,68,0.3)"
                                : txn.transactionType === "CAPITAL_INJECTION"
                                  ? "rgba(20,184,166,0.3)"
                                  : "rgba(59,130,246,0.3)",
                        }}
                      >
                        <TypeIcon type={txn.transactionType} />
                        {getTransactionTypeLabel(txn.transactionType)}
                      </span>
                      {!txn.isConfirmed && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            marginLeft: "6px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                            background: "rgba(234,179,8,0.15)",
                            color: "#eab308",
                            border: "1px solid rgba(234,179,8,0.3)",
                          }}
                        >
                          <AlertTriangle size={10} />
                          Unconfirmed
                        </span>
                      )}
                    </td>
                    <td className="font-medium">
                      {txn.account?.name || `Account #${txn.accountId}`}
                    </td>
                    <td>
                      <span className="shift-badge">{txn.shift}</span>
                    </td>
                    <td
                      className={`amount ${txn.transactionType === "DEPOSIT" || txn.transactionType === "CAPITAL_INJECTION" ? "positive" : txn.transactionType === "WITHDRAW" ? "negative" : ""}`}
                    >
                      {txn.transactionType === "DEPOSIT" ||
                      txn.transactionType === "CAPITAL_INJECTION"
                        ? "+"
                        : txn.transactionType === "WITHDRAW"
                          ? "-"
                          : ""}
                      {formatCurrency(txn.amount)}
                    </td>
                    <td
                      style={{
                        color: txn.expectedCommission ? "#7c3aed" : "#94a3b8",
                        fontWeight: txn.expectedCommission ? 500 : 400,
                        fontSize: "13px",
                      }}
                    >
                      {txn.expectedCommission
                        ? formatCurrency(
                            txn.expectedCommission.commissionAmount,
                          )
                        : "-"}
                    </td>
                    <td>{formatCurrency(txn.balanceAfter)}</td>
                    <td className="description">{txn.reference || "-"}</td>
                    <td className="description">{txn.notes || "-"}</td>
                    <td>
                      <div className="action-buttons">
                        {!txn.isConfirmed &&
                          txn.transactionType === "FLOAT_PURCHASE" && (
                            <button
                              onClick={() => handleConfirmTransaction(txn.id)}
                              className="btn-icon-sm"
                              title="Confirm Float Purchase"
                              style={{ color: "#22c55e" }}
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                        {!txn.reconciliationId && !txn.floatSource && (
                          <button
                            onClick={() => handleReverse(txn)}
                            className="btn-icon-sm delete"
                            title="Reverse Transaction"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============= Statement Import Modal ============= */}
      {showStatementImport && (
        <div className="modal-overlay" onClick={closeStatementImport}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "1040px",
              width: "min(1040px, 96vw)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "92vh",
              padding: 0,
              overflow: "hidden",
            }}
          >
            {/* ── Modal header ── */}
            <div
              className="modal-header"
              style={{ padding: "18px 24px 14px", flexShrink: 0 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flex: 1,
                }}
              >
                <h2 style={{ margin: 0 }}>Import Statement</h2>
                {/* Step indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginLeft: "auto",
                    marginRight: "12px",
                  }}
                >
                  {(["Configure", "Preview", "Done"] as const).map(
                    (label, idx) => {
                      const sIdx = idx + 1;
                      const active = importStep === sIdx;
                      const done = importStep > sIdx;
                      return (
                        <React.Fragment key={label}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                              fontSize: "12px",
                              fontWeight: active ? 600 : 400,
                              color: done
                                ? "#16a34a"
                                : active
                                  ? "#3b82f6"
                                  : "#94a3b8",
                            }}
                          >
                            <span
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "11px",
                                fontWeight: 700,
                                background: done
                                  ? "rgba(22,163,74,0.12)"
                                  : active
                                    ? "rgba(59,130,246,0.12)"
                                    : "#f1f5f9",
                                color: done
                                  ? "#16a34a"
                                  : active
                                    ? "#3b82f6"
                                    : "#94a3b8",
                              }}
                            >
                              {done ? "✓" : sIdx}
                            </span>
                            {label}
                          </div>
                          {idx < 2 && (
                            <ChevronRight
                              size={12}
                              color="#cbd5e1"
                              style={{ flexShrink: 0 }}
                            />
                          )}
                        </React.Fragment>
                      );
                    },
                  )}
                </div>
              </div>
              <button onClick={closeStatementImport} className="modal-close">
                <X size={20} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "0 24px 16px",
              }}
            >
              {/* Config row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  marginBottom: "16px",
                  paddingTop: "16px",
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Telecom Account</label>
                  <select
                    value={statementAccountId ?? ""}
                    onChange={(e) =>
                      handleStatementAccountChange(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="form-input"
                  >
                    <option value="">Select account...</option>
                    {telecomAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Provider</label>
                  <select
                    value={statementProvider}
                    onChange={(e) =>
                      handleStatementProviderChange(
                        e.target.value as "AUTO" | "MTN" | "AIRTEL",
                      )
                    }
                    className="form-input"
                  >
                    <option value="AUTO">Auto Detect</option>
                    <option value="MTN">MTN</option>
                    <option value="AIRTEL">Airtel</option>
                  </select>
                </div>
              </div>

              {/* Drop zone */}
              <div style={{ position: "relative", marginBottom: "20px" }}>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDropZoneDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${
                      dragOver
                        ? "#3b82f6"
                        : statementFile
                          ? "#22c55e"
                          : "#cbd5e1"
                    }`,
                    borderRadius: "10px",
                    padding: statementFile ? "14px 20px" : "22px 20px",
                    background: dragOver
                      ? "rgba(59,130,246,0.06)"
                      : statementFile
                        ? "rgba(34,197,94,0.04)"
                        : "#f8fafc",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "center" as const,
                    userSelect: "none" as const,
                  }}
                >
                  <FileText
                    size={statementFile ? 20 : 26}
                    color={
                      dragOver
                        ? "#3b82f6"
                        : statementFile
                          ? "#22c55e"
                          : "#94a3b8"
                    }
                    style={{ margin: "0 auto 8px", display: "block" }}
                  />
                  {statementFile ? (
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontWeight: 600,
                          color: "#1e293b",
                          fontSize: "14px",
                          marginBottom: "3px",
                        }}
                      >
                        {statementFile.name}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "12px" }}>
                        {statementFile.size >= 1_048_576
                          ? `${(statementFile.size / 1_048_576).toFixed(1)} MB`
                          : `${(statementFile.size / 1024).toFixed(1)} KB`}
                        {" — click or drop to replace"}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span
                        style={{
                          display: "block",
                          fontWeight: 500,
                          color: "#475569",
                          fontSize: "14px",
                          marginBottom: "3px",
                        }}
                      >
                        Drop PDF here or click to browse
                      </span>
                      <span style={{ color: "#94a3b8", fontSize: "12px" }}>
                        MTN and Airtel statement PDFs supported
                      </span>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    style={{ display: "none" }}
                    onChange={(e) =>
                      handleStatementFileChange(e.target.files?.[0] ?? null)
                    }
                  />
                </div>
                {statementFile && (
                  <button
                    type="button"
                    title="Remove file"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatementFileChange(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      border: "1px solid rgba(239,68,68,0.3)",
                      background: "rgba(239,68,68,0.08)",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* ── Statement metadata banner (after preview) ── */}
              {statementPreview && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "14px 18px",
                    marginBottom: "16px",
                    display: "flex",
                    flexWrap: "wrap" as const,
                    gap: "16px 28px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1e293b",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {statementPreview.metadata.provider}
                  </span>
                  {statementPreview.metadata.accountHolderName && (
                    <span style={{ fontSize: "13px", color: "#475569" }}>
                      {statementPreview.metadata.accountHolderName}
                    </span>
                  )}
                  {statementPreview.metadata.mobileNumber && (
                    <span style={{ fontSize: "13px", color: "#475569" }}>
                      {statementPreview.metadata.mobileNumber}
                    </span>
                  )}
                  {(statementPreview.metadata.periodStart ||
                    statementPreview.metadata.periodEnd) && (
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      {statementPreview.metadata.periodStart
                        ? new Date(
                            statementPreview.metadata.periodStart,
                          ).toLocaleDateString()
                        : ""}
                      {statementPreview.metadata.periodStart &&
                      statementPreview.metadata.periodEnd
                        ? " – "
                        : ""}
                      {statementPreview.metadata.periodEnd
                        ? new Date(
                            statementPreview.metadata.periodEnd,
                          ).toLocaleDateString()
                        : ""}
                    </span>
                  )}
                  {statementPreview.metadata.openingBalance != null && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      <ArrowDown size={11} color="#22c55e" />
                      Opening:{" "}
                      <strong style={{ color: "#334155" }}>
                        {formatCurrency(
                          statementPreview.metadata.openingBalance,
                        )}
                      </strong>
                    </span>
                  )}
                  {statementPreview.metadata.closingBalance != null && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      <ArrowUp size={11} color="#64748b" />
                      Closing:{" "}
                      <strong style={{ color: "#334155" }}>
                        {formatCurrency(
                          statementPreview.metadata.closingBalance,
                        )}
                      </strong>
                    </span>
                  )}
                </div>
              )}

              {/* ── Summary stat cards ── */}
              {statementPreview && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  {(
                    [
                      {
                        label: "Total Rows",
                        value: statementPreview.summary.totalRows,
                        color: undefined,
                        bg: undefined,
                        border: undefined,
                      },
                      {
                        label: "Ready",
                        value: statementPreview.summary.readyCount,
                        color: "#16a34a",
                        bg: "rgba(34,197,94,0.07)",
                        border: "rgba(34,197,94,0.2)",
                      },
                      {
                        label: "Review",
                        value: statementPreview.summary.reviewCount,
                        color: "#d97706",
                        bg: "rgba(245,158,11,0.07)",
                        border: "rgba(245,158,11,0.2)",
                      },
                      {
                        label: "Skip",
                        value: statementPreview.summary.skippedCount,
                        color: "#64748b",
                        bg: undefined,
                        border: undefined,
                      },
                      {
                        label: "Ready Volume",
                        value: formatCurrency(
                          statementPreview.summary.readyTotalAmount,
                        ),
                        color: "#1e293b",
                        bg: undefined,
                        border: undefined,
                      },
                      {
                        label: "Overlap Findings",
                        value: totalOverlapFindingCount,
                        color:
                          totalOverlapFindingCount > 0 ? "#b91c1c" : "#64748b",
                        bg:
                          totalOverlapFindingCount > 0
                            ? "rgba(239,68,68,0.07)"
                            : undefined,
                        border:
                          totalOverlapFindingCount > 0
                            ? "rgba(239,68,68,0.2)"
                            : undefined,
                      },
                      ...(blockedPreviewRowCount > 0
                        ? [
                            {
                              label: "Blocked",
                              value: blockedPreviewRowCount,
                              color: "#7c3aed",
                              bg: "rgba(124,58,237,0.07)",
                              border: "rgba(124,58,237,0.2)",
                            },
                          ]
                        : []),
                    ] as const
                  ).map((card) => (
                    <div
                      key={card.label}
                      className="summary-card"
                      style={{
                        padding: "12px 14px",
                        background: card.bg ?? undefined,
                        border: card.border
                          ? `1px solid ${card.border}`
                          : undefined,
                      }}
                    >
                      <div className="summary-details">
                        <span className="summary-label">{card.label}</span>
                        <span
                          className="summary-amount"
                          style={{
                            color: card.color,
                            fontSize: "16px",
                          }}
                        >
                          {card.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── REVIEW warning callout ── */}
              {statementPreview && statementPreview.summary.reviewCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(245,158,11,0.07)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderLeft: "3px solid #f59e0b",
                    borderRadius: "8px",
                    padding: "11px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <AlertTriangle
                    size={15}
                    color="#f59e0b"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#92400e",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>
                      {statementPreview.summary.reviewCount} row
                      {statementPreview.summary.reviewCount === 1
                        ? ""
                        : "s"}{" "}
                      need manual review
                    </strong>{" "}
                    and will not be imported automatically. Use the REVIEW
                    filter below to inspect them and assign a designation for
                    the rows you want to import.
                    {selectedReviewRowCount > 0 && (
                      <strong>{` ${selectedReviewRowCount} already designated.`}</strong>
                    )}
                  </span>
                </div>
              )}

              {statementPreview && totalOverlapFindingCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderLeft: "3px solid #ef4444",
                    borderRadius: "8px",
                    padding: "11px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <AlertTriangle
                    size={15}
                    color="#ef4444"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#991b1b",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>
                      {totalOverlapFindingCount} row
                      {totalOverlapFindingCount === 1 ? " has" : "s have"}{" "}
                      overlap findings
                    </strong>{" "}
                    in the existing ledger for this statement period.
                    <span
                      style={{
                        display: "block",
                        marginTop: "3px",
                        color: "#7f1d1d",
                      }}
                    >
                      {overlapSummaryText}.
                      {overlapBlockedStatementRowCount > 0 && (
                        <>{` ${overlapBlockedStatementRowCount} currently selected or READY row${overlapBlockedStatementRowCount === 1 ? " is" : "s are"} blocked from import.`}</>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* ── Import result banner ── */}
              {statementImportResult && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(34,197,94,0.07)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderLeft: "3px solid #22c55e",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <CheckCircle
                    size={15}
                    color="#16a34a"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#166534",
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>
                      {statementImportResult.importedCount} of{" "}
                      {statementImportResult.totalSelectedRows} selected row
                      {statementImportResult.totalSelectedRows === 1
                        ? ""
                        : "s"}{" "}
                      imported successfully.
                    </strong>
                    {statementImportResult.duplicateCount > 0 && (
                      <span style={{ color: "#64748b", marginLeft: "6px" }}>
                        {statementImportResult.duplicateCount} duplicate
                        {statementImportResult.duplicateCount === 1
                          ? " was"
                          : "s were"}{" "}
                        skipped.
                      </span>
                    )}
                    {statementImportResult.overlapBlockedCount > 0 && (
                      <span
                        style={{
                          display: "block",
                          marginTop: "3px",
                          color: "#991b1b",
                        }}
                      >
                        {statementImportResult.overlapBlockedCount} row
                        {statementImportResult.overlapBlockedCount === 1
                          ? " was"
                          : "s were"}{" "}
                        blocked by overlap checks and not imported.
                      </span>
                    )}
                    {statementImportResult.selectedReviewRows > 0 && (
                      <span
                        style={{
                          display: "block",
                          marginTop: "3px",
                          color: "#166534",
                        }}
                      >
                        {statementImportResult.selectedReviewRows} REVIEW row
                        {statementImportResult.selectedReviewRows === 1
                          ? " was"
                          : "s were"}{" "}
                        designated and included in this import.
                      </span>
                    )}
                    {statementImportResult.reviewCount > 0 && (
                      <span
                        style={{
                          display: "block",
                          marginTop: "3px",
                          color: "#92400e",
                        }}
                      >
                        {statementImportResult.reviewCount} REVIEW row
                        {statementImportResult.reviewCount === 1
                          ? ""
                          : "s"}{" "}
                        still require manual entry.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── Error banner ── */}
              {submitError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderLeft: "3px solid #ef4444",
                    borderRadius: "8px",
                    padding: "11px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <AlertTriangle
                    size={15}
                    color="#ef4444"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <span
                    style={{
                      color: "#dc2626",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    {submitError}
                  </span>
                </div>
              )}

              {/* ── Rows table (only after preview) ── */}
              {statementPreview && (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  {/* Table header with filter tabs */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#334155",
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      {filteredPreviewRows.length ===
                      statementPreview.rows.length
                        ? `All ${statementPreview.rows.length} rows`
                        : `${filteredPreviewRows.length} of ${statementPreview.rows.length} rows`}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {(
                        [
                          {
                            key: "ALL",
                            label: "All",
                            count: statementPreview.rows.length,
                            color: undefined,
                          },
                          {
                            key: "READY",
                            label: "Ready",
                            count: statementPreview.summary.readyCount,
                            color: "#16a34a",
                          },
                          {
                            key: "REVIEW",
                            label: "Review",
                            count: statementPreview.summary.reviewCount,
                            color: "#d97706",
                          },
                          {
                            key: "SKIP",
                            label: "Skip",
                            count: statementPreview.summary.skippedCount,
                            color: "#64748b",
                          },
                          ...(blockedPreviewRowCount > 0
                            ? [
                                {
                                  key: "BLOCKED" as const,
                                  label: "Blocked",
                                  count: blockedPreviewRowCount,
                                  color: "#7c3aed",
                                },
                              ]
                            : []),
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setStatementRowFilter(tab.key)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight:
                              statementRowFilter === tab.key ? 600 : 400,
                            border:
                              statementRowFilter === tab.key
                                ? `1px solid ${
                                    tab.color ? tab.color + "55" : "#94a3b8"
                                  }`
                                : "1px solid transparent",
                            background:
                              statementRowFilter === tab.key
                                ? tab.color
                                  ? tab.color + "15"
                                  : "#f1f5f9"
                                : "transparent",
                            color:
                              statementRowFilter === tab.key
                                ? (tab.color ?? "#334155")
                                : "#64748b",
                            cursor: "pointer",
                            transition: "all 0.12s",
                          }}
                        >
                          {tab.label}
                          <span
                            style={{
                              background:
                                statementRowFilter === tab.key
                                  ? tab.color
                                    ? tab.color + "25"
                                    : "#e2e8f0"
                                  : "#f1f5f9",
                              color:
                                statementRowFilter === tab.key
                                  ? (tab.color ?? "#475569")
                                  : "#94a3b8",
                              borderRadius: "9999px",
                              padding: "1px 6px",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            {tab.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rows */}
                  <div style={{ maxHeight: "380px", overflow: "auto" }}>
                    {filteredPreviewRows.length === 0 ? (
                      <div
                        style={{
                          padding: "32px 16px",
                          textAlign: "center" as const,
                          color: "#94a3b8",
                          fontSize: "13px",
                        }}
                      >
                        No rows match the selected filter.
                      </div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Decision</th>
                            <th>Overlap</th>
                            <th>Provider Type</th>
                            <th>Mapped Type / Designation</th>
                            <th>Time</th>
                            <th className="text-right">Amount</th>
                            <th className="text-right">Fee</th>
                            <th>Reference</th>
                            <th>Description</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPreviewRows.map((row) => {
                            const overlapBadge = getOverlapBadge(
                              row.overlapStatus,
                            );
                            const overlapBlocked = isOverlapBlocked(
                              row.overlapStatus,
                            );
                            return (
                              <tr
                                key={`${row.providerReference}-${row.rowIndex}`}
                                style={{
                                  opacity: row.decision === "SKIP" ? 0.55 : 1,
                                  background: overlapBlocked
                                    ? "rgba(254,242,242,0.6)"
                                    : undefined,
                                }}
                              >
                                <td>
                                  <span
                                    className="category-badge"
                                    style={{
                                      background:
                                        row.decision === "READY"
                                          ? "rgba(34,197,94,0.12)"
                                          : row.decision === "REVIEW"
                                            ? "rgba(245,158,11,0.12)"
                                            : "rgba(148,163,184,0.12)",
                                      color:
                                        row.decision === "READY"
                                          ? "#16a34a"
                                          : row.decision === "REVIEW"
                                            ? "#d97706"
                                            : "#64748b",
                                      borderColor:
                                        row.decision === "READY"
                                          ? "rgba(34,197,94,0.3)"
                                          : row.decision === "REVIEW"
                                            ? "rgba(245,158,11,0.3)"
                                            : "rgba(148,163,184,0.3)",
                                    }}
                                  >
                                    {row.decision}
                                  </span>
                                </td>
                                <td>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "6px",
                                      minWidth: "160px",
                                    }}
                                  >
                                    <span
                                      className="category-badge"
                                      style={{
                                        background: overlapBadge.background,
                                        color: overlapBadge.color,
                                        borderColor: overlapBadge.border,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      {overlapBlocked && (
                                        <ShieldX
                                          size={10}
                                          style={{ flexShrink: 0 }}
                                        />
                                      )}
                                      {overlapBadge.label}
                                    </span>
                                    {row.overlapDetail && (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: overlapBlocked
                                            ? "#991b1b"
                                            : "#64748b",
                                          lineHeight: 1.45,
                                        }}
                                      >
                                        {row.overlapDetail}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ fontSize: "12px" }}>
                                  {row.providerTransactionType}
                                </td>
                                <td>
                                  {row.decision === "REVIEW" ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                        minWidth: "210px",
                                      }}
                                    >
                                      <select
                                        value={
                                          statementReviewDesignations[
                                            `${row.rowIndex}:${row.providerReference}`
                                          ] ?? "KEEP_REVIEW"
                                        }
                                        onChange={(event) =>
                                          handleStatementReviewDesignationChange(
                                            row,
                                            event.target
                                              .value as StatementReviewDesignation,
                                          )
                                        }
                                        style={{
                                          border: "1px solid #cbd5e1",
                                          borderRadius: "8px",
                                          padding: "7px 10px",
                                          fontSize: "12px",
                                          color: "#334155",
                                          background: "#fff",
                                        }}
                                      >
                                        {reviewDesignationOptions.map(
                                          (option) => (
                                            <option
                                              key={option.value}
                                              value={option.value}
                                            >
                                              {option.label}
                                            </option>
                                          ),
                                        )}
                                      </select>
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: overlapBlocked
                                            ? "#b91c1c"
                                            : "#94a3b8",
                                        }}
                                      >
                                        {overlapBlocked
                                          ? "Blocked by overlap detection until the existing ledger conflict is resolved"
                                          : `Suggested: ${getMappedDesignationLabel(row) ?? "Review manually"}`}
                                      </span>
                                    </div>
                                  ) : row.mappedTransactionType ? (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        fontWeight: 500,
                                        color: "#334155",
                                      }}
                                    >
                                      {getMappedDesignationLabel(row)}
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "#94a3b8",
                                      }}
                                    >
                                      —
                                    </span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    whiteSpace: "nowrap" as const,
                                    fontSize: "12px",
                                    color: "#64748b",
                                  }}
                                >
                                  {formatDateTime(row.transactionTime)}
                                </td>
                                <td
                                  className="amount"
                                  style={{ textAlign: "right" as const }}
                                >
                                  {formatCurrency(row.amount)}
                                </td>
                                <td
                                  style={{
                                    textAlign: "right" as const,
                                    fontSize: "12px",
                                    color:
                                      row.fee && Number(row.fee) > 0
                                        ? "#ef4444"
                                        : "#94a3b8",
                                  }}
                                >
                                  {row.fee && Number(row.fee) > 0
                                    ? `-${formatCurrency(row.fee)}`
                                    : "—"}
                                </td>
                                <td
                                  style={{
                                    fontSize: "11px",
                                    color: "#64748b",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  {row.providerReference}
                                </td>
                                <td className="description">
                                  {row.description || "—"}
                                </td>
                                <td
                                  className="description"
                                  style={{ color: "#94a3b8", fontSize: "11px" }}
                                >
                                  {row.reason}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── Sticky footer ── */}
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid #e2e8f0",
                padding: "14px 24px",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              {(isPreviewingStatement || isImportingStatement) && (
                <span
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginRight: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                  }}
                >
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  {isPreviewingStatement
                    ? "Parsing statement…"
                    : "Importing transactions…"}
                </span>
              )}
              {statementPreview && !statementImportResult && (
                <span
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    marginRight: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color:
                        importableStatementRowCount > 0 ? "#16a34a" : "#94a3b8",
                    }}
                  >
                    {importableStatementRowCount}
                  </span>
                  row{importableStatementRowCount === 1 ? "" : "s"} eligible for
                  import
                  {overlapBlockedStatementRowCount > 0 && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        color: "#b91c1c",
                        fontSize: "12px",
                      }}
                    >
                      <ShieldX size={12} />
                      {`${overlapBlockedStatementRowCount} blocked`}
                    </span>
                  )}
                </span>
              )}
              <button
                type="button"
                onClick={closeStatementImport}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePreviewStatement}
                className="btn-secondary"
                disabled={
                  !statementFile ||
                  !statementAccountId ||
                  isPreviewingStatement ||
                  isImportingStatement
                }
                style={{
                  border: "1px solid #3b82f6",
                  color: "#3b82f6",
                  background: "rgba(59,130,246,0.06)",
                }}
              >
                {statementPreview ? "Re-preview" : "Preview Statement"}
              </button>
              <button
                type="button"
                onClick={handleImportStatement}
                className="btn-submit"
                disabled={
                  !importableStatementRowCount ||
                  !statementFile ||
                  !statementAccountId ||
                  isImportingStatement ||
                  isPreviewingStatement ||
                  !!statementImportResult
                }
              >
                Import Transactions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============= Add Transaction Modal ============= */}
      {showAddTransaction && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddTransaction(false);
            clearSubmitError();
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="modal-header">
              <h2>Add Transaction</h2>
              <button
                onClick={() => {
                  setShowAddTransaction(false);
                  clearSubmitError();
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateTransaction();
              }}
              className="modal-form"
            >
              {/* Transaction Type */}
              <div className="form-group">
                <label className="form-label">Type</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        transactionType: "DEPOSIT",
                      }))
                    }
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border:
                        transactionForm.transactionType === "DEPOSIT"
                          ? "2px solid #22c55e"
                          : "1px solid #e2e8f0",
                      background:
                        transactionForm.transactionType === "DEPOSIT"
                          ? "rgba(34,197,94,0.1)"
                          : "#f1f5f9",
                      color:
                        transactionForm.transactionType === "DEPOSIT"
                          ? "#22c55e"
                          : "#475569",
                      cursor: "pointer",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ArrowDownLeft size={16} />
                    Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        transactionType: "WITHDRAW",
                        transactionSubtype: null,
                      }))
                    }
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border:
                        transactionForm.transactionType === "WITHDRAW"
                          ? "2px solid #ef4444"
                          : "1px solid #e2e8f0",
                      background:
                        transactionForm.transactionType === "WITHDRAW"
                          ? "rgba(239,68,68,0.1)"
                          : "#f1f5f9",
                      color:
                        transactionForm.transactionType === "WITHDRAW"
                          ? "#ef4444"
                          : "#475569",
                      cursor: "pointer",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <ArrowUpRight size={16} />
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Deposit Subtype — only for deposits */}
              {transactionForm.transactionType === "DEPOSIT" && (
                <div className="form-group">
                  <label className="form-label">
                    Deposit Subtype{" "}
                    <span style={{ fontWeight: 400, color: "#94a3b8" }}>
                      (optional)
                    </span>
                  </label>
                  <select
                    value={transactionForm.transactionSubtype ?? ""}
                    onChange={(e) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        transactionSubtype: e.target.value
                          ? (e.target.value as TransactionSubtypeEnum)
                          : null,
                      }))
                    }
                    className="form-input"
                  >
                    <option value="">Standard deposit</option>
                    <option value="AGENT_TO_AGENT">Agent-to-Agent</option>
                    <option value="AIRTIME">Airtime</option>
                    <option value="VOICE_BUNDLE">Voice Bundle</option>
                    <option value="DATA_BUNDLE">Data Bundle</option>
                    <option value="BILL_PAYMENT">Bill Payment</option>
                  </select>
                </div>
              )}

              {/* Account */}
              <div className="form-group">
                <label className="form-label">Account</label>
                <select
                  value={transactionForm.accountId ?? ""}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      accountId: e.target.value ? Number(e.target.value) : null,
                    }))
                  }
                  className="form-input"
                  required
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.accountType})
                      {a.currentBalance != null
                        ? ` — Bal: ${formatCurrency(a.currentBalance)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatAmountInput(transactionForm.amount)}
                  onChange={(e) => {
                    const clean = parseAmountInput(e.target.value);
                    if (clean !== null)
                      setTransactionForm((prev) => ({
                        ...prev,
                        amount: clean,
                      }));
                  }}
                  className="form-input"
                  placeholder="0.00"
                  required
                />
                {transactionCommissionPreview && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "rgba(139,92,246,0.08)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      fontSize: "13px",
                      color: "#7c3aed",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      Commission ({transactionCommissionPreview.rate}%)
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {formatCurrency(transactionCommissionPreview.amount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Reference */}
              <div className="form-group">
                <label className="form-label">Reference (optional)</label>
                <input
                  type="text"
                  value={transactionForm.reference}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="e.g. receipt number, voucher..."
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  value={transactionForm.notes}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="form-input"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>

              {/* Submit */}
              {submitError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderLeft: "3px solid #ef4444",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <AlertTriangle
                    size={16}
                    color="#ef4444"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <span
                    style={{
                      color: "#f87171",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    {submitError}
                  </span>
                </div>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTransaction(false);
                    clearSubmitError();
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreating ||
                    !transactionForm.accountId ||
                    !transactionForm.amount
                  }
                  className="btn-submit"
                  style={{
                    background:
                      transactionForm.transactionType === "DEPOSIT"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                >
                  {isCreating
                    ? "Creating..."
                    : `Create ${transactionForm.transactionType === "DEPOSIT" ? "Deposit" : "Withdrawal"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============= Float Purchase Modal ============= */}
      {showFloatPurchase && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowFloatPurchase(false);
            clearSubmitError();
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="modal-header">
              <h2>Float Purchase</h2>
              <button
                onClick={() => {
                  setShowFloatPurchase(false);
                  clearSubmitError();
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Info Banner */}
            <div
              style={{
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.3)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                color: "#93c5fd",
                fontSize: "13px",
              }}
            >
              <ArrowLeftRight
                size={16}
                style={{ marginTop: "2px", flexShrink: 0 }}
              />
              <span>
                This will debit the source account and credit the destination
                account with the same amount, creating a linked pair of
                transactions.
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateFloatPurchase();
              }}
              className="modal-form"
            >
              {/* Float Source */}
              <div className="form-group">
                <label className="form-label">Float Source</label>
                <select
                  value={floatPurchaseForm.floatSource ?? "INTERNAL"}
                  onChange={(e) =>
                    setFloatPurchaseForm((prev) => ({
                      ...prev,
                      floatSource:
                        e.target.value === "INTERNAL"
                          ? null
                          : (e.target.value as "AGENT" | "BANK"),
                      // Clear source account when switching to external
                      sourceAccountId:
                        e.target.value !== "INTERNAL"
                          ? null
                          : prev.sourceAccountId,
                    }))
                  }
                  className="form-input"
                >
                  <option value="AGENT">Agent (external top-up)</option>
                  <option value="BANK">Bank (external top-up)</option>
                  <option value="INTERNAL">
                    Internal transfer (between accounts)
                  </option>
                </select>
              </div>

              {/* Source Account — only for internal transfers */}
              {!floatPurchaseForm.floatSource && (
                <div className="form-group">
                  <label className="form-label">Source Account (debit)</label>
                  <select
                    value={floatPurchaseForm.sourceAccountId ?? ""}
                    onChange={(e) =>
                      setFloatPurchaseForm((prev) => ({
                        ...prev,
                        sourceAccountId: e.target.value
                          ? Number(e.target.value)
                          : null,
                      }))
                    }
                    className="form-input"
                    required
                  >
                    <option value="">Select source account...</option>
                    {accounts.map((a) => (
                      <option
                        key={a.id}
                        value={a.id}
                        disabled={
                          a.id === floatPurchaseForm.destinationAccountId
                        }
                      >
                        {a.name} ({a.accountType})
                        {a.currentBalance != null
                          ? ` — Bal: ${formatCurrency(a.currentBalance)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Destination Account */}
              <div className="form-group">
                <label className="form-label">
                  Destination Account (credit)
                </label>
                <select
                  value={floatPurchaseForm.destinationAccountId ?? ""}
                  onChange={(e) =>
                    setFloatPurchaseForm((prev) => ({
                      ...prev,
                      destinationAccountId: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  className="form-input"
                  required
                >
                  <option value="">Select destination account...</option>
                  {accounts.map((a) => (
                    <option
                      key={a.id}
                      value={a.id}
                      disabled={
                        !floatPurchaseForm.floatSource &&
                        a.id === floatPurchaseForm.sourceAccountId
                      }
                    >
                      {a.name} ({a.accountType})
                      {a.currentBalance != null
                        ? ` — Bal: ${formatCurrency(a.currentBalance)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label">Amount</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatAmountInput(floatPurchaseForm.amount)}
                  onChange={(e) => {
                    const clean = parseAmountInput(e.target.value);
                    if (clean !== null)
                      setFloatPurchaseForm((prev) => ({
                        ...prev,
                        amount: clean,
                      }));
                  }}
                  className="form-input"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Reference */}
              <div className="form-group">
                <label className="form-label">Reference (optional)</label>
                <input
                  type="text"
                  value={floatPurchaseForm.reference}
                  onChange={(e) =>
                    setFloatPurchaseForm((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="e.g. float voucher number..."
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea
                  value={floatPurchaseForm.notes}
                  onChange={(e) =>
                    setFloatPurchaseForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="form-input"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>

              {/* Confirmation toggle */}
              <div className="form-group">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#94a3b8",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!floatPurchaseForm.isConfirmed}
                    onChange={(e) =>
                      setFloatPurchaseForm((prev) => ({
                        ...prev,
                        isConfirmed: !e.target.checked,
                      }))
                    }
                  />
                  Mark as pending confirmation (destination top-up not yet
                  verified)
                </label>
              </div>

              {/* Submit */}
              {submitError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    borderLeft: "3px solid #ef4444",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "14px",
                  }}
                >
                  <AlertTriangle
                    size={16}
                    color="#ef4444"
                    style={{ flexShrink: 0, marginTop: "1px" }}
                  />
                  <span
                    style={{
                      color: "#f87171",
                      fontSize: "13px",
                      lineHeight: "1.5",
                    }}
                  >
                    {submitError}
                  </span>
                </div>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowFloatPurchase(false);
                    clearSubmitError();
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreating ||
                    !floatPurchaseForm.destinationAccountId ||
                    !floatPurchaseForm.amount ||
                    (!floatPurchaseForm.floatSource &&
                      !floatPurchaseForm.sourceAccountId)
                  }
                  className="btn-submit"
                  style={{ background: "#3b82f6" }}
                >
                  {isCreating ? "Processing..." : "Execute Float Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============= Capital Injection Modal ============= */}
      {showCapitalInjection && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowCapitalInjection(false);
            clearSubmitError();
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="modal-header">
              <h2>Record Capital Injection</h2>
              <button
                onClick={() => {
                  setShowCapitalInjection(false);
                  clearSubmitError();
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-form">
              <p
                style={{
                  color: "#94a3b8",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                Record when the owner adds working capital into an account. No
                commission is charged.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateCapitalInjection();
                }}
              >
                {/* Injection Type Toggle */}
                <div className="form-group">
                  <label className="form-label">Injection Type</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {(["FLOAT", "CASH"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setCapitalInjectionForm((prev) => ({
                            ...prev,
                            injectionType: t,
                            accountId: null,
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: "9px 0",
                          borderRadius: "8px",
                          border: "1px solid",
                          borderColor:
                            capitalInjectionForm.injectionType === t
                              ? "#0d9488"
                              : "var(--color-border)",
                          background:
                            capitalInjectionForm.injectionType === t
                              ? "#0d9488"
                              : "#f8fafc",
                          color:
                            capitalInjectionForm.injectionType === t
                              ? "#fff"
                              : "var(--color-text)",
                          fontWeight: 600,
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        {t === "FLOAT" ? "E-Float Account" : "Cash (Physical)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account — only for FLOAT */}
                {capitalInjectionForm.injectionType === "FLOAT" && (
                  <div className="form-group">
                    <label className="form-label">Account</label>
                    <select
                      value={capitalInjectionForm.accountId || ""}
                      onChange={(e) =>
                        setCapitalInjectionForm((prev) => ({
                          ...prev,
                          accountId: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                      className="form-input"
                      required
                    >
                      <option value="">Select account</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Amount */}
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatAmountInput(capitalInjectionForm.amount)}
                    onChange={(e) => {
                      const clean = parseAmountInput(e.target.value);
                      if (clean !== null)
                        setCapitalInjectionForm((prev) => ({
                          ...prev,
                          amount: clean,
                        }));
                    }}
                    className="form-input"
                    placeholder="0.00"
                    required
                  />
                </div>

                {/* Reference */}
                <div className="form-group">
                  <label className="form-label">Reference (optional)</label>
                  <input
                    type="text"
                    value={capitalInjectionForm.reference}
                    onChange={(e) =>
                      setCapitalInjectionForm((prev) => ({
                        ...prev,
                        reference: e.target.value,
                      }))
                    }
                    className="form-input"
                    placeholder="e.g. Owner top-up"
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <textarea
                    value={capitalInjectionForm.notes}
                    onChange={(e) =>
                      setCapitalInjectionForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="form-input"
                    rows={2}
                    placeholder="Additional details..."
                  />
                </div>

                {/* Submit */}
                {submitError && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderLeft: "3px solid #ef4444",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      marginBottom: "14px",
                    }}
                  >
                    <AlertTriangle
                      size={16}
                      color="#ef4444"
                      style={{ flexShrink: 0, marginTop: "1px" }}
                    />
                    <span
                      style={{
                        color: "#f87171",
                        fontSize: "13px",
                        lineHeight: "1.5",
                      }}
                    >
                      {submitError}
                    </span>
                  </div>
                )}
                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCapitalInjection(false);
                      clearSubmitError();
                    }}
                    className="btn-cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isCreating ||
                      !capitalInjectionForm.amount ||
                      (capitalInjectionForm.injectionType === "FLOAT" &&
                        !capitalInjectionForm.accountId)
                    }
                    className="btn-submit"
                    style={{ background: "#0d9488" }}
                  >
                    {isCreating ? "Processing..." : "Record Capital Injection"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============= Reverse Confirmation Modal ============= */}
      {showReverseConfirm && transactionToReverse && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowReverseConfirm(false);
            clearSubmitError();
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "420px" }}
          >
            <div className="modal-header">
              <h2>Reverse Transaction</h2>
              <button
                onClick={() => {
                  setShowReverseConfirm(false);
                  clearSubmitError();
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Warning */}
            <div
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                color: "#fbbf24",
                fontSize: "13px",
              }}
            >
              <AlertTriangle
                size={16}
                style={{ marginTop: "2px", flexShrink: 0 }}
              />
              <span>
                This will create a reversing transaction that undoes the
                original. This action cannot be undone.
              </span>
            </div>

            {/* Transaction details */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "8px",
                padding: "14px",
                marginBottom: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "13px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "#64748b" }}>Type:</span>
                <span style={{ color: "#1e293b", fontWeight: 500 }}>
                  {getTransactionTypeLabel(
                    transactionToReverse.transactionType,
                  )}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "#64748b" }}>Account:</span>
                <span style={{ color: "#1e293b" }}>
                  {transactionToReverse.account?.name ||
                    `#${transactionToReverse.accountId}`}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "#64748b" }}>Amount:</span>
                <span style={{ color: "#1e293b", fontWeight: 600 }}>
                  {formatCurrency(transactionToReverse.amount)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "#64748b" }}>Date:</span>
                <span style={{ color: "#1e293b" }}>
                  {formatDateTime(transactionToReverse.transactionTime)}
                </span>
              </div>
            </div>

            {/* Inline error from failed reversal */}
            {submitError && (
              <div
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  color: "#dc2626",
                  fontSize: "13px",
                }}
              >
                <AlertTriangle
                  size={15}
                  style={{ marginTop: 1, flexShrink: 0 }}
                />
                <span>{submitError}</span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowReverseConfirm(false);
                  clearSubmitError();
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReverse}
                disabled={isCreating}
                className="btn-submit"
                style={{ background: "#ef4444" }}
              >
                {isCreating ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
