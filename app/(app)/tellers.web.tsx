import React, { useState } from "react";
import {
  Plus,
  Users,
  RefreshCw,
  Trash2,
  X,
  Check,
  CreditCard,
  UserMinus,
  Unlink,
  Settings,
} from "lucide-react";

import { useTellersScreen } from "@/hooks/screens/useTellersScreen";
import { useAppSelector } from "@/store/hooks";
import { selectUserRole } from "@/store/slices/authSlice";
import { useCurrencyFormatter } from "@/hooks/useCurrency";
import { formatAmountInput, parseAmountInput } from "@/utils/formatters";
import "../../styles/web.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TellersWeb() {
  const role = useAppSelector(selectUserRole);
  const { formatCurrency } = useCurrencyFormatter();
  const {
    tellers,
    selectedTeller,
    isLoading,
    error,
    refreshing,
    accounts,
    companyUsers,
    selectedTellerId,
    setSelectedTellerId,
    showCreateModal,
    setShowCreateModal,
    showAssignAccountModal,
    setShowAssignAccountModal,
    showAssignUserModal,
    setShowAssignUserModal,
    newTellerName,
    setNewTellerName,
    newTargetOperatingCapital,
    setNewTargetOperatingCapital,
    onRefresh,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleAssignAccount,
    handleEndAccountAssignment,
    handleAssignUser,
    handleEndUserAssignment,
  } = useTellersScreen();

  // Assign account form state
  const [assignAccountId, setAssignAccountId] = useState<number | "">("");
  const [assignAccountDate, setAssignAccountDate] = useState(todayStr());
  const [assignAccountShift, setAssignAccountShift] = useState<
    "AM" | "PM" | "Both"
  >("Both");

  // Assign user form state
  const [assignUserId, setAssignUserId] = useState<number | "">("");
  const [assignUserDate, setAssignUserDate] = useState(todayStr());
  const [assignUserShift, setAssignUserShift] = useState<"AM" | "PM" | "Both">(
    "Both",
  );

  const isAdmin = role === "Super Administrator" || role === "Administrator";

  // Loading state
  if (isLoading && tellers.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner" />
          <p className="loading-text">Loading tellers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          <Users size={22} color="var(--color-primary)" />
          <h1 className="header-title">Tellers</h1>
          <span className="header-date">{tellers.length} configured</span>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          </button>
          {isAdmin && (
            <button
              className="btn-add"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              Add Teller
            </button>
          )}
        </div>
      </header>

      <div className="dashboard-content">
        {error && (
          <div className="alert alert-error">
            <p>{error}</p>
          </div>
        )}

        {/* Two-panel layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Left: Teller list */}
          <div className="table-card">
            <div className="table-header">
              <h3>All Tellers</h3>
            </div>
            {tellers.length === 0 ? (
              <div className="empty-state">
                <Users
                  size={40}
                  style={{ color: "var(--color-text-muted)", marginBottom: 12 }}
                />
                <p style={{ margin: 0 }}>No tellers configured</p>
                {isAdmin && (
                  <button
                    className="btn-add"
                    style={{ marginTop: 16 }}
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus size={16} />
                    Create First Teller
                  </button>
                )}
              </div>
            ) : (
              <div style={{ padding: 0 }}>
                {tellers.map((teller) => (
                  <div
                    key={teller.id}
                    onClick={() => setSelectedTellerId(teller.id)}
                    style={{
                      padding: "14px 24px",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--color-border-light)",
                      background:
                        selectedTellerId === teller.id
                          ? "var(--color-bg)"
                          : "white",
                      borderLeft:
                        selectedTellerId === teller.id
                          ? "3px solid var(--color-primary)"
                          : "3px solid transparent",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {teller.name}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          background: "var(--color-bg)",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {teller.code}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 16,
                        marginTop: 4,
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <span>
                        Target: {formatCurrency(teller.targetOperatingCapital)}
                      </span>
                    </div>
                    {!teller.isActive && (
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "var(--color-warning-light)",
                          color: "var(--color-warning)",
                          fontWeight: 600,
                        }}
                      >
                        Inactive
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Detail panel */}
          <div className="table-card">
            {selectedTeller ? (
              <>
                <div className="table-header">
                  <div>
                    <h3 style={{ margin: 0 }}>
                      {selectedTeller.name}
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          background: "var(--color-bg)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontWeight: 500,
                        }}
                      >
                        {selectedTeller.code}
                      </span>
                    </h3>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Target Operating Capital:{" "}
                      {formatCurrency(selectedTeller.targetOperatingCapital)}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      className="btn-icon"
                      onClick={() => handleDelete(selectedTeller.id)}
                      title="Delete teller"
                      style={{ color: "var(--color-danger)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div
                  style={{
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 24,
                  }}
                >
                  {/* Assigned Accounts Section */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <CreditCard size={16} /> Assigned Accounts
                      </h4>
                      {isAdmin && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: "6px 12px" }}
                          onClick={() => setShowAssignAccountModal(true)}
                        >
                          <Plus size={14} /> Assign
                        </button>
                      )}
                    </div>
                    {selectedTeller.assignedAccounts.length === 0 ? (
                      <p
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: 13,
                        }}
                      >
                        No accounts assigned yet
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Account</th>
                            <th>Since</th>
                            <th>Status</th>
                            {isAdmin && <th style={{ width: 40 }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTeller.assignedAccounts.map((a) => (
                            <tr key={a.id}>
                              <td>
                                {a.accountName || `Account #${a.accountId}`}
                              </td>
                              <td>
                                {a.effectiveDate} ({a.effectiveShift})
                              </td>
                              <td>
                                {a.endedAtDate ? (
                                  <span className="status-badge neutral">
                                    Ended {a.endedAtDate}
                                  </span>
                                ) : (
                                  <span className="status-badge success">
                                    Active
                                  </span>
                                )}
                              </td>
                              {isAdmin && (
                                <td>
                                  {!a.endedAtDate && (
                                    <button
                                      className="btn-icon"
                                      title="End assignment"
                                      onClick={() =>
                                        handleEndAccountAssignment(a.id, {
                                          endedAtDate: todayStr(),
                                          endedAtShift: "PM",
                                        })
                                      }
                                    >
                                      <Unlink size={14} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Assigned Users Section */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Users size={16} /> Assigned Users
                      </h4>
                      {isAdmin && (
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 12, padding: "6px 12px" }}
                          onClick={() => setShowAssignUserModal(true)}
                        >
                          <Plus size={14} /> Assign
                        </button>
                      )}
                    </div>
                    {selectedTeller.assignedUsers.length === 0 ? (
                      <p
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: 13,
                        }}
                      >
                        No users assigned yet
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>User</th>
                            <th>Since</th>
                            <th>Status</th>
                            {isAdmin && <th style={{ width: 40 }}></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTeller.assignedUsers.map((u) => (
                            <tr key={u.id}>
                              <td>
                                {u.userName ||
                                  u.userEmail ||
                                  `User #${u.userId}`}
                              </td>
                              <td>
                                {u.effectiveDate} ({u.effectiveShift})
                              </td>
                              <td>
                                {u.endedAtDate ? (
                                  <span className="status-badge neutral">
                                    Ended {u.endedAtDate}
                                  </span>
                                ) : (
                                  <span className="status-badge success">
                                    Active
                                  </span>
                                )}
                              </td>
                              {isAdmin && (
                                <td>
                                  {!u.endedAtDate && (
                                    <button
                                      className="btn-icon"
                                      title="End assignment"
                                      onClick={() =>
                                        handleEndUserAssignment(u.id, {
                                          endedAtDate: todayStr(),
                                          endedAtShift: "PM",
                                        })
                                      }
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Settings
                  size={40}
                  style={{ color: "var(--color-text-muted)", marginBottom: 12 }}
                />
                <p style={{ margin: 0 }}>Select a teller to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Teller Modal */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Teller</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <p>{error}</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Main Counter"
                  value={newTellerName}
                  onChange={(e) => setNewTellerName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Operating Capital</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={formatAmountInput(newTargetOperatingCapital)}
                  onChange={(e) => {
                    const parsed = parseAmountInput(e.target.value);
                    if (parsed !== null) setNewTargetOperatingCapital(parsed);
                  }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!newTellerName.trim()}
              >
                <Check size={16} /> Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Account Modal */}
      {showAssignAccountModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAssignAccountModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Account to {selectedTeller?.name}</h2>
              <button
                className="modal-close"
                onClick={() => setShowAssignAccountModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: 16 }}>
                  <p>{error}</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Account</label>
                <select
                  className="form-input"
                  value={assignAccountId}
                  onChange={(e) =>
                    setAssignAccountId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Effective Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={assignAccountDate}
                  onChange={(e) => setAssignAccountDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Effective Shift</label>
                <select
                  className="form-input"
                  value={assignAccountShift}
                  onChange={(e) =>
                    setAssignAccountShift(
                      e.target.value as "AM" | "PM" | "Both",
                    )
                  }
                >
                  <option value="Both">Both (AM &amp; PM)</option>
                  <option value="AM">AM only</option>
                  <option value="PM">PM only</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAssignAccountModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!assignAccountId) return;
                  handleAssignAccount({
                    accountId: Number(assignAccountId),
                    effectiveDate: assignAccountDate,
                    effectiveShift: assignAccountShift,
                  });
                  setShowAssignAccountModal(false);
                  setAssignAccountId("");
                }}
                disabled={!assignAccountId}
              >
                <Check size={16} /> Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign User Modal */}
      {showAssignUserModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAssignUserModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign User to {selectedTeller?.name}</h2>
              <button
                className="modal-close"
                onClick={() => setShowAssignUserModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">User</label>
                <select
                  className="form-input"
                  value={assignUserId}
                  onChange={(e) =>
                    setAssignUserId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                >
                  <option value="">Select user...</option>
                  {companyUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email}{" "}
                      ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Effective Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={assignUserDate}
                  onChange={(e) => setAssignUserDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Effective Shift</label>
                <select
                  className="form-input"
                  value={assignUserShift}
                  onChange={(e) =>
                    setAssignUserShift(e.target.value as "AM" | "PM" | "Both")
                  }
                >
                  <option value="Both">Both (AM &amp; PM)</option>
                  <option value="AM">AM only</option>
                  <option value="PM">PM only</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAssignUserModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (!assignUserId) return;
                  handleAssignUser({
                    userId: Number(assignUserId),
                    effectiveDate: assignUserDate,
                    effectiveShift: assignUserShift,
                  });
                  setShowAssignUserModal(false);
                  setAssignUserId("");
                }}
                disabled={!assignUserId}
              >
                <Check size={16} /> Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
