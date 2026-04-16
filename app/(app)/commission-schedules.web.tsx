import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  RefreshCw,
  X,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Copy,
  Trash2,
  Power,
  LayersIcon,
  DollarSign,
  Info,
  CheckCircle,
  Layers,
} from "lucide-react";
import { useCommissionSchedulesScreen } from "../../hooks/screens/useCommissionSchedulesScreen";
import type {
  CommissionRule,
  CommissionRuleTypeEnum,
  TransactionTypeEnum,
  TransactionSubtypeEnum,
} from "../../types";
import type { TierFormEntry } from "../../hooks/screens/useCommissionSchedulesScreen";
import "../../styles/web.css";

// ─── Label helpers ────────────────────────────────────────────────────────────

const TX_TYPE_LABELS: Record<TransactionTypeEnum, string> = {
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdraw",
  FLOAT_PURCHASE: "Float Purchase",
  CAPITAL_INJECTION: "Capital Injection",
};

const RULE_TYPE_LABELS: Record<CommissionRuleTypeEnum, string> = {
  PERCENTAGE: "Percentage",
  TIERED_FLAT: "Tiered Flat",
};

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatAmount(value: number | null | undefined): string {
  if (value == null) {
    return "-";
  }

  return amountFormatter.format(value);
}

// ─── Tier row (shared between add-rule and edit-tiers modals) ─────────────────

interface TierRowProps {
  tier: TierFormEntry;
  index: number;
  canRemove: boolean;
  onChange: (
    id: string,
    field: keyof Omit<TierFormEntry, "id">,
    value: string,
  ) => void;
  onRemove: (id: string) => void;
}

