import React from "react";
import {
  RefreshCw,
  Plus,
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
} from "lucide-react";
import { useTransactionsScreen } from "../../hooks/screens/useTransactionsScreen";
import type { TransactionTypeEnum } from "../../types";
import "../../styles/web.css";

/**
 * Web Transactions Screen - Full CRUD with filtering, metrics, and float purchases
 */
export default function TransactionsWeb() {
  const {
    transactions,
    accounts,
    metrics,
    companyId,
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
    showAddTransaction,
    setShowAddTransaction,
    showFloatPurchase,
    setShowFloatPurchase,
    showReverseConfirm,
    setShowReverseConfirm,
    transactionToReverse,
    transactionForm,
    setTransactionForm,
    floatPurchaseForm,
    setFloatPurchaseForm,
    handleCreateTransaction,
    handleCreateFloatPurchase,
    handleReverse,
    confirmReverse,
    handleRefresh,
    handleClearError,
    handleResetFilters,
    formatCurrency,
    getTransactionTypeLabel,
    getTransactionTypeColor,
    formatDateTime,
  } = useTransactionsScreen();

  // ---- Type icon helper ----
  const TypeIcon = ({ type }: { type: TransactionTypeEnum }) => {
    switch (type) {
      case "DEPOSIT":
        return <ArrowDownLeft size={14} />;
      case "WITHDRAW":
        return <ArrowUpRight size={14} />;
      case "FLOAT_PURCHASE":
        return <ArrowLeftRight size={14} />;
    }
  };

  // ---- Loading state ----
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
            onClick={() => setShowAddTransaction(true)}
            className="btn-add"
          >
            <Plus size={16} />
            Add Transaction
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn-refresh"
          >
            <RefreshCw className={isLoading ? "spin" : ""} size={18} />
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Metrics Row */}
        <div
          className="metrics-row"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {/* Total Deposits */}
          <div className="summary-card" style={{ padding: "16px" }}>
            <div
              className="summary-icon"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
            >
              <TrendingUp size={20} />
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
              <TrendingDown size={20} />
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

          {/* Net Movement */}
          <div className="summary-card" style={{ padding: "16px" }}>
            <div
              className="summary-icon"
              style={{
                background:
                  metrics.netMovement >= 0
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(239,68,68,0.15)",
                color: metrics.netMovement >= 0 ? "#22c55e" : "#ef4444",
              }}
            >
              <Activity size={20} />
            </div>
            <div className="summary-details">
              <span className="summary-label">Net Movement</span>
              <span
                className="summary-amount"
                style={{
                  color: metrics.netMovement >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {metrics.netMovement >= 0 ? "+" : ""}
                {formatCurrency(metrics.netMovement)}
              </span>
            </div>
          </div>

          {/* Transaction Count */}
          <div className="summary-card" style={{ padding: "16px" }}>
            <div className="summary-icon">
              <Hash size={20} />
            </div>
            <div className="summary-details">
              <span className="summary-label">Total Transactions</span>
              <span className="summary-amount">
                {metrics.transactionCount}
              </span>
            </div>
            {metrics.floatCount > 0 && (
              <div className="summary-count">
                <span className="count-number">{metrics.floatCount}</span>
                <span className="count-label">float</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div
            className="filter-group"
            style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1 }}
          >
            <Filter size={16} />

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
            </select>

            {/* Shift filter */}
            <select
              value={filterShift}
              onChange={(e) =>
                setFilterShift(e.target.value as "AM" | "PM" | "ALL")
              }
              className="filter-select"
            >
              <option value="ALL">All Shifts</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
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
                <th>Balance After</th>
                <th>Reference</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">
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
                                : "rgba(59,130,246,0.15)",
                          color:
                            txn.transactionType === "DEPOSIT"
                              ? "#22c55e"
                              : txn.transactionType === "WITHDRAW"
                                ? "#ef4444"
                                : "#3b82f6",
                          borderColor:
                            txn.transactionType === "DEPOSIT"
                              ? "rgba(34,197,94,0.3)"
                              : txn.transactionType === "WITHDRAW"
                                ? "rgba(239,68,68,0.3)"
                                : "rgba(59,130,246,0.3)",
                        }}
                      >
                        <TypeIcon type={txn.transactionType} />
                        {getTransactionTypeLabel(txn.transactionType)}
                      </span>
                    </td>
                    <td className="font-medium">
                      {txn.account?.name || `Account #${txn.accountId}`}
                    </td>
                    <td>
                      <span className="shift-badge">{txn.shift}</span>
                    </td>
                    <td
                      className={`amount ${txn.transactionType === "DEPOSIT" ? "positive" : txn.transactionType === "WITHDRAW" ? "negative" : ""}`}
                    >
                      {txn.transactionType === "DEPOSIT" ? "+" : txn.transactionType === "WITHDRAW" ? "-" : ""}
                      {formatCurrency(txn.amount)}
                    </td>
                    <td>{formatCurrency(txn.balanceAfter)}</td>
                    <td className="description">{txn.reference || "-"}</td>
                    <td className="description">{txn.notes || "-"}</td>
                    <td>
                      <div className="action-buttons">
                        {!txn.reconciliationId && (
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

      {/* ============= Add Transaction Modal ============= */}
      {showAddTransaction && (
        <div className="modal-overlay" onClick={() => setShowAddTransaction(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="modal-header">
              <h2>Add Transaction</h2>
              <button
                onClick={() => setShowAddTransaction(false)}
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
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transactionForm.amount}
                  onChange={(e) =>
                    setTransactionForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Shift */}
              <div className="form-group">
                <label className="form-label">Shift</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["AM", "PM"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setTransactionForm((prev) => ({ ...prev, shift: s }))
                      }
                      className={`shift-badge ${transactionForm.shift === s ? "active" : ""}`}
                      style={{
                        padding: "8px 20px",
                        cursor: "pointer",
                        border:
                          transactionForm.shift === s
                            ? "2px solid #3b82f6"
                            : "1px solid #334155",
                        background:
                          transactionForm.shift === s
                            ? "rgba(59,130,246,0.15)"
                            : "transparent",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
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
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowAddTransaction(false)}
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
        <div className="modal-overlay" onClick={() => setShowFloatPurchase(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px" }}
          >
            <div className="modal-header">
              <h2>Float Purchase</h2>
              <button
                onClick={() => setShowFloatPurchase(false)}
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
              <ArrowLeftRight size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
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
              {/* Source Account */}
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
                      disabled={a.id === floatPurchaseForm.sourceAccountId}
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
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={floatPurchaseForm.amount}
                  onChange={(e) =>
                    setFloatPurchaseForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="form-input"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Shift */}
              <div className="form-group">
                <label className="form-label">Shift</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {(["AM", "PM"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setFloatPurchaseForm((prev) => ({ ...prev, shift: s }))
                      }
                      className="shift-badge"
                      style={{
                        padding: "8px 20px",
                        cursor: "pointer",
                        border:
                          floatPurchaseForm.shift === s
                            ? "2px solid #3b82f6"
                            : "1px solid #334155",
                        background:
                          floatPurchaseForm.shift === s
                            ? "rgba(59,130,246,0.15)"
                            : "transparent",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
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

              {/* Submit */}
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowFloatPurchase(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isCreating ||
                    !floatPurchaseForm.sourceAccountId ||
                    !floatPurchaseForm.destinationAccountId ||
                    !floatPurchaseForm.amount
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

      {/* ============= Reverse Confirmation Modal ============= */}
      {showReverseConfirm && transactionToReverse && (
        <div
          className="modal-overlay"
          onClick={() => setShowReverseConfirm(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "420px" }}
          >
            <div className="modal-header">
              <h2>Reverse Transaction</h2>
              <button
                onClick={() => setShowReverseConfirm(false)}
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
              <AlertTriangle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
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
                  {getTransactionTypeLabel(transactionToReverse.transactionType)}
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

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowReverseConfirm(false)}
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
