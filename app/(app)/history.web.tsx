import React from "react";
import { useRouter } from "expo-router";
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Search,
  Filter,
  FileEdit,
  Calculator,
  Lock,
  CheckCheck,
  XCircle,
} from "lucide-react";
import type { BalanceHistoryEntry } from "../../types";
import { useBalanceHistoryScreen } from "../../hooks/screens/useBalanceHistoryScreen";
import "../../styles/web.css";

// Helper to determine reconciliation status display
const getReconciliationStatus = (record: BalanceHistoryEntry) => {
  if (!record.isFinalized) {
    return record.reconciliationStatus === "CALCULATED"
      ? { label: "Calculated", color: "blue", icon: Calculator }
      : { label: "Draft", color: "gray", icon: FileEdit };
  }

  if (record.approvalStatus === "APPROVED") {
    return { label: "Approved", color: "green", icon: CheckCheck };
  }

  if (record.approvalStatus === "REJECTED") {
    return { label: "Rejected", color: "red", icon: XCircle };
  }

  return { label: "Awaiting Review", color: "yellow", icon: Lock };
};

/**
 * Web Balance History - Table view with filters
 */
export default function BalanceHistoryWeb() {
  const router = useRouter();
  const {
    isLoading,
    refreshing,
    history,
    filterShift,
    searchDate,
    totalRecords,
    passedCount,
    failedCount,
    flaggedCount,
    setFilterShift,
    setSearchDate,
    onRefresh,
    formatCurrency,
    formatDate,
  } = useBalanceHistoryScreen();

  if (isLoading && !refreshing) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner" />
          <p className="loading-text">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Reconciliation History</h1>
          <span className="header-date">{totalRecords} records</span>
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
        {/* Stats Cards */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-icon total">
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Records</span>
              <span className="stat-number">{totalRecords}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <CheckCircle size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Passed</span>
              <span className="stat-number success">{passedCount}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <AlertTriangle size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Failed</span>
              <span className="stat-number danger">{failedCount}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Flagged</span>
              <span className="stat-number warning">{flaggedCount}</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={filterShift}
              onChange={(e) =>
                setFilterShift(e.target.value as "ALL" | "AM" | "PM")
              }
              className="filter-select"
            >
              <option value="ALL">All Shifts</option>
              <option value="AM">AM Shift</option>
              <option value="PM">PM Shift</option>
            </select>
          </div>
          <div className="filter-group">
            <Search size={16} />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="filter-input"
              placeholder="Filter by date"
            />
          </div>
          <button onClick={() => router.push("/balance")} className="btn-add">
            <Plus size={16} />
            Add Record
          </button>
        </div>

        {/* History Table */}
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Type</th>
                <th>Float</th>
                <th>Cash</th>
                <th>Total</th>
                <th>Validation</th>
                <th>Workflow Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty">
                    <Clock size={40} />
                    <p>No history records found</p>
                  </td>
                </tr>
              ) : (
                history.map((record, index) => {
                  const statusInfo = getReconciliationStatus(record);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr
                      key={record.id || `history-${index}`}
                      onClick={() => {
                        router.push(
                          `/reconciliation?date=${record.date}&shift=${record.shift}&subtype=${record.subtype ?? "CLOSING"}`,
                        );
                      }}
                      style={{ cursor: "pointer" }}
                      className="hover:bg-gray-50"
                    >
                      <td className="font-medium">
                        {formatDate(record.date, "short")}
                      </td>
                      <td>
                        <span
                          className={`shift-badge ${
                            record.shift === "AM" ? "am" : "pm"
                          }`}
                        >
                          {record.shift}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            background:
                              record.subtype === "OPENING"
                                ? "#e0f2fe"
                                : "#fef3c7",
                            color:
                              record.subtype === "OPENING"
                                ? "#0369a1"
                                : "#92400e",
                          }}
                        >
                          {record.subtype === "OPENING" ? "Open" : "Close"}
                        </span>
                      </td>
                      <td>{formatCurrency(record.totalFloat)}</td>
                      <td>{formatCurrency(record.totalCash)}</td>
                      <td className="font-semibold">
                        {formatCurrency(record.totalFloat + record.totalCash)}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${record.status?.toLowerCase()}`}
                        >
                          {record.status === "PASSED" && (
                            <CheckCircle size={12} />
                          )}
                          {record.status === "FAILED" && (
                            <AlertTriangle size={12} />
                          )}
                          {record.status === "FLAGGED" && <Clock size={12} />}
                          {record.status === "PASSED"
                            ? "OK"
                            : record.status === "FAILED"
                              ? "Fail"
                              : "Flag"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${statusInfo.color}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <StatusIcon size={12} />
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
