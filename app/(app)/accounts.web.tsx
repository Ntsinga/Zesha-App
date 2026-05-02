import React, { useState } from "react";
import {
  Plus,
  Building2,
  Smartphone,
  Trash2,
  X,
  Check,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Copy,
  LayoutTemplate,
  ArrowLeft,
  Layers,
} from "lucide-react";
import { formatAmountInput, parseAmountInput } from "../../utils/formatters";
import {
  useAccountsScreen,
  ACCOUNT_TYPES,
} from "../../hooks/screens/useAccountsScreen";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import type {
  Account,
  AccountTypeEnum,
  CommissionModelEnum,
} from "../../types";
import "../../styles/web.css";

export default function Accounts() {
  const {
    accounts,
    allAccounts,
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
    initialBalance,
    setInitialBalance,
    commissionScheduleId,
    setCommissionScheduleId,
    commissionModel,
    setCommissionModel,
    commissionSchedules,
    creationMode,
    setCreationMode,
    chooseCreationMode,
    cloneSource,
    selectCloneSource,
    templates,
    isTemplatesLoading,
    handleInheritTemplate,
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

  const { formatCurrency } = useCurrencyFormatter();

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Name used when inheriting a template (user can override)
  const [inheritName, setInheritName] = useState("");
  const [inheritingTemplate, setInheritingTemplate] = useState<Account | null>(
    null,
  );

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

  const onInheritTemplate = async () => {
    if (!inheritingTemplate) return;
    const result = await handleInheritTemplate(inheritingTemplate, inheritName);
    setMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });
    if (result.success) {
      setInheritingTemplate(null);
      setInheritName("");
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
                  <th>Current Balance</th>
                  <th>Commission Structure</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr
                    key={account.id}
                    onClick={() => openEditModal(account)}
                    style={{ cursor: "pointer" }}
                  >
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
                    <td className="font-medium">
                      {formatCurrency(account.currentBalance ?? 0)}
                    </td>
                    <td style={{ fontSize: 12, color: "#64748b" }}>
                      {account.commissionScheduleId != null ? (
                        (commissionSchedules.find(
                          (s) => s.id === account.commissionScheduleId,
                        )?.name ?? `Schedule #${account.commissionScheduleId}`)
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>—</span>
                      )}
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
              <h2>
                {editingAccount
                  ? "Edit Account"
                  : creationMode === null
                    ? "Add Account"
                    : creationMode === "new"
                      ? "Create New Account"
                      : creationMode === "template"
                        ? "Use System Template"
                        : "Clone Existing Account"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {editingAccount && (
                  <button
                    className="btn-icon"
                    onClick={() => {
                      closeModal();
                      confirmDelete(editingAccount);
                    }}
                    disabled={isSubmitting}
                    title="Delete account"
                    style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                {!editingAccount && creationMode !== null && (
                  <button
                    className="btn-icon"
                    onClick={() => setCreationMode(null)}
                    title="Back"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <button className="btn-icon" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Step 1 — Chooser (shown only for new account, not editing) */}
            {!editingAccount && creationMode === null && (
              <div className="modal-form">
                <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                  How would you like to set up this account?
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <button
                    onClick={() => chooseCreationMode("new")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      background: "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Plus
                      size={20}
                      style={{ color: "#3b82f6", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Create from scratch
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        New account, assign any schedule
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => chooseCreationMode("template")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      background: "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <LayoutTemplate
                      size={20}
                      style={{ color: "#8b5cf6", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Use system template
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Inherit a pre-configured account from Super Admin
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => chooseCreationMode("clone")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      background: "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <Copy
                      size={20}
                      style={{ color: "#10b981", flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Clone an existing account
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Reuse the commission structure from another account
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2b — Template list */}
            {!editingAccount && creationMode === "template" && (
              <div className="modal-form">
                {isTemplatesLoading ? (
                  <div style={{ textAlign: "center", padding: 24 }}>
                    <RefreshCw size={20} className="spin" />
                  </div>
                ) : templates.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 24,
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    No system templates available. Ask your Super Admin to
                    create some.
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 8 }}
                  >
                    {templates.map((tmpl) => (
                      <div
                        key={tmpl.id}
                        style={{
                          border:
                            inheritingTemplate?.id === tmpl.id
                              ? "1px solid #8b5cf6"
                              : "1px solid #e2e8f0",
                          borderRadius: 8,
                          padding: "12px 14px",
                          background:
                            inheritingTemplate?.id === tmpl.id
                              ? "#f5f3ff"
                              : "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>
                              {tmpl.name}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#64748b",
                                marginTop: 2,
                              }}
                            >
                              {tmpl.accountType}
                              {tmpl.commissionSchedule && (
                                <span style={{ marginLeft: 8 }}>
                                  <Layers
                                    size={10}
                                    style={{
                                      display: "inline",
                                      marginRight: 3,
                                    }}
                                  />
                                  {tmpl.commissionSchedule.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            className="btn-primary"
                            style={{ padding: "4px 12px", fontSize: 12 }}
                            onClick={() => {
                              setInheritingTemplate(tmpl);
                              setInheritName(tmpl.name);
                            }}
                          >
                            Use
                          </button>
                        </div>
                        {inheritingTemplate?.id === tmpl.id && (
                          <div style={{ marginTop: 10 }}>
                            <label className="form-label">Account Name</label>
                            <input
                              type="text"
                              value={inheritName}
                              onChange={(e) => setInheritName(e.target.value)}
                              placeholder="Enter a name for this account"
                              className="form-input"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {inheritingTemplate && (
                  <div className="modal-footer" style={{ marginTop: 16 }}>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setInheritingTemplate(null);
                        setInheritName("");
                      }}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={onInheritTemplate}
                      disabled={isSubmitting || !inheritName.trim()}
                      style={{ flex: 2 }}
                    >
                      {isSubmitting ? (
                        <RefreshCw size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      {isSubmitting ? "Creating..." : "Create Account"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2c — Clone: pick a source account */}
            {!editingAccount && creationMode === "clone" && (
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">Clone schedule from</label>
                  <select
                    className="form-input"
                    style={{ appearance: "none" }}
                    value={cloneSource?.id ?? ""}
                    onChange={(e) => {
                      const src = allAccounts.find(
                        (a) => a.id === Number(e.target.value),
                      );
                      if (src) selectCloneSource(src);
                    }}
                  >
                    <option value="">Select account to clone...</option>
                    {allAccounts
                      .filter((a) => a.commissionScheduleId != null)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                  {cloneSource?.commissionSchedule && (
                    <span className="form-hint">
                      Schedule: {cloneSource.commissionSchedule.name}
                    </span>
                  )}
                </div>

                {cloneSource && (
                  <>
                    <div className="form-group">
                      <label className="form-label">New Account Name *</label>
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
                            className={`type-button ${accountType === type.value ? "selected" : ""}`}
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
                    <div className="modal-footer">
                      <button
                        className="btn-secondary"
                        onClick={closeModal}
                        disabled={isSubmitting}
                        style={{ flex: 1 }}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        onClick={onSubmit}
                        disabled={isSubmitting || !name.trim()}
                        style={{ flex: 2 }}
                      >
                        {isSubmitting ? (
                          <RefreshCw size={16} className="spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        {isSubmitting ? "Creating..." : "Create Account"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2a / Edit — standard form */}
            {(editingAccount || creationMode === "new") && (
              <>
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

                  {accountType === "TELECOM" && (
                    <div className="form-group">
                      <label className="form-label">Commission Model</label>
                      <div className="type-buttons">
                        {[
                          {
                            value: "CUMULATIVE" as CommissionModelEnum,
                            label: "Cumulative",
                            hint: "Agent submits monthly running total; today = submitted − yesterday",
                          },
                          {
                            value: "PARTIAL" as CommissionModelEnum,
                            label: "Partial",
                            hint: "Agent submits withdrawals only; deposits auto-added from expected rates",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            className={`type-button ${commissionModel === opt.value ? "selected" : ""}`}
                            onClick={() => setCommissionModel(opt.value)}
                            title={opt.hint}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <span className="form-hint">
                        {commissionModel === "CUMULATIVE"
                          ? "Agent submits a monthly running total; actual = submitted today − submitted yesterday"
                          : commissionModel === "PARTIAL"
                            ? "Agent submits withdrawal commissions only; deposit commissions are auto-added from expected rates"
                            : "Select a commission model"}
                      </span>
                    </div>
                  )}

                  {!editingAccount && (
                    <div className="form-group">
                      <label className="form-label">Initial Balance</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatAmountInput(initialBalance)}
                        onChange={(e) => {
                          const clean = parseAmountInput(e.target.value);
                          if (clean !== null) setInitialBalance(clean);
                        }}
                        placeholder="0.00"
                        className="form-input"
                      />
                      <span className="form-hint">
                        Starting balance for audit tracking (cannot be changed
                        later)
                      </span>
                    </div>
                  )}

                  {editingAccount && (
                    <div className="form-group">
                      <label className="form-label">Current Balance</label>
                      <input
                        type="text"
                        value={formatCurrency(
                          editingAccount.currentBalance ?? 0,
                        )}
                        className="form-input"
                        disabled
                        style={{ background: "#f8fafc", color: "#64748b" }}
                      />
                    </div>
                  )}

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

                  <div style={{ display: "flex", gap: 12 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Commission Structure</label>
                      <div style={{ position: "relative" }}>
                        <select
                          value={commissionScheduleId ?? ""}
                          onChange={(e) =>
                            setCommissionScheduleId(
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          className="form-input"
                          style={{ appearance: "none", paddingRight: 32 }}
                        >
                          <option value="">No structure assigned</option>
                          {commissionSchedules
                            .filter((s) => s.isActive)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                        <ChevronDown
                          size={16}
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            pointerEvents: "none",
                            color: "#64748b",
                          }}
                        />
                      </div>
                      <span className="form-hint">
                        Defines how deposit and withdrawal commissions are
                        calculated. Manage structures in the Commission
                        Structures page.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn-secondary"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    style={{ flex: 2 }}
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
              </>
            )}
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
