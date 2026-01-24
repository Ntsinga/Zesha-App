import React from "react";
import {
  Banknote,
  Image as ImageIcon,
  X,
  RefreshCw,
  Plus,
  TrendingUp,
  Filter,
} from "lucide-react";
import { useCommissionsScreen } from "../../hooks/screens/useCommissionsScreen";
import type { ShiftEnum } from "../../types";
import "../../styles/web.css";

export default function CommissionsPage() {
  const {
    isLoading,
    refreshing,
    selectedImage,
    setSelectedImage,
    filterShift,
    setFilterShift,
    filteredCommissions,
    overallTotal,
    amTotal,
    pmTotal,
    onRefresh,
    getImageUri,
    handleBack,
    handleAddCommission,
    formatCurrency,
    formatDate,
  } = useCommissionsScreen();

  if (isLoading && filteredCommissions.length === 0) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading commissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <h1 className="header-title">Commissions</h1>
          <span className="header-date">Commission payment records</span>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={onRefresh}
            disabled={isLoading || refreshing}
          >
            <RefreshCw size={18} className={refreshing ? "spin" : ""} />
          </button>
          <button className="btn-primary" onClick={handleAddCommission}>
            <Plus size={16} />
            Add Commission
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="dashboard-content">
        {/* Summary Cards */}
        <div className="stats-row">
          <div className="stat-card primary">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Commissions</span>
              <span className="stat-value">{formatCurrency(overallTotal)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon am">
              <Banknote size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">AM Total</span>
              <span className="stat-value">{formatCurrency(amTotal)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon pm">
              <Banknote size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">PM Total</span>
              <span className="stat-value">{formatCurrency(pmTotal)}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Banknote size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Records</span>
              <span className="stat-value">{filteredCommissions.length}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={filterShift}
              onChange={(e) =>
                setFilterShift(e.target.value as ShiftEnum | "ALL")
              }
              className="filter-select"
            >
              <option value="ALL">All Shifts</option>
              <option value="AM">AM Shift</option>
              <option value="PM">PM Shift</option>
            </select>
          </div>
        </div>

        {/* Commissions Table */}
        {filteredCommissions.length === 0 ? (
          <div className="empty-state">
            <Banknote size={48} className="empty-icon" />
            <h3>No commission records yet</h3>
            <p>Add commissions from the Balance page</p>
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Shift</th>
                  <th>Source</th>
                  <th>Amount</th>
                  <th>Image</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.map((commission) => {
                  const imageUri = getImageUri(commission);

                  return (
                    <tr key={commission.id}>
                      <td>{formatDate(commission.date, "medium")}</td>
                      <td>
                        {commission.account?.name ||
                          `Account ${commission.accountId}`}
                      </td>
                      <td>
                        <span
                          className={`shift-badge ${commission.shift.toLowerCase()}`}
                        >
                          {commission.shift}
                        </span>
                      </td>
                      <td>{commission.source || "-"}</td>
                      <td className="amount-cell">
                        {formatCurrency(commission.amount)}
                      </td>
                      <td>
                        {imageUri ? (
                          <button
                            className="btn-icon-sm"
                            onClick={() => setSelectedImage(imageUri)}
                          >
                            <ImageIcon size={16} />
                          </button>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="image-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>
            <img src={selectedImage} alt="Commission receipt" />
          </div>
        </div>
      )}
    </div>
  );
}
