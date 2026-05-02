import React, { useState } from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Info,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";

import {
  EXPENSE_FUNDING_SOURCES,
  useExpensesScreen,
} from "@/hooks/screens/useExpensesScreen";
import { useToast } from "@/components/Toast.web";
import { formatAmountInput, parseAmountInput } from "@/utils/formatters";
import type { ExpenseFundingSource } from "@/types";
import "@/styles/web.css";

// --- Helpers ------------------------------------------------------------------

function formatDateLabel(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "-";
}

function getFundingSourceLabel(value: ExpenseFundingSource): string {
  return EXPENSE_FUNDING_SOURCES.find((s) => s.value === value)?.label ?? value;
}

function getSourceStyle(source: ExpenseFundingSource): React.CSSProperties {
  switch (source) {
    case "CAPITAL":
      return { background: "#fde8eb", color: "#be123c" };
    case "COMMISSIONS":
      return { background: "#dbeafe", color: "#1d4ed8" };
    case "EXTERNAL_INCOME":
      return { background: "#dcfce7", color: "#15803d" };
    default:
      return {
        background: "var(--color-bg)",
        color: "var(--color-text-secondary)",
      };
  }
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--color-text-muted)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.07em",
  marginBottom: 6,
};

// --- Component ----------------------------------------------------------------

