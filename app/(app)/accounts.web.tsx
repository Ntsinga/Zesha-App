import React, { useState } from "react";
import {
  Plus,
  Building2,
  Smartphone,
  Edit2,
  Trash2,
  X,
  Check,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import {
  useAccountsScreen,
  ACCOUNT_TYPES,
} from "../../hooks/screens/useAccountsScreen";
import type { AccountTypeEnum } from "../../types";
import "../../styles/web.css";

export default function Accounts() {
  const {
    accounts,
    isLoading,
    refreshing,
    isSubmitting,
    isModalOpen,
    editingAccount,
    showDeleteConfirm,
    accountToDelete,
    filterType,
    setFilterType,
    filterActive,
    setFilterActive,
    searchQuery,
    setSearchQuery,
    name,
    setName,
    accountType,
    setAccountType,
    isActive,
    setIsActive,
    stats,
    onRefresh,
    openAddModal,
    openEditModal,
    closeModal,
    handleSubmit,
    confirmDelete,
    handleDelete,
    cancelDelete,
  } = useAccountsScreen();

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onSubmit = async () => {
    const result = await handleSubmit();
    setMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });

    if (result.success) {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const onConfirmDelete = async () => {
    const result = await handleDelete();
    setMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });

    if (result.success) {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Accounts</h1>
          <span className="header-date">Manage bank and telecom accounts</span>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={onRefresh}
            disabled={isLoading || refreshing}
          >
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={16} />
            Add Account
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        {message && (
          <div
            className={`alert ${
              message.type === "success" ? "alert-success" : "alert-error"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total Accounts</span>
              <span className="stat-value">{stats.total}</span>
            </div>
          </div>
          <div className="stat-card success">
            <div className="stat-content">
              <span className="stat-label">Active</span>
              <span className="stat-value">{stats.active}</span>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-content">
              <span className="stat-label">Inactive</span>
              <span className="stat-value">{stats.inactive}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Building2 size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Bank</span>
              <span className="stat-value">{stats.bank}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Smartphone size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Telecom</span>
              <span className="stat-value">{stats.telecom}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as AccountTypeEnum | "ALL")
              }
              className="filter-select"
            >
              <option value="ALL">All Types</option>
              <option value="BANK">Bank</option>
              <option value="TELECOM">Telecom</option>
            </select>
            <select
              value={
                filterActive === "ALL"
                  ? "ALL"
                  : filterActive
                    ? "active"
                    : "inactive"
              }
              onChange={(e) => {
                const val = e.target.value;
                setFilterActive(val === "ALL" ? "ALL" : val === "active");
              }}
              className="filter-select"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Accounts Table */}
        {accounts.length === 0 ? (
          <div className="empty-state">
            <Building2 size={48} className="empty-icon" />
            <h3>No accounts found</h3>
            <p>Add your first account to get started</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="account-name">
                      {account.accountType === "BANK" ? (
                        <Building2 size={16} className="text-muted" />
                      ) : (
                        <Smartphone size={16} className="text-muted" />
                      )}
                      {account.name}
                    </td>
                    <td>
                      <span
                        className={`category-badge ${account.accountType.toLowerCase()}`}
                      >
                        {account.accountType}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${
                          account.isActive ? "passed" : "failed"
                        }`}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-sm"
                          onClick={() => openEditModal(account)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon-sm danger"
                          onClick={() => confirmDelete(account)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingAccount ? "Edit Account" : "Add Account"}</h2>
              <button className="btn-icon" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Account Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter account name"
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account Type</label>
                <div className="type-buttons">
                  {ACCOUNT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      className={`type-button ${
                        accountType === type.value ? "selected" : ""
                      }`}
                      onClick={() => setAccountType(type.value)}
                    >
                      {type.value === "BANK" ? (
                        <Building2 size={16} />
                      ) : (
                        <Smartphone size={16} />
                      )}
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <div className="toggle-group">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">
                      {isActive ? "Active" : "Inactive"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={onSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <Check size={16} />
                )}
                {isSubmitting
                  ? "Saving..."
                  : editingAccount
                    ? "Update"
                    : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && accountToDelete && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete Account</h2>
              <button className="btn-icon" onClick={cancelDelete}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p>
                Are you sure you want to delete{" "}
                <strong>{accountToDelete.name}</strong>? This action cannot be
                undone.
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn-danger" onClick={onConfirmDelete}>
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
