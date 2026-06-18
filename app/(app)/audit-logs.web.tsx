import React from "react";
import {
  Shield,
  Filter,
  Search,
  Clock,
  RefreshCw,
  Activity,
  Plus,
  Edit,
  Trash2,
  User,
} from "lucide-react";

import { useAuditLogsScreen } from "@/hooks/screens/useAuditLogsScreen";
import "../../styles/web.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatActionLabel(action: string) {
  return action.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function getActionBadgeStyle(action: string): React.CSSProperties {
  switch (action) {
    case "create":
      return {
        background: "var(--color-success-light)",
        color: "var(--color-success)",
      };
    case "update":
    case "update_user_role":
      return {
        background: "var(--color-info-light)",
        color: "var(--color-info)",
      };
    case "delete":
      return {
        background: "var(--color-danger-light)",
        color: "var(--color-danger)",
      };
    case "finalize":
    case "approve":
      return { background: "#dcfce7", color: "#15803d" };
    case "reject":
      return {
        background: "var(--color-warning-light)",
        color: "var(--color-warning)",
      };
    case "invite_user":
    case "activate_user":
      return { background: "#ede9fe", color: "#7c3aed" };
    case "deactivate_user":
      return { background: "#fee2e2", color: "#991b1b" };
    default:
      return {
        background: "var(--color-bg)",
        color: "var(--color-text-secondary)",
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuditLogsWeb() {
  const {
    items,
    total,
    isLoading,
    refreshing,
    actionFilter,
    entityTypeFilter,
    dateFrom,
    dateTo,
    selectedLog,
    selectedLogId,
    setSelectedLogId,
    setActionFilter,
    setEntityTypeFilter,
    setDateFrom,
    setDateTo,
    onRefresh,
    formatDate,
  } = useAuditLogsScreen();

  const createCount = items.filter((x) => x.action === "create").length;
  const updateCount = items.filter(
    (x) => x.action === "update" || x.action === "update_user_role",
  ).length;
  const deleteCount = items.filter((x) => x.action === "delete").length;

  if (isLoading && items.length === 0) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner" />
          <p className="loading-text">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* ── Header ── */}
      <header className="header-bar">
        <div className="header-left">
          <Shield size={22} color="var(--color-primary)" />
          <h1 className="header-title">Audit Logs</h1>
          <span className="header-date">{total} total events</span>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={() => void onRefresh()}
            disabled={isLoading || refreshing}
            title="Refresh"
          >
            <RefreshCw
              size={16}
              className={isLoading || refreshing ? "spin" : ""}
            />
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* ── Stats row ── */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon total">
              <Activity size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Showing</span>
              <span className="stat-number">{items.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <Plus size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Creates</span>
              <span className="stat-number success">{createCount}</span>
            </div>
          </div>
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{
                background: "var(--color-info-light)",
                color: "var(--color-info)",
              }}
            >
              <Edit size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Updates</span>
              <span
                className="stat-number"
                style={{ color: "var(--color-info)" }}
              >
                {updateCount}
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <Trash2 size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Deletes</span>
              <span className="stat-number danger">{deleteCount}</span>
            </div>
          </div>
        </div>

        {/* ── Two-panel layout ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: 24,
            alignItems: "start",
          }}
        >
          {/* Left: filters + table */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Filter bar */}
            <div className="filter-bar">
              <div className="filter-group">
                <Filter size={15} />
                <select
                  value={actionFilter}
                  onChange={(e) =>
                    setActionFilter(e.target.value as typeof actionFilter)
                  }
                  className="filter-select"
                >
                  <option value="ALL">All actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="finalize">Finalize</option>
                  <option value="approve">Approve</option>
                  <option value="reject">Reject</option>
                  <option value="update_user_role">Role change</option>
                  <option value="invite_user">Invite user</option>
                  <option value="activate_user">Activate user</option>
                  <option value="deactivate_user">Deactivate user</option>
                </select>
              </div>
              <div className="filter-group">
                <Search size={15} />
                <input
                  className="filter-input"
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  placeholder="Entity type…"
                />
              </div>
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                From
              </span>
              <input
                type="date"
                className="filter-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ minWidth: 130 }}
              />
              <span
                style={{
                  color: "var(--color-text-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                To
              </span>
              <input
                type="date"
                className="filter-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ minWidth: 130 }}
              />
            </div>

            {/* Table */}
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Actor</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty">
                        <Clock size={40} />
                        <p>No audit events found</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const isSelected =
                        selectedLogId === item.id ||
                        (!selectedLogId && selectedLog?.id === item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedLogId(item.id)}
                          style={{
                            cursor: "pointer",
                            backgroundColor: isSelected
                              ? "var(--color-gold-light)"
                              : undefined,
                          }}
                        >
                          <td
                            style={{
                              fontSize: 13,
                              color: "var(--color-text-secondary)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatDate(item.occurredAt, "short")}
                          </td>
                          <td>
                            <span
                              className="status-badge"
                              style={getActionBadgeStyle(item.action)}
                            >
                              {formatActionLabel(item.action)}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>
                            <span style={{ fontWeight: 600 }}>
                              {item.entityType}
                            </span>
                            <span
                              style={{
                                color: "var(--color-text-muted)",
                                marginLeft: 4,
                              }}
                            >
                              #{item.entityId}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {item.actor.displayName ||
                              item.actor.email ||
                              "Unknown"}
                          </td>
                          <td className="description" style={{ maxWidth: 220 }}>
                            {item.summary || (
                              <span
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: detail panel */}
          <div className="card" style={{ position: "sticky", top: 24 }}>
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={16} color="var(--color-primary)" />
                <span className="card-title">Event Detail</span>
              </div>
              {selectedLog && (
                <span
                  className="status-badge"
                  style={getActionBadgeStyle(selectedLog.action)}
                >
                  {formatActionLabel(selectedLog.action)}
                </span>
              )}
            </div>
            <div className="card-body">
              {selectedLog ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                  {/* When */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--color-text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      When
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {formatDate(selectedLog.occurredAt, "long")}
                    </div>
                  </div>

                  {/* Entity */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--color-text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      Entity
                    </div>
                    <div style={{ fontSize: 14 }}>
                      <span style={{ fontWeight: 600 }}>
                        {selectedLog.entityType}
                      </span>{" "}
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        #{selectedLog.entityId}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  {selectedLog.summary && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "var(--color-text-muted)",
                          marginBottom: 4,
                        }}
                      >
                        Summary
                      </div>
                      <div style={{ fontSize: 14 }}>{selectedLog.summary}</div>
                    </div>
                  )}

                  {/* Actor */}
                  <div
                    style={{
                      background: "var(--color-bg)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {selectedLog.actor.displayName || "Unknown"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {selectedLog.actor.email ||
                          selectedLog.actor.clerkUserId ||
                          ""}
                      </div>
                      {selectedLog.actor.role && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--color-primary)",
                            fontWeight: 600,
                            marginTop: 2,
                          }}
                        >
                          {selectedLog.actor.role}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Field changes */}
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--color-text-muted)",
                        marginBottom: 10,
                      }}
                    >
                      Changed Fields{" "}
                      {selectedLog.fieldChanges.length > 0 && (
                        <span
                          style={{
                            background: "var(--color-border)",
                            borderRadius: 10,
                            padding: "1px 7px",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {selectedLog.fieldChanges.length}
                        </span>
                      )}
                    </div>
                    {selectedLog.fieldChanges.length === 0 ? (
                      <div
                        style={{
                          color: "var(--color-text-muted)",
                          fontSize: 13,
                        }}
                      >
                        No field diff captured
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {selectedLog.fieldChanges.map((change) => (
                          <div
                            key={`${selectedLog.id}-${change.field}`}
                            style={{
                              border: "1px solid var(--color-border)",
                              borderRadius: 8,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                padding: "6px 12px",
                                background: "var(--color-bg)",
                                borderBottom:
                                  "1px solid var(--color-border-light)",
                                fontSize: 12,
                                fontWeight: 700,
                                color: "var(--color-text)",
                              }}
                            >
                              {change.field}
                            </div>
                            <div
                              style={{
                                padding: "8px 12px",
                                display: "grid",
                                gap: 4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 12,
                                  display: "flex",
                                  gap: 6,
                                }}
                              >
                                <span
                                  style={{
                                    color: "var(--color-text-muted)",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    width: 36,
                                  }}
                                >
                                  Before
                                </span>
                                <span
                                  style={{
                                    color: "var(--color-danger)",
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {String(change.before ?? "—")}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  display: "flex",
                                  gap: 6,
                                }}
                              >
                                <span
                                  style={{
                                    color: "var(--color-text-muted)",
                                    fontWeight: 600,
                                    flexShrink: 0,
                                    width: 36,
                                  }}
                                >
                                  After
                                </span>
                                <span
                                  style={{
                                    color: "var(--color-success)",
                                    fontFamily: "monospace",
                                    wordBreak: "break-all",
                                  }}
                                >
                                  {String(change.after ?? "—")}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Request ID */}
                  {selectedLog.requestId && (
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "var(--color-text-muted)",
                          marginBottom: 4,
                        }}
                      >
                        Request ID
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: "var(--color-text-secondary)",
                          wordBreak: "break-all",
                        }}
                      >
                        {selectedLog.requestId}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <Shield
                    size={40}
                    style={{ marginBottom: 12, opacity: 0.3 }}
                  />
                  <p style={{ fontSize: 14 }}>Select an event to inspect it</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