export default function ExpensesIndexWeb() {
  const {
    isLoading,
    refreshing,
    isModalOpen,
    editingExpense,
    deleteConfirmId,
    clearConfirmId,
    name,
    amount,
    description,
    expenseDate,
    category,
    fundingSource,
    selectedMonth,
    setSelectedMonth,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    filterSource,
    setFilterSource,
    expenses,
    totalAmount,
    totalCount,
    capitalTotal,
    capitalPendingTotal,
    commissionsTotal,
    externalIncomeTotal,
    recurringTotal,
    categoryTotals,
    fundingSources,
    setName,
    setAmount,
    setDescription,
    setExpenseDate,
    setCategory,
    setFundingSource,
    setDeleteConfirmId,
    setClearConfirmId,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleClear,
    addCategory,
    removeCategory,
    categories,
    formatCurrency,
  } = useExpensesScreen();

  const { showToast } = useToast();
  const [clearNotes, setClearNotes] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [yearNum, monthNum] = selectedMonth.split("-").map(Number);
  const monthLabel = new Date(yearNum, monthNum - 1, 1).toLocaleDateString(
    "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );
  const goToPrevMonth = () => {
    const d = new Date(yearNum, monthNum - 2, 1);
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  const goToNextMonth = () => {
    const d = new Date(yearNum, monthNum, 1);
    setSelectedMonth(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  const oneOffTotal = totalAmount - recurringTotal;

  const sourcePills: Array<{
    value: ExpenseFundingSource | "ALL";
    label: string;
    total: number;
  }> = [
    { value: "ALL", label: "All Sources", total: totalAmount },
    { value: "CAPITAL" as const, label: "Capital", total: capitalTotal },
    {
      value: "COMMISSIONS" as const,
      label: "Commissions",
      total: commissionsTotal,
    },
    {
      value: "EXTERNAL_INCOME" as const,
      label: "External Income",
      total: externalIncomeTotal,
    },
  ];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await handleSubmit();
    if (!result.success && result.error) showToast(result.error, "error");
  };

  const onDelete = async (id: number) => {
    setIsDeleting(true);
    try {
      const result = await handleDelete(id);
      if (!result.success && result.error) showToast(result.error, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const onClear = async (id: number) => {
    const result = await handleClear(id, clearNotes || undefined);
    setClearNotes("");
    if (!result.success && result.error) showToast(result.error, "error");
  };

  if (isLoading && !refreshing) {
    return (
      <div
        className="dashboard-content"
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <div className="spinner" />
        <p
          style={{
            color: "var(--color-text-secondary)",
            marginTop: 12,
            fontSize: 14,
          }}
        >
          Loading expenses...
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* --- Compact insight strip ------------------------------------------ */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
          display: "flex",
          flexWrap: "wrap",
        }}
      >
        {/* Section 1 - Total */}
        <div
          style={{
            flex: "1 1 160px",
            padding: "16px 20px",
            borderRight: "1px solid var(--color-border-light)",
          }}
        >
          <div style={SECTION_LABEL}>Total · {monthLabel}</div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-danger)",
              letterSpacing: "-0.5px",
            }}
          >
            -{formatCurrency(totalAmount)}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginTop: 3,
            }}
          >
            {totalCount} expense{totalCount !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Section 2 - Capital impact */}
        <div
          style={{
            flex: "1 1 200px",
            padding: "16px 20px",
            borderRight: "1px solid var(--color-border-light)",
          }}
        >
          <div
            style={{
              ...SECTION_LABEL,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Capital Impact
            <span className="tooltip-wrap">
              <Info size={11} style={{ color: "var(--color-text-muted)" }} />
              <span className="tooltip-box">
                Total expenses paid from working capital. Unreimbursed amounts
                reduce your working capital balance until reimbursed.
              </span>
            </span>
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: capitalTotal > 0 ? "#be123c" : "var(--color-text-muted)",
              letterSpacing: "-0.5px",
            }}
          >
            {capitalTotal > 0 ? `-${formatCurrency(capitalTotal)}` : "\u2014"}
          </div>
          {capitalTotal > 0 && capitalPendingTotal > 0 && (
            <div
              style={{
                fontSize: 12,
                color: "#d97706",
                marginTop: 3,
                fontWeight: 600,
              }}
            >
              {"\u26A0"} {formatCurrency(capitalPendingTotal)} unreimbursed
            </div>
          )}
          {capitalTotal > 0 && capitalPendingTotal === 0 && (
            <div style={{ fontSize: 12, color: "#16a34a", marginTop: 3 }}>
              {"\u2713"} Fully reimbursed
            </div>
          )}
          {capitalTotal === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                marginTop: 3,
              }}
            >
              No capital used
            </div>
          )}
        </div>

        {/* Section 3 - Recurring vs one-off */}
        <div style={{ flex: "1 1 200px", padding: "16px 20px" }}>
          <div
            style={{
              ...SECTION_LABEL,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Recurring vs One-off
            <span className="tooltip-wrap">
              <Info size={11} style={{ color: "var(--color-text-muted)" }} />
              <span className="tooltip-box">
                Recurring: auto-generated from your recurring expense templates.
                One-off: manually entered individual expenses.
              </span>
            </span>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 2 }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  marginBottom: 2,
                }}
              >
                Recurring
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color:
                    recurringTotal > 0 ? "#7c3aed" : "var(--color-text-muted)",
                }}
              >
                {recurringTotal > 0
                  ? `-${formatCurrency(recurringTotal)}`
                  : "\u2014"}
              </div>
            </div>
            <div
              style={{
                width: 1,
                background: "var(--color-border-light)",
                alignSelf: "stretch",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--color-text-muted)",
                  marginBottom: 2,
                }}
              >
                One-off
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color:
                    oneOffTotal > 0
                      ? "var(--color-danger)"
                      : "var(--color-text-muted)",
                }}
              >
                {oneOffTotal > 0 ? `-${formatCurrency(oneOffTotal)}` : "\u2014"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Filter bar ----------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          padding: "12px 16px",
          background: "white",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={goToPrevMonth}
            style={{
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              cursor: "pointer",
              padding: "5px 7px",
              display: "flex",
              alignItems: "center",
              color: "var(--color-text-secondary)",
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--color-text)",
              minWidth: 120,
              textAlign: "center",
            }}
          >
            {monthLabel}
          </span>
          <button
            onClick={goToNextMonth}
            style={{
              background: "none",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              cursor: "pointer",
              padding: "5px 7px",
              display: "flex",
              alignItems: "center",
              color: "var(--color-text-secondary)",
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div
          style={{
            width: 1,
            height: 22,
            background: "var(--color-border)",
            flexShrink: 0,
          }}
        />

        {/* Source pills */}
        {sourcePills.map(({ value, label, total }) => {
          const active = filterSource === value;
          return (
            <button
              key={value}
              onClick={() => {
                setFilterSource(value);
                if (value !== "CAPITAL" && value !== "ALL")
                  setFilterStatus("ALL");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 11px",
                borderRadius: 999,
                border: "1px solid",
                borderColor: active
                  ? "var(--color-primary)"
                  : "var(--color-border)",
                background: active ? "rgba(192,21,42,0.08)" : "transparent",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                color: active
                  ? "var(--color-primary)"
                  : "var(--color-text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
              {value !== "ALL" && total > 0 && (
                <span
                  style={{
                    color: active ? "var(--color-primary)" : "#94a3b8",
                    fontWeight: 700,
                  }}
                >
                  -{formatCurrency(total)}
                </span>
              )}
            </button>
          );
        })}

        {/* Category dropdown */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="filter-select"
          style={{ minWidth: 150 }}
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        {/* Status dropdown - only for All or Capital */}
        {(filterSource === "ALL" || filterSource === "CAPITAL") && (
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "ALL" | "PENDING" | "CLEARED")
            }
            className="filter-select"
            style={{ minWidth: 150 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Unreimbursed</option>
            <option value="CLEARED">Reimbursed</option>
          </select>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowCategoryManager(true)}
            className="btn-secondary"
            title="Manage categories"
          >
            <Settings size={16} />
          </button>
          <button onClick={openAddModal} className="btn-add">
            <Plus size={16} />
            Add Expense
          </button>
        </div>
      </div>

      {/* --- Table ---------------------------------------------------------- */}
      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Source</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Amount</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  <DollarSign size={40} />
                  <p>No expenses for {monthLabel}</p>
                </td>
              </tr>
            ) : (
              expenses.map((expense) => {
                const isCapital = expense.fundingSource === "CAPITAL";
                const isEditable = expense.status === "PENDING";
                return (
                  <tr
                    key={expense.id}
                    onClick={() => isEditable && openEditModal(expense)}
                    style={{ cursor: isEditable ? "pointer" : "default" }}
                  >
                    <td>
                      <div
                        style={{ fontWeight: 600, color: "var(--color-text)" }}
                      >
                        {expense.name}
                      </div>
                      {expense.recurringExpenseId && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#7c3aed",
                            marginTop: 2,
                            fontWeight: 500,
                          }}
                        >
                          {"\u21BB"} Recurring
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="category-badge">
                        {expense.category || "Uncategorized"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="category-badge"
                        style={getSourceStyle(expense.fundingSource)}
                      >
                        {getFundingSourceLabel(expense.fundingSource)}
                      </span>
                    </td>
                    <td>
                      {isCapital ? (
                        <span
                          className={`category-badge ${expense.status === "CLEARED" ? "status-cleared" : "status-pending"}`}
                        >
                          {expense.status === "CLEARED"
                            ? "Reimbursed"
                            : "Unreimbursed"}
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {"\u2014"}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: 13,
                      }}
                    >
                      {formatDateLabel(expense.expenseDate)}
                    </td>
                    <td
                      style={{ textAlign: "right" }}
                      className={`amount ${expense.status === "CLEARED" ? "cleared" : "negative"}`}
                    >
                      -{formatCurrency(expense.amount)}
                    </td>
                    <td className="description">
                      {expense.description || "-"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {isCapital && expense.status === "PENDING" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClearConfirmId(expense.id);
                            }}
                            className="btn-icon-sm"
                            title="Mark as Reimbursed"
                            style={{ color: "#10B981" }}
                          >
                            <CheckCircle size={22} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(expense.id);
                          }}
                          className="btn-icon-sm delete"
                          title="Delete"
                        >
                          <Trash2 size={22} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- Category Manager Modal ---------------------------------------- */}
      {showCategoryManager && (
        <div
          className="modal-overlay"
          onClick={() => setShowCategoryManager(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Manage Categories</h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: "16px 24px 24px" }}>
              {/* Add new category */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="New category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!newCategoryName.trim()) return;
                      setIsAddingCategory(true);
                      const result = await addCategory(newCategoryName);
                      setIsAddingCategory(false);
                      if (result.success) {
                        setNewCategoryName("");
                      } else {
                        showToast(
                          result.error ?? "Failed to add category",
                          "error",
                        );
                      }
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn-add"
                  disabled={isAddingCategory || !newCategoryName.trim()}
                  onClick={async () => {
                    if (!newCategoryName.trim()) return;
                    setIsAddingCategory(true);
                    const result = await addCategory(newCategoryName);
                    setIsAddingCategory(false);
                    if (result.success) {
                      setNewCategoryName("");
                    } else {
                      showToast(
                        result.error ?? "Failed to add category",
                        "error",
                      );
                    }
                  }}
                >
                  <Plus size={16} />
                  Add
                </button>
              </div>

              {/* Category list */}
              <div
                style={{
                  maxHeight: 300,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <span style={{ fontSize: 14, color: "var(--color-text)" }}>
                      {cat.name}
                    </span>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      title="Delete category"
                      onClick={async () => {
                        const result = await removeCategory(cat.id);
                        if (!result.success) {
                          showToast(
                            result.error ?? "Failed to delete category",
                            "error",
                          );
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {categories.length === 0 && (
                  <p
                    style={{
                      color: "var(--color-text-muted)",
                      fontSize: 13,
                      textAlign: "center",
                      padding: 16,
                    }}
                  >
                    No categories yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Add / Edit Modal ----------------------------------------------- */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExpense ? "Edit Expense" : "Add Expense"}</h2>
              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Office Rent"
                  className="form-input"
                  required
                  autoFocus
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatAmountInput(amount)}
                    onChange={(e) => {
                      const clean = parseAmountInput(e.target.value);
                      if (clean !== null) setAmount(clean);
                    }}
                    placeholder="0.00"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Funding Source</label>
                  <select
                    value={fundingSource}
                    onChange={(e) =>
                      setFundingSource(e.target.value as ExpenseFundingSource)
                    }
                    className="form-select"
                  >
                    {fundingSources.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional notes"
                  className="form-textarea"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingExpense ? "Update" : "Add"} Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Delete Confirm ------------------------------------------------- */}
      {deleteConfirmId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <p
              style={{
                color: "var(--color-text-secondary)",
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              This expense will be permanently deleted.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteConfirmId && void onDelete(deleteConfirmId)
                }
                className="btn-primary"
                disabled={isDeleting}
                style={{ background: "var(--color-danger)" }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Reimburse Confirm ---------------------------------------------- */}
      {clearConfirmId !== null && (
        <div className="modal-overlay" onClick={() => setClearConfirmId(null)}>
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Mark as Reimbursed</h2>
              <button
                onClick={() => setClearConfirmId(null)}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <p
              style={{
                color: "var(--color-text-secondary)",
                marginBottom: 12,
                fontSize: 14,
              }}
            >
              This marks the capital expense as reimbursed — it will no longer
              reduce your working capital.
            </p>
            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                value={clearNotes}
                onChange={(e) => setClearNotes(e.target.value)}
                className="form-textarea"
                rows={2}
                placeholder="e.g., reimbursed by client"
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setClearConfirmId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => clearConfirmId && void onClear(clearConfirmId)}
                className="btn-primary"
              >
                Confirm Reimbursement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
