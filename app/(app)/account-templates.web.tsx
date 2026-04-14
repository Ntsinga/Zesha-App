import React from "react";
import { Plus, RefreshCw, X, LayoutTemplate, CheckCircle } from "lucide-react";
import { useAccountTemplatesScreen } from "../../hooks/screens/useAccountTemplatesScreen";
import { useAppSelector } from "../../store/hooks";
import { selectViewingAgencyId } from "../../store/slices/authSlice";
import type { AccountTypeEnum, CommissionModelEnum } from "../../types";
import "../../styles/web.css";

// ─── Label helpers ─────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABELS: Record<AccountTypeEnum, string> = {
  BANK: "Bank",
  TELECOM: "Telecom",
};

const COMMISSION_MODEL_LABELS: Record<CommissionModelEnum, string> = {
  EXPECTED_ONLY: "Expected Only",
  CUMULATIVE: "Cumulative",
  PARTIAL: "Partial",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AccountTemplatesPage() {
  const viewingAgencyId = useAppSelector(selectViewingAgencyId);

  const {
    // data
    templates,
    isTemplatesLoading,
    scheduleTemplates,
    isSchedulesLoading,

    // messages
    message,

    // modal
    isModalOpen,
    openModal,
    closeModal,
    isSubmitting,

    // form
    formName,
    setFormName,
    formAccountType,
    setFormAccountType,
    formDescription,
    setFormDescription,
    formCommissionModel,
    setFormCommissionModel,
    formScheduleId,
    setFormScheduleId,

    // actions
    handleSubmit,
    refresh,
  } = useAccountTemplatesScreen();

  return (
    <div className="page-wrapper">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header-bar">
        <div className="header-left">
          <div>
            <h1 className="header-title">Account Templates</h1>
            <span className="header-date">
              System-wide account blueprints for agencies to inherit
            </span>
          </div>
        </div>
        <div className="header-right">
          <button
            className="btn-refresh"
            onClick={refresh}
            disabled={isTemplatesLoading}
          >
            <RefreshCw size={18} className={isTemplatesLoading ? "spin" : ""} />
          </button>
          {!viewingAgencyId && (
            <button className="btn-primary" onClick={openModal}>
              <Plus size={16} />
              New Template
            </button>
          )}
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="dashboard-content">
        {/* Message banner */}
        {message && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              fontSize: 14,
              background:
                message.type === "success"
                  ? "var(--color-success-light)"
                  : "var(--color-danger-light)",
              color:
                message.type === "success"
                  ? "var(--color-success)"
                  : "var(--color-danger)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {message.type === "success" ? (
              <CheckCircle size={16} />
            ) : (
              <X size={16} />
            )}
            {message.text}
          </div>
        )}

        {/* Templates table */}
        {isTemplatesLoading ? (
          <div className="loading-container">
            <RefreshCw size={24} className="spin" />
            <span>Loading templates…</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="empty-state">
            <LayoutTemplate
              size={40}
              style={{ opacity: 0.3, marginBottom: 12 }}
            />
            <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>
              No account templates yet. Create one to allow agencies to inherit
              pre-configured accounts.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Commission Model</th>
                  <th>Linked Schedule</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.name}</td>
                    <td>
                      <span className="badge badge-info">
                        {ACCOUNT_TYPE_LABELS[t.accountType]}
                      </span>
                    </td>
                    <td>
                      {t.commissionModel ? (
                        (COMMISSION_MODEL_LABELS[t.commissionModel] ??
                        t.commissionModel)
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      {t.commissionSchedule ? (
                        <span style={{ fontSize: 13 }}>
                          {t.commissionSchedule.name}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>
                          None
                        </span>
                      )}
                    </td>
                    <td
                      style={{ color: "var(--color-text-muted)", fontSize: 13 }}
                    >
                      {t.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Template Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={closeModal}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Account Template</h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Name */}
              <div className="form-group">
                <label className="form-label">Template Name *</label>
                <input
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard Bank Account"
                />
              </div>

              {/* Account Type */}
              <div className="form-group">
                <label className="form-label">Account Type *</label>
                <select
                  className="form-input"
                  value={formAccountType}
                  onChange={(e) =>
                    setFormAccountType(e.target.value as AccountTypeEnum)
                  }
                >
                  <option value="BANK">Bank</option>
                  <option value="TELECOM">Telecom</option>
                </select>
              </div>

              {/* Commission Model */}
              <div className="form-group">
                <label className="form-label">Commission Model</label>
                <select
                  className="form-input"
                  value={formCommissionModel}
                  onChange={(e) =>
                    setFormCommissionModel(
                      e.target.value as CommissionModelEnum,
                    )
                  }
                >
                  <option value="EXPECTED_ONLY">Expected Only</option>
                  <option value="CUMULATIVE">Cumulative</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </div>

              {/* Commission Structure */}
              <div className="form-group">
                <label className="form-label">Commission Structure</label>
                <select
                  className="form-input"
                  value={formScheduleId ?? ""}
                  onChange={(e) =>
                    setFormScheduleId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={isSchedulesLoading}
                >
                  <option value="">None</option>
                  {scheduleTemplates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {isSchedulesLoading && (
                  <span
                    style={{ fontSize: 12, color: "var(--color-text-muted)" }}
                  >
                    Loading schedules…
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description for this template"
                />
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
                onClick={handleSubmit}
                disabled={isSubmitting || !formName.trim()}
              >
                <Plus size={14} />
                {isSubmitting ? "Creating…" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