function TierRow({ tier, index, canRemove, onChange, onRemove }: TierRowProps) {
  return (
    <div
      style={{
        background: "var(--color-bg)",
        borderRadius: 8,
        padding: "12px 14px",
        marginBottom: 10,
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-text-secondary)",
          }}
        >
          Tier {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={() => onRemove(tier.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-danger)",
              display: "flex",
              alignItems: "center",
            }}
            type="button"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="form-row" style={{ gap: 8 }}>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11 }}>Min Amount</label>
          <input
            className="form-input"
            type="number"
            placeholder="0"
            min="0"
            step="0.01"
            value={tier.minAmount}
            onChange={(e) => onChange(tier.id, "minAmount", e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11 }}>Max Amount (blank = unlimited)</label>
          <input
            className="form-input"
            type="number"
            placeholder="Unlimited"
            min="0"
            step="0.01"
            value={tier.maxAmount}
            onChange={(e) => onChange(tier.id, "maxAmount", e.target.value)}
          />
        </div>
      </div>
      <div className="form-row" style={{ gap: 8 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>
            Customer Charge{" "}
            <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>
              (optional)
            </span>
          </label>
          <input
            className="form-input"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={tier.customerChargeAmount}
            onChange={(e) =>
              onChange(tier.id, "customerChargeAmount", e.target.value)
            }
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>Agent Commission</label>
          <input
            className="form-input"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={tier.agentCommissionAmount}
            onChange={(e) =>
              onChange(tier.id, "agentCommissionAmount", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
}

// ─── Rule group row (collapsed by transaction type, expands on click) ────────

interface RuleGroupRowProps {
  txType: TransactionTypeEnum;
  rules: CommissionRule[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeactivate: (id: number) => void;
  onEditTiers: (rule: CommissionRule) => void;
  isSubmitting: boolean;
}

function RuleGroupRow({
  txType,
  rules,
  isExpanded,
  onToggle,
  onDeactivate,
  onEditTiers,
  isSubmitting,
}: RuleGroupRowProps) {
  const activeCount = rules.filter((r) => r.isActive).length;
  const Icon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        overflow: "hidden",
        background: "white",
      }}
    >
      {/* ── Collapsed header row ── */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Icon
          size={16}
          style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-text)",
            }}
          >
            {TX_TYPE_LABELS[txType]}
          </span>
        </div>
        <span
          style={{
            fontSize: 12,
            color:
              activeCount > 0
                ? "var(--color-success)"
                : "var(--color-text-muted)",
            fontWeight: 500,
            flexShrink: 0,
          }}
        >
          {activeCount} active rule{activeCount !== 1 ? "s" : ""}
        </span>
        {rules.some((r) => r.ruleType === "PERCENTAGE" && r.isActive) && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: "#dbeafe",
              color: "#1d4ed8",
              padding: "2px 8px",
              borderRadius: 20,
              flexShrink: 0,
            }}
          >
            %
          </span>
        )}
        {rules.some((r) => r.ruleType === "TIERED_FLAT" && r.isActive) && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: "#ede9fe",
              color: "#7c3aed",
              padding: "2px 8px",
              borderRadius: 20,
              flexShrink: 0,
            }}
          >
            Tiered
          </span>
        )}
      </button>

      {/* ── Expanded detail panel ── */}
      {isExpanded && (
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {[
            ...rules.filter((r) => r.isActive),
            ...rules.filter((r) => !r.isActive),
          ].map((rule) => (
            <div
              key={rule.id}
              style={{
                background: rule.isActive ? "var(--color-bg)" : "#f9f9f9",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "12px 14px",
                opacity: rule.isActive ? 1 : 0.65,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      className={`status-badge ${rule.isActive ? "passed" : "failed"}`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        background:
                          rule.ruleType === "PERCENTAGE"
                            ? "#dbeafe"
                            : "#ede9fe",
                        color:
                          rule.ruleType === "PERCENTAGE"
                            ? "#1d4ed8"
                            : "#7c3aed",
                        padding: "2px 8px",
                        borderRadius: 20,
                      }}
                    >
                      {RULE_TYPE_LABELS[rule.ruleType]}
                    </span>
                    {rule.transactionSubtype && (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {rule.transactionSubtype.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                  {rule.ruleType === "PERCENTAGE" && rule.rate != null && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        marginTop: 4,
                      }}
                    >
                      Rate: <strong>{rule.rate}%</strong>
                      {rule.volumeCap != null && (
                        <span style={{ marginLeft: 10 }}>
                          Volume cap: {formatAmount(rule.volumeCap)}
                        </span>
                      )}
                      {rule.commissionCap != null && (
                        <span style={{ marginLeft: 10 }}>
                          Commission cap: {formatAmount(rule.commissionCap)}
                        </span>
                      )}
                    </div>
                  )}
                  {rule.ruleType === "TIERED_FLAT" && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                        marginTop: 4,
                      }}
                    >
                      {rule.tiers.length} tier
                      {rule.tiers.length !== 1 ? "s" : ""} defined
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {rule.ruleType === "TIERED_FLAT" && rule.isActive && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => onEditTiers(rule)}
                      disabled={isSubmitting}
                      title="Edit tiers"
                    >
                      <Layers size={13} />
                      Tiers
                    </button>
                  )}
                  {rule.isActive && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => onDeactivate(rule.id)}
                      disabled={isSubmitting}
                      title="Deactivate rule"
                      style={{
                        color: "var(--color-danger)",
                        borderColor: "var(--color-danger)",
                      }}
                    >
                      <Power size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Tier table */}
              {rule.ruleType === "TIERED_FLAT" && rule.tiers.length > 0 && (
                <div style={{ marginTop: 10, overflowX: "auto" }}>
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Min</th>
                        <th>Max</th>
                        <th>Customer Charge</th>
                        <th>Agent Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...rule.tiers]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((tier) => (
                          <tr key={tier.id}>
                            <td>{formatAmount(tier.minAmount)}</td>
                            <td>
                              {tier.maxAmount != null
                                ? formatAmount(tier.maxAmount)
                                : "∞"}
                            </td>
                            <td>
                              {tier.customerChargeAmount != null
                                ? formatAmount(tier.customerChargeAmount)
                                : "—"}
                            </td>
                            <td>{formatAmount(tier.agentCommissionAmount)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommissionSchedulesPage() {
  const screen = useCommissionSchedulesScreen();
  const [showGuidance, setShowGuidance] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Scroll to the inline error banner when it appears inside the Add Rule modal
  const addRuleErrorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (screen.addRuleError) {
      addRuleErrorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [screen.addRuleError]);

  // Track which transaction-type group is expanded in the rule list
  const [expandedRuleGroup, setExpandedRuleGroup] = useState<string | null>(
    null,
  );

  const toggleRuleGroup = (key: string) =>
    setExpandedRuleGroup((prev) => (prev === key ? null : key));

  const {
    schedules,
    templates,
    selectedSchedule,
    isLoading,
    isTemplatesLoading,
    isDetailLoading,
    isSubmitting,
    message,
    isSuperAdmin,
    activeTab,
    setActiveTab,
    selectSchedule,
    clearSelection,
    onRefresh,
    // create schedule
    isCreateScheduleOpen,
    openCreateSchedule,
    closeCreateSchedule,
    scheduleName,
    setScheduleName,
    scheduleDesc,
    setScheduleDesc,
    handleCreateSchedule,
    // create template
    isCreateTemplateOpen,
    openCreateTemplate,
    closeCreateTemplate,
    templateName,
    setTemplateName,
    templateDesc,
    setTemplateDesc,
    handleCreateTemplate,
    // add rule
    isAddRuleOpen,
    openAddRule,
    closeAddRule,
    addRuleError,
    ruleTransactionType,
    setRuleTransactionType,
    ruleTransactionSubtype,
    setRuleTransactionSubtype,
    ruleType,
    setRuleType,
    ruleRate,
    setRuleRate,
    ruleVolumeCap,
    setRuleVolumeCap,
    ruleCommissionCap,
    setRuleCommissionCap,
    ruleTiers,
    setRuleTiers,
    handleAddRule,
    // edit tiers
    isEditTiersOpen,
    ruleForTiers,
    openEditTiers,
    closeEditTiers,
    editTiers,
    setEditTiers,
    handleReplaceTiers,
    // copy confirm
    isCopyConfirmOpen,
    templateToCopy,
    promptCopyTemplate,
    closeCopyConfirm,
    handleCopyTemplate,
    // actions
    handleDeactivateRule,
    handleDeleteSchedule,
    // tier helpers
    addTierRow,
    removeTierRow,
    updateTierField,
  } = screen;

  const confirmAndDelete = async () => {
    if (deleteConfirmId == null) return;
    await handleDeleteSchedule(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="page-wrapper">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header-bar">
        <div className="header-left">
          {selectedSchedule ? (
            <button className="btn-back" onClick={clearSelection}>
              <ArrowLeft size={18} />
            </button>
          ) : null}
          <div>
            <h1 className="header-title">Commission Structures</h1>
            <span className="header-date">
              {selectedSchedule
                ? selectedSchedule.name
                : "Manage pricing rules for transactions"}
            </span>
          </div>
        </div>
        <div className="header-right">
          {activeTab === "my-schedules" && !selectedSchedule && (
            <button className="btn-primary" onClick={openCreateSchedule}>
              <Plus size={16} />
              New Structure
            </button>
          )}
          {activeTab === "my-schedules" && selectedSchedule && (
            <button
              className="btn-primary"
              onClick={() => openAddRule(selectedSchedule.id)}
            >
              <Plus size={16} />
              Add Rule
            </button>
          )}
          {activeTab === "templates" && isSuperAdmin && (
            <button className="btn-primary" onClick={openCreateTemplate}>
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
            className={`alert ${message.type === "success" ? "alert-success" : "alert-error"}`}
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

        {/* Guidance banner */}
        {showGuidance && (
          <div
            style={{
              background: "#dbeafe",
              border: "1px solid #93c5fd",
              borderRadius: 10,
              padding: "14px 18px",
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <Info
              size={18}
              style={{ color: "#2563eb", flexShrink: 0, marginTop: 2 }}
            />
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: 14,
                  color: "#1e40af",
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                What are Commission Structures?
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "#1e40af",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                A <strong>Commission Structure</strong> is a named collection of
                rules that define how commissions are calculated for
                transactions on your accounts. Each structure contains one or
                more <strong>Rules</strong> — one per transaction type (e.g.
                Deposit, Withdraw). Rules can be{" "}
                <strong>Percentage-based</strong> (a flat % of the transaction
                amount) or <strong>Tiered Flat</strong> (different fixed fees
                depending on the transaction amount). Attach a structure to an
                account to automatically calculate commissions.{" "}
                <strong>Templates</strong> are pre-built structures created by
                system administrators that you can copy as a starting point.
              </p>
            </div>
            <button
              onClick={() => setShowGuidance(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#2563eb",
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tab toggle */}
        {!selectedSchedule && (
          <div className="shift-toggle" style={{ width: "fit-content" }}>
            <button
              className={`shift-btn ${activeTab === "my-schedules" ? "active" : ""}`}
              onClick={() => setActiveTab("my-schedules")}
            >
              My Structures
            </button>
            <button
              className={`shift-btn ${activeTab === "templates" ? "active" : ""}`}
              onClick={() => setActiveTab("templates")}
            >
              System Templates
            </button>
          </div>
        )}

        {/* ── My Schedules tab ─────────────────────────────────────────────── */}
        {(activeTab === "my-schedules" || selectedSchedule) && (
          <>
            {/* Detail view */}
            {selectedSchedule ? (
              <div>
                {/* Schedule header card */}
                <div
                  className="card"
                  style={{ marginBottom: 20, padding: "18px 20px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          margin: "0 0 4px",
                        }}
                      >
                        {selectedSchedule.name}
                      </h2>
                      {selectedSchedule.description && (
                        <p
                          style={{
                            fontSize: 14,
                            color: "var(--color-text-secondary)",
                            margin: 0,
                          }}
                        >
                          {selectedSchedule.description}
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          className={`status-badge ${selectedSchedule.isActive ? "passed" : "failed"}`}
                        >
                          {selectedSchedule.isActive ? "Active" : "Inactive"}
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-muted)",
                          }}
                        >
                          {
                            selectedSchedule.rules.filter((r) => r.isActive)
                              .length
                          }{" "}
                          active rule
                          {selectedSchedule.rules.filter((r) => r.isActive)
                            .length !== 1
                            ? "s"
                            : ""}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-secondary btn-sm"
                      style={{
                        color: "var(--color-danger)",
                        borderColor: "var(--color-danger)",
                      }}
                      onClick={() => setDeleteConfirmId(selectedSchedule.id)}
                      disabled={isSubmitting}
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Rules section */}
                {isDetailLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 48,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <div
                      className="spinner"
                      style={{ margin: "0 auto 12px" }}
                    />
                    Loading rules…
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 14,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          margin: 0,
                          color: "var(--color-text)",
                        }}
                      >
                        Commission Rules
                      </h3>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => openAddRule(selectedSchedule.id)}
                        disabled={isSubmitting}
                      >
                        <Plus size={13} />
                        Add Rule
                      </button>
                    </div>

                    {selectedSchedule.rules.length === 0 ? (
                      <div className="empty-state">
                        <DollarSign
                          size={40}
                          className="empty-icon"
                          style={{ display: "block", margin: "0 auto 12px" }}
                        />
                        <h3
                          style={{
                            fontSize: 16,
                            marginBottom: 6,
                            color: "var(--color-text)",
                          }}
                        >
                          No rules yet
                        </h3>
                        <p style={{ fontSize: 13, margin: "0 0 16px" }}>
                          Add a rule to define how commissions are calculated
                          for transactions.
                        </p>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => openAddRule(selectedSchedule.id)}
                        >
                          <Plus size={13} />
                          Add First Rule
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {/* Group rules by transaction type, preserving display order */}
                        {(
                          [
                            "DEPOSIT",
                            "WITHDRAW",
                            "FLOAT_PURCHASE",
                            "CAPITAL_INJECTION",
                          ] as TransactionTypeEnum[]
                        ).map((txType) => {
                          const group = selectedSchedule.rules.filter(
                            (r) => r.transactionType === txType,
                          );
                          if (group.length === 0) return null;
                          const groupKey = txType;
                          return (
                            <RuleGroupRow
                              key={groupKey}
                              txType={txType}
                              rules={group}
                              isExpanded={expandedRuleGroup === groupKey}
                              onToggle={() => toggleRuleGroup(groupKey)}
                              onDeactivate={handleDeactivateRule}
                              onEditTiers={openEditTiers}
                              isSubmitting={isSubmitting}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Schedule list */
              <>
                {isLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 48,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <div
                      className="spinner"
                      style={{ margin: "0 auto 12px" }}
                    />
                    Loading structures…
                  </div>
                ) : schedules.length === 0 ? (
                  <div className="empty-state">
                    <LayersIcon
                      size={48}
                      style={{
                        display: "block",
                        margin: "0 auto 16px",
                        color: "var(--color-border)",
                      }}
                    />
                    <h3
                      style={{
                        fontSize: 18,
                        marginBottom: 8,
                        color: "var(--color-text)",
                      }}
                    >
                      No commission structures yet
                    </h3>
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--color-text-secondary)",
                        marginBottom: 20,
                        maxWidth: 380,
                        margin: "0 auto 20px",
                      }}
                    >
                      Create a structure to define commission rules for your
                      accounts, or copy one from the System Templates tab.
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        className="btn-primary"
                        onClick={openCreateSchedule}
                      >
                        <Plus size={16} />
                        Create Structure
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => setActiveTab("templates")}
                      >
                        <Copy size={16} />
                        Browse Templates
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(300px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {schedules.map((schedule) => (
                      <button
                        key={schedule.id}
                        onClick={() => selectSchedule(schedule.id)}
                        style={{
                          textAlign: "left",
                          background: "white",
                          border: "1px solid var(--color-border)",
                          borderRadius: 12,
                          padding: "18px 20px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "var(--color-primary)";
                          (e.currentTarget as HTMLElement).style.boxShadow =
                            "var(--shadow-primary)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor =
                            "var(--color-border)";
                          (e.currentTarget as HTMLElement).style.boxShadow =
                            "none";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: "var(--color-text)",
                            }}
                          >
                            {schedule.name}
                          </span>
                          <ChevronRight
                            size={16}
                            style={{ color: "var(--color-text-muted)" }}
                          />
                        </div>
                        {schedule.description && (
                          <p
                            style={{
                              fontSize: 13,
                              color: "var(--color-text-secondary)",
                              margin: 0,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {schedule.description}
                          </p>
                        )}
                        <span
                          className={`status-badge ${schedule.isActive ? "passed" : "failed"}`}
                          style={{ width: "fit-content" }}
                        >
                          {schedule.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Templates tab ─────────────────────────────────────────────────── */}
        {activeTab === "templates" && !selectedSchedule && (
          <>
            <div
              style={{
                background: "var(--color-warning-light)",
                border: "1px solid #fcd34d",
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 13,
                color: "#92400e",
              }}
            >
              <strong>System Templates</strong> are pre-built commission
              structures created by administrators. They are read-only — you can
              copy any template to your own structures and customise it from
              there.
            </div>

            {isTemplatesLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: 48,
                  color: "var(--color-text-muted)",
                }}
              >
                <div className="spinner" style={{ margin: "0 auto 12px" }} />
                Loading templates…
              </div>
            ) : templates.length === 0 ? (
              <div className="empty-state">
                <Layers
                  size={48}
                  style={{
                    display: "block",
                    margin: "0 auto 16px",
                    color: "var(--color-border)",
                  }}
                />
                <h3
                  style={{
                    fontSize: 18,
                    marginBottom: 8,
                    color: "var(--color-text)",
                  }}
                >
                  No templates available
                </h3>
                {isSuperAdmin ? (
                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        color: "var(--color-text-secondary)",
                        marginBottom: 20,
                      }}
                    >
                      Create the first template to provide companies with a
                      starting point.
                    </p>
                    <button
                      className="btn-primary"
                      onClick={openCreateTemplate}
                    >
                      <Plus size={16} />
                      Create Template
                    </button>
                  </div>
                ) : (
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Check back later — an administrator will add templates here.
                  </p>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {templates.map((template) => (
                  <div
                    key={template.id}
                    style={{
                      background: "white",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: "var(--color-text)",
                          }}
                        >
                          {template.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            background: "var(--color-gold-light)",
                            color: "var(--color-gold-dark)",
                            padding: "2px 7px",
                            borderRadius: 20,
                          }}
                        >
                          TEMPLATE
                        </span>
                      </div>
                      {template.description && (
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-secondary)",
                            margin: 0,
                          }}
                        >
                          {template.description}
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {template.rules.filter((r) => r.isActive).length} active
                      rule
                      {template.rules.filter((r) => r.isActive).length !== 1
                        ? "s"
                        : ""}
                    </div>

                    {/* Rule summary */}
                    {template.rules.filter((r) => r.isActive).length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                        }}
                      >
                        {template.rules
                          .filter((r) => r.isActive)
                          .map((r) => (
                            <span
                              key={r.id}
                              style={{
                                fontSize: 11,
                                fontWeight: 500,
                                background: "var(--color-bg)",
                                border: "1px solid var(--color-border)",
                                padding: "3px 8px",
                                borderRadius: 6,
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {TX_TYPE_LABELS[r.transactionType]} ·{" "}
                              {RULE_TYPE_LABELS[r.ruleType]}
                            </span>
                          ))}
                      </div>
                    )}

                    <button
                      className="btn-primary btn-sm"
                      onClick={() => promptCopyTemplate(template)}
                      disabled={isSubmitting}
                      style={{ marginTop: 4 }}
                    >
                      <Copy size={13} />
                      Copy to My Structures
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* Create Schedule modal */}
      {isCreateScheduleOpen && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={closeCreateSchedule}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Commission Structure</h2>
              <button className="modal-close" onClick={closeCreateSchedule}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-form">
              <div
                style={{
                  background: "var(--color-bg)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                }}
              >
                Give your structure a descriptive name (e.g. "Standard Mobile
                Money Rates"). You can add commission rules to it after
                creation.
              </div>
              <div className="form-group">
                <label>Structure Name *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Standard Mobile Money Rates"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Brief description of when to use this structure…"
                  value={scheduleDesc}
                  onChange={(e) => setScheduleDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={closeCreateSchedule}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateSchedule}
                disabled={isSubmitting || !scheduleName.trim()}
              >
                {isSubmitting ? "Creating…" : "Create Structure"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template modal (Super Admin) */}
      {isCreateTemplateOpen && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={closeCreateTemplate}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New System Template</h2>
              <button className="modal-close" onClick={closeCreateTemplate}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-form">
              <div
                style={{
                  background: "var(--color-warning-light)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "#92400e",
                }}
              >
                Templates are system-wide and visible to all companies.
                Companies can copy a template to create their own structure.
              </div>
              <div className="form-group">
                <label>Template Name *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Telecom Standard Rates"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  className="form-textarea"
                  placeholder="Describe what this template is for…"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={closeCreateTemplate}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreateTemplate}
                disabled={isSubmitting || !templateName.trim()}
              >
                {isSubmitting ? "Creating…" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rule modal */}
      {isAddRuleOpen && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={closeAddRule}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Add Commission Rule</h2>
              <button className="modal-close" onClick={closeAddRule}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-form">
              {/* Inline error shown inside the modal so it's never hidden behind the overlay */}
              {addRuleError && (
                <div
                  ref={addRuleErrorRef}
                  style={{
                    background: "var(--color-danger-light)",
                    color: "var(--color-danger)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    fontSize: 13,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <X size={14} />
                  {addRuleError}
                </div>
              )}
              {/* Guidance */}
              <div
                style={{
                  background: "var(--color-bg)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  marginBottom: 20,
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                Each rule covers one <strong>transaction type</strong>. Choose{" "}
                <strong>Percentage</strong> to charge a % of the transaction
                amount, or <strong>Tiered Flat</strong> to define fixed amounts
                per amount range.
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Transaction Type *</label>
                  <select
                    className="form-select"
                    value={ruleTransactionType}
                    onChange={(e) =>
                      setRuleTransactionType(
                        e.target.value as TransactionTypeEnum,
                      )
                    }
                  >
                    <option value="DEPOSIT">Deposit</option>
                    <option value="WITHDRAW">Withdraw</option>
                    <option value="FLOAT_PURCHASE">Float Purchase</option>
                    <option value="CAPITAL_INJECTION">Capital Injection</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Subtype (optional)</label>
                  <select
                    className="form-select"
                    value={ruleTransactionSubtype ?? ""}
                    onChange={(e) =>
                      setRuleTransactionSubtype(
                        (e.target.value as TransactionSubtypeEnum) || null,
                      )
                    }
                  >
                    <option value="">None</option>
                    <option value="AGENT_TO_AGENT">Agent to Agent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Rule Type *</label>
                <div className="shift-toggle" style={{ width: "fit-content" }}>
                  <button
                    type="button"
                    className={`shift-btn ${ruleType === "PERCENTAGE" ? "active" : ""}`}
                    onClick={() => setRuleType("PERCENTAGE")}
                  >
                    Percentage
                  </button>
                  <button
                    type="button"
                    className={`shift-btn ${ruleType === "TIERED_FLAT" ? "active" : ""}`}
                    onClick={() => setRuleType("TIERED_FLAT")}
                  >
                    Tiered Flat
                  </button>
                </div>
              </div>

              {/* PERCENTAGE fields */}
              {ruleType === "PERCENTAGE" && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Rate (%) *</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="e.g. 1.5"
                        min="0"
                        step="0.01"
                        value={ruleRate}
                        onChange={(e) => setRuleRate(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Volume Cap (optional)</label>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="Max transaction amount"
                        min="0"
                        step="0.01"
                        value={ruleVolumeCap}
                        onChange={(e) => setRuleVolumeCap(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Commission Cap (optional)</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="Max commission amount"
                      min="0"
                      step="0.01"
                      value={ruleCommissionCap}
                      onChange={(e) => setRuleCommissionCap(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* TIERED_FLAT fields */}
              {ruleType === "TIERED_FLAT" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <label
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--color-text)",
                      }}
                    >
                      Tiers *
                    </label>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => addTierRow(setRuleTiers)}
                    >
                      <Plus size={12} />
                      Add Tier
                    </button>
                  </div>
                  {ruleTiers.map((tier, i) => (
                    <TierRow
                      key={tier.id}
                      tier={tier}
                      index={i}
                      canRemove={ruleTiers.length > 1}
                      onChange={(id, field, value) =>
                        updateTierField(setRuleTiers, id, field, value)
                      }
                      onRemove={(id) => removeTierRow(setRuleTiers, id)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={closeAddRule}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAddRule}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Add Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tiers modal */}
      {isEditTiersOpen && ruleForTiers && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={closeEditTiers}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Edit Tiers</h2>
              <button className="modal-close" onClick={closeEditTiers}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-form">
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                  marginBottom: 16,
                  lineHeight: 1.6,
                }}
              >
                Updating tiers will <strong>replace all existing tiers</strong>{" "}
                for this rule. The tiers are sorted in order from lowest to
                highest transaction amount.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 10,
                }}
              >
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => addTierRow(setEditTiers)}
                >
                  <Plus size={12} />
                  Add Tier
                </button>
              </div>
              {editTiers.map((tier, i) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  index={i}
                  canRemove={editTiers.length > 1}
                  onChange={(id, field, value) =>
                    updateTierField(setEditTiers, id, field, value)
                  }
                  onRemove={(id) => removeTierRow(setEditTiers, id)}
                />
              ))}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={closeEditTiers}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleReplaceTiers}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save Tiers"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Template confirm modal */}
      {isCopyConfirmOpen && templateToCopy && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={closeCopyConfirm}
        >
          <div
            className="modal-content modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Copy Template</h2>
              <button className="modal-close" onClick={closeCopyConfirm}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>
                Copy <strong>"{templateToCopy.name}"</strong> to your
                structures?
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-text-secondary)",
                }}
              >
                This will create an independent copy — you can edit it without
                affecting the original template or other companies.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={closeCopyConfirm}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCopyTemplate}
                disabled={isSubmitting}
              >
                <Copy size={14} />
                {isSubmitting ? "Copying…" : "Copy to My Structures"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Schedule confirm modal */}
      {deleteConfirmId != null && (
        <div
          className="modal-overlay"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete Structure</h2>
              <button
                className="modal-close"
                onClick={() => setDeleteConfirmId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this structure? All its rules and
                tiers will also be removed.
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--color-danger)",
                  marginTop: 8,
                }}
              >
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={confirmAndDelete}
                disabled={isSubmitting}
              >
                <Trash2 size={14} />
                {isSubmitting ? "Deleting…" : "Delete Structure"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
