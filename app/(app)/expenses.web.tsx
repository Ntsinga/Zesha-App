import React, { useState } from "react";
import {
  RefreshCw,
  Plus,
  Trash2,
  X,
  DollarSign,
  Filter,
  Receipt,
  CheckCircle,
} from "lucide-react";
import {
  useExpensesScreen,
  EXPENSE_CATEGORIES,
} from "../../hooks/screens/useExpensesScreen";
import "../../styles/web.css";

/**
 * Web Expenses - Table view with inline form modal
 */
export default function ExpensesWeb() {
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
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    expenses,
    totalAmount,
    setName,
    setAmount,
    setDescription,
    setExpenseDate,
    setCategory,
    setDeleteConfirmId,
    setClearConfirmId,
    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    handleDelete,
    handleClear,
    formatCurrency,
  } = useExpensesScreen();

  const [clearNotes, setClearNotes] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await handleSubmit();
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  const onDelete = async (id: number) => {
    const result = await handleDelete(id);
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  const onClear = async (id: number) => {
    const result = await handleClear(id, clearNotes || undefined);
    setClearNotes("");
    if (!result.success && result.error) {
      alert(result.error);
    }
  };

  if (isLoading && !refreshing) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner" />
          <p className="loading-text">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Expenses</h1>
          <span className="header-date">
            Total: {formatCurrency(totalAmount)}
          </span>
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
        {/* Summary Card */}
        <div className="summary-card">
          <div className="summary-icon">
            <Receipt size={24} />
          </div>
          <div className="summary-details">
            <span className="summary-label">Total Expenses</span>
            <span className="summary-amount negative">
              -{formatCurrency(totalAmount)}
            </span>
          </div>
          <div className="summary-count">
            <span className="count-number">{expenses.length}</span>
            <span className="count-label">items</span>
          </div>
        </div>

        {/* Filters + Add Button */}
        <div className="filter-bar">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="ALL">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as "ALL" | "PENDING" | "CLEARED")
              }
              className="filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CLEARED">Cleared</option>
            </select>
          </div>
          <button onClick={openAddModal} className="btn-add">
            <Plus size={16} />
            Add Expense
          </button>
        </div>

        {/* Expenses Table */}
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty">
                    <DollarSign size={40} />
                    <p>No expenses recorded</p>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    onClick={() =>
                      expense.status === "PENDING" && openEditModal(expense)
                    }
                    style={{
                      cursor:
                        expense.status === "PENDING" ? "pointer" : "default",
                    }}
                  >
                    <td className="font-medium">{expense.name}</td>
                    <td>
                      <span className="category-badge">
                        {expense.category || "Uncategorized"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`category-badge ${
                          expense.status === "CLEARED"
                            ? "status-cleared"
                            : "status-pending"
                        }`}
                      >
                        {expense.status === "CLEARED" ? "Cleared" : "Pending"}
                      </span>
                    </td>
                    <td>{expense.expenseDate}</td>
                    <td
                      className={`amount ${
                        expense.status === "CLEARED" ? "cleared" : "negative"
                      }`}
                    >
                      -{formatCurrency(expense.amount)}
                    </td>
                    <td className="description">
                      {expense.description || "-"}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {expense.status === "PENDING" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClearConfirmId(expense.id);
                            }}
                            className="btn-icon-sm"
                            title="Mark as Cleared"
                            style={{ color: "#10B981" }}
                          >
                            <CheckCircle size={24} />
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
                          <Trash2 size={24} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
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
                  placeholder="Expense name"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="form-input"
                    min="0"
                    step="0.01"
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
              <div className="form-group">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select category</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
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

      {/* Delete Confirmation Modal */}
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
            <div className="modal-body">
              <p>
                Are you sure you want to delete this expense? This action cannot
                be undone.
              </p>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => onDelete(deleteConfirmId)}
                className="btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {clearConfirmId !== null && (
        <div
          className="modal-overlay"
          onClick={() => {
            setClearConfirmId(null);
            setClearNotes("");
          }}
        >
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <CheckCircle
                size={20}
                style={{ color: "#10B981", marginRight: 8 }}
              />
              <h2>Mark as Cleared?</h2>
              <button
                onClick={() => {
                  setClearConfirmId(null);
                  setClearNotes("");
                }}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                This marks the expense as recovered or reimbursed. It will no
                longer reduce working capital.
              </p>
              <div className="form-group" style={{ marginTop: 12 }}>
                <label>Notes (optional)</label>
                <textarea
                  value={clearNotes}
                  onChange={(e) => setClearNotes(e.target.value)}
                  placeholder="e.g., reimbursed by client"
                  className="form-textarea"
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => {
                  setClearConfirmId(null);
                  setClearNotes("");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => onClear(clearConfirmId)}
                style={{ background: "#10B981", color: "white" }}
                className="btn-primary"
              >
                Confirm Cleared
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
