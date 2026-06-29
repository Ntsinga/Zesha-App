import React, { useState } from "react";
import {
  Plus,
  Users,
  RefreshCw,
  Trash2,
  X,
  Check,
  CreditCard,
  UserPlus,
  UserMinus,
  Settings,
} from "lucide-react";

import { useTellersScreen } from "@/hooks/screens/useTellersScreen";
import { useAppSelector } from "@/store/hooks";
import { selectUserRole } from "@/store/slices/authSlice";
import { useCurrencyFormatter } from "@/hooks/useCurrency";
import type { Teller, ShiftEnum } from "@/types";
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
    newTargetCash,
    setNewTargetCash,
    newTargetFloat,
    setNewTargetFloat,
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
  const [assignAccountShift, setAssignAccountShift] = useState<ShiftEnum>("AM");

  // Assign user form state
  const [assignUserId, setAssignUserId] = useState<number | "">("");
  const [assignUserDate, setAssignUserDate] = useState(todayStr());
  const [assignUserShift, setAssignUserShift] = useState<ShiftEnum>("AM");

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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <Users size={24} style={{ color: "var(--color-primary)" }} />
          <h1 className="page-title">Tellers</h1>
          <span className="badge badge-info">{tellers.length}</span>
        </div>
        <div className="page-header-right">
          <button
            className="btn btn-ghost btn-sm"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
          </button>
          {isAdmin && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              Add Teller
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <p>{error}</p>
        </div>
      )}

      {/* Main content: list + detail */}
      <div className="split-layout">
        {/* Left: Teller list */}
        <div className="split-layout-sidebar">
          {tellers.length === 0 ? (
            <div className="empty-state">
              <Users size={48} style={{ color: "var(--color-text-muted)" }} />
              <p>No tellers configured</p>
              {isAdmin && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  Create First Teller
                </button>
              )}
            </div>
          ) : (
            <div className="list-items">
              {tellers.map((teller) => (
                <div
                  key={teller.id}
                  className={`list-item ${selectedTellerId === teller.id ? "list-item-active" : ""}`}
                  onClick={() => setSelectedTellerId(teller.id)}
                >
                  <div className="list-item-content">
                    <div className="list-item-header">
                      <span className="list-item-title">{teller.name}</span>
                      <span className="badge badge-ghost">{teller.code}</span>
                    </div>
                    <div className="list-item-meta">
                      <span>Cash: {formatCurrency(teller.targetCash)}</span>
                      <span>Float: {formatCurrency(teller.targetFloat)}</span>
                    </div>
                  </div>
                  {!teller.isActive && (
                    <span className="badge badge-warning">Inactive</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="split-layout-main">
          {selectedTeller ? (
            <div className="detail-panel">
              <div className="detail-header">
                <div>
                  <h2 className="detail-title">
                    {selectedTeller.name}
                    <span
                      className="badge badge-ghost"
                      style={{ marginLeft: 8 }}
                    >
                      {selectedTeller.code}
                    </span>
                  </h2>
                  <p className="detail-subtitle">
                    Cash Target: {formatCurrency(selectedTeller.targetCash)} |
                    Float Target: {formatCurrency(selectedTeller.targetFloat)}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(selectedTeller.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Assigned Accounts */}
              <div className="detail-section">
                <div className="detail-section-header">
                  <h3>
                    <CreditCard size={16} /> Assigned Accounts
                  </h3>
                  {isAdmin && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowAssignAccountModal(true)}
                    >
                      <Plus size={14} /> Assign
                    </button>
                  )}
                </div>
                {selectedTeller.assignedAccounts.length === 0 ? (
                  <p className="text-muted">No accounts assigned</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Since</th>
                          <th>Status</th>
                          {isAdmin && <th></th>}
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
                                <span className="badge badge-ghost">
                                  Ended {a.endedAtDate}
                                </span>
                              ) : (
                                <span className="badge badge-success">
                                  Active
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td>
                                {!a.endedAtDate && (
                                  <button
                                    className="btn btn-ghost btn-xs"
                                    onClick={() =>
                                      handleEndAccountAssignment(a.id, {
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
                  </div>
                )}
              </div>

              {/* Assigned Users */}
              <div className="detail-section">
                <div className="detail-section-header">
                  <h3>
                    <Users size={16} /> Assigned Users
                  </h3>
                  {isAdmin && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowAssignUserModal(true)}
                    >
                      <Plus size={14} /> Assign
                    </button>
                  )}
                </div>
                {selectedTeller.assignedUsers.length === 0 ? (
                  <p className="text-muted">No users assigned</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Since</th>
                          <th>Status</th>
                          {isAdmin && <th></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTeller.assignedUsers.map((u) => (
                          <tr key={u.id}>
                            <td>
                              {u.userName || u.userEmail || `#${u.userId}`}
                            </td>
                            <td>
                              {u.effectiveDate} ({u.effectiveShift})
                            </td>
                            <td>
                              {u.endedAtDate ? (
                                <span className="badge badge-ghost">
                                  Ended {u.endedAtDate}
                                </span>
                              ) : (
                                <span className="badge badge-success">
                                  Active
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td>
                                {!u.endedAtDate && (
                                  <button
                                    className="btn btn-ghost btn-xs"
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
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Settings
                size={48}
                style={{ color: "var(--color-text-muted)" }}
              />
              <p>Select a teller to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Teller Modal */}
      {showCreateModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Teller</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Main Counter"
                  value={newTellerName}
                  onChange={(e) => setNewTellerName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Cash</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0"
                  value={newTargetCash}
                  onChange={(e) => setNewTargetCash(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Float</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0"
                  value={newTargetFloat}
                  onChange={(e) => setNewTargetFloat(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
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
          className="modal-backdrop"
          onClick={() => setShowAssignAccountModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Account to {selectedTeller?.name}</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAssignAccountModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
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
                    setAssignAccountShift(e.target.value as ShiftEnum)
                  }
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowAssignAccountModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
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
          className="modal-backdrop"
          onClick={() => setShowAssignUserModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign User to {selectedTeller?.name}</h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAssignUserModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">User ID</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="Enter user ID"
                  value={assignUserId}
                  onChange={(e) =>
                    setAssignUserId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                />
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
                    setAssignUserShift(e.target.value as ShiftEnum)
                  }
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowAssignUserModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
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
