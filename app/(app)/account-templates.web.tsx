import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  RefreshCw,
  X,
  LayoutTemplate,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Layers,
  Power,
  Building2,
  Smartphone,
  DollarSign,
} from "lucide-react";
import { useAccountTemplatesScreen } from "../../hooks/screens/useAccountTemplatesScreen";
import {
  useAccountDetailScreen,
  type TierFormEntry,
} from "../../hooks/screens/useAccountDetailScreen";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import { ACCOUNT_TYPES } from "../../hooks/screens/useAccountsScreen";
import { formatAmountInput, parseAmountInput } from "../../utils/formatters";
import { useAppSelector } from "../../store/hooks";
import { selectViewingAgencyId } from "../../store/slices/authSlice";
import type {
  Account,
  AccountTypeEnum,
  CommissionModelEnum,
  CommissionRule,
  CommissionRuleTypeEnum,
  TransactionTypeEnum,
} from "../../types";
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
  if (value == null) return "-";
  return amountFormatter.format(value);
}

// ─── TierRow (for template rule management modals) ───────────────────────────

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
            type="button"
            onClick={() => onRemove(tier.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-danger)",
              display: "flex",
              alignItems: "center",
            }}
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
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={formatAmountInput(tier.minAmount)}
            onChange={(e) => {
              const c = parseAmountInput(e.target.value);
              if (c !== null) onChange(tier.id, "minAmount", c);
            }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11 }}>Max Amount (blank = unlimited)</label>
          <input
            className="form-input"
            type="text"
            inputMode="decimal"
            placeholder="Unlimited"
            value={formatAmountInput(tier.maxAmount)}
            onChange={(e) => {
              const c = parseAmountInput(e.target.value);
              if (c !== null) onChange(tier.id, "maxAmount", c);
            }}
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
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatAmountInput(tier.customerChargeAmount)}
            onChange={(e) => {
              const c = parseAmountInput(e.target.value);
              if (c !== null) onChange(tier.id, "customerChargeAmount", c);
            }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: 11 }}>Agent Commission</label>
          <input
            className="form-input"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={formatAmountInput(tier.agentCommissionAmount)}
            onChange={(e) => {
              const c = parseAmountInput(e.target.value);
              if (c !== null) onChange(tier.id, "agentCommissionAmount", c);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Read-only RuleGroupRow ────────────────────────────────────────────────────

interface RuleGroupRowProps {
  txType: TransactionTypeEnum;
  rules: CommissionRule[];
  isExpanded: boolean;
  onToggle: () => void;
  onDeactivate: (id: number) => void;
  onEditTiers: (rule: CommissionRule) => void;
  isSubmitting: boolean;
  isAdmin: boolean;
}

function RuleGroupRow({
  txType,
  rules,
  isExpanded,
  onToggle,
  onDeactivate,
  onEditTiers,
  isSubmitting,
  isAdmin,
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
                {isAdmin && (
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
                        style={{
                          color: "var(--color-danger)",
                          borderColor: "var(--color-danger)",
                        }}
                      >
                        <Power size={13} />
                      </button>
                    )}
                  </div>
                )}
              </div>
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

// ─── TemplateDetailView ────────────────────────────────────────────────────────

function TemplateDetailView({
  templateId,
  onBack,
}: {
  templateId: number;
  onBack: () => void;
}) {
  const d = useAccountDetailScreen(templateId, true);
  const [expandedTxTypes, setExpandedTxTypes] = useState<
    Record<string, boolean>
  >({});
  const addRuleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (d.isAddRuleOpen && addRuleRef.current) {
      setTimeout(
        () =>
          addRuleRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        50,
      );
    }
  }, [d.isAddRuleOpen]);

  const onAssignSchedule = async (val: string) => {
    await d.handleAssignSchedule(val ? Number(val) : null);
  };

  const onSaveAccount = async () => {
    const result = await d.handleSaveAccount();
    if (!result.success) {
      // error surfaced via d.accountError
    }
  };

  const rulesByTxType =
    d.schedule?.rules.reduce(
      (acc, rule) => {
        if (!acc[rule.transactionType]) acc[rule.transactionType] = [];
        acc[rule.transactionType].push(rule);
        return acc;
      },
      {} as Record<string, CommissionRule[]>,
    ) ?? {};

  const toggleTxType = (txType: string) =>
    setExpandedTxTypes((prev) => ({ ...prev, [txType]: !prev[txType] }));

  if (d.isAccountLoading && !d.account) {
    return (
      <div className="page-wrapper">
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <RefreshCw size={24} className="spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <header className="header-bar">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="header-title">
              {d.account?.name ?? "Template Detail"}
            </h1>
            <span className="header-date">
              Account template &amp; commission structure
            </span>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {d.message && (
          <div
            className={`alert ${d.message.type === "success" ? "alert-success" : "alert-error"}`}
          >
            {d.message.text}
          </div>
        )}

        {/* ── Template Info Card ── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Template Information
            </h3>
            {d.account && (
              <span
                className={`category-badge ${d.account.accountType.toLowerCase()}`}
              >
                {d.account.accountType}
              </span>
            )}
          </div>
          <div style={{ padding: "16px 20px" }}>
            {d.isAdmin ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Template Name *</label>
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => d.setName(e.target.value)}
                      className="form-input"
                      placeholder="Template name"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Account Type</label>
                    <select
                      className="form-input"
                      value={d.accountType}
                      onChange={(e) =>
                        d.setAccountType(e.target.value as AccountTypeEnum)
                      }
                    >
                      {ACCOUNT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {d.accountType === "TELECOM" && (
                  <div
                    className="form-group"
                    style={{
                      marginBottom: 0,
                      maxWidth: "50%",
                      paddingRight: 8,
                    }}
                  >
                    <label className="form-label">Commission Model</label>
                    <select
                      className="form-input"
                      value={d.commissionModel}
                      onChange={(e) =>
                        d.setCommissionModel(
                          e.target.value as CommissionModelEnum,
                        )
                      }
                    >
                      <option value="EXPECTED_ONLY">Expected Only</option>
                      <option value="CUMULATIVE">Cumulative</option>
                      <option value="PARTIAL">Partial</option>
                    </select>
                  </div>
                )}
                {d.accountError && (
                  <div className="alert alert-error">{d.accountError}</div>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn-primary"
                    onClick={onSaveAccount}
                    disabled={d.isSavingAccount}
                  >
                    {d.isSavingAccount ? (
                      <RefreshCw size={16} className="spin" />
                    ) : null}
                    {d.isSavingAccount ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Name
                  </div>
                  <div style={{ fontWeight: 600 }}>{d.account?.name}</div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      marginBottom: 4,
                    }}
                  >
                    Commission Model
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {d.account?.commissionModel ?? "—"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Commission Structure ── */}
        <div className="card">
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                Commission Structure
              </h3>
              {d.schedule && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-secondary)",
                    marginTop: 2,
                  }}
                >
                  {d.schedule.name}
                </div>
              )}
            </div>
            {d.isAdmin && d.schedule && (
              <button
                className={d.isAddRuleOpen ? "btn-secondary" : "btn-primary"}
                onClick={d.isAddRuleOpen ? d.closeAddRule : d.openAddRule}
                disabled={d.isSubmitting}
              >
                {d.isAddRuleOpen ? <X size={15} /> : <Plus size={15} />}
                {d.isAddRuleOpen ? "Cancel" : "Add Rule"}
              </button>
            )}
          </div>

          <div style={{ padding: "16px 20px" }}>
            {d.isScheduleLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: 32,
                }}
              >
                <RefreshCw size={20} className="spin" />
              </div>
            ) : !d.schedule ? (
              d.isAdmin ? (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-secondary)",
                      margin: 0,
                    }}
                  >
                    No commission structure assigned to this template.
                  </p>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <button
                      className="btn-primary"
                      onClick={d.openCreateSchedule}
                    >
                      <Plus size={15} />
                      Create Structure
                    </button>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        or assign existing:
                      </span>
                      <select
                        className="form-input"
                        style={{ minWidth: 200 }}
                        value=""
                        onChange={(e) => onAssignSchedule(e.target.value)}
                        disabled={d.isSchedulesLoading}
                      >
                        <option value="">Select a structure…</option>
                        {d.allSchedules
                          .filter((s) => s.isActive)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-muted)",
                    margin: 0,
                  }}
                >
                  No commission structure has been set up yet.
                </p>
              )
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {Object.keys(TX_TYPE_LABELS).map((txType) => {
                  const rules =
                    rulesByTxType[txType as TransactionTypeEnum] ?? [];
                  if (rules.length === 0) return null;
                  return (
                    <RuleGroupRow
                      key={txType}
                      txType={txType as TransactionTypeEnum}
                      rules={rules}
                      isExpanded={!!expandedTxTypes[txType]}
                      onToggle={() => toggleTxType(txType)}
                      onDeactivate={d.handleDeactivateRule}
                      onEditTiers={d.openEditTiers}
                      isSubmitting={d.isSubmitting}
                      isAdmin={d.isAdmin}
                    />
                  );
                })}
                {Object.keys(rulesByTxType).length === 0 && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-muted)",
                      margin: 0,
                    }}
                  >
                    No rules defined yet.
                    {d.isAdmin
                      ? ' Click "Add Rule" above to create the first one.'
                      : ""}
                  </p>
                )}
                {d.isAdmin && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{ fontSize: 12, color: "var(--color-text-muted)" }}
                    >
                      Reassign:
                    </span>
                    <select
                      className="form-input"
                      style={{ minWidth: 200, fontSize: 12 }}
                      value={d.account?.commissionScheduleId ?? ""}
                      onChange={(e) => onAssignSchedule(e.target.value)}
                      disabled={d.isSchedulesLoading}
                    >
                      <option value="">Remove structure</option>
                      {d.allSchedules
                        .filter((s) => s.isActive)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                {d.isAdmin && d.isAddRuleOpen && (
                  <div
                    ref={addRuleRef}
                    style={{
                      marginTop: 8,
                      borderTop: "1px solid var(--color-border)",
                      paddingTop: 16,
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 14px",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      New Rule
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div className="form-group">
                        <label className="form-label">Transaction Type</label>
                        <select
                          className="form-input"
                          value={d.ruleTransactionType}
                          onChange={(e) =>
                            d.setRuleTransactionType(
                              e.target.value as TransactionTypeEnum,
                            )
                          }
                        >
                          {Object.entries(TX_TYPE_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Rule Type</label>
                        <div className="type-buttons">
                          {(
                            [
                              "PERCENTAGE",
                              "TIERED_FLAT",
                            ] as CommissionRuleTypeEnum[]
                          ).map((rt) => (
                            <button
                              key={rt}
                              className={`type-button ${d.ruleType === rt ? "selected" : ""}`}
                              onClick={() => d.setRuleType(rt)}
                            >
                              {rt === "PERCENTAGE" ? (
                                <DollarSign size={14} />
                              ) : (
                                <Layers size={14} />
                              )}
                              {RULE_TYPE_LABELS[rt]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {d.ruleType === "PERCENTAGE" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 12,
                        }}
                      >
                        <div className="form-group">
                          <label className="form-label">Rate (%)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={d.ruleRate}
                            onChange={(e) => d.setRuleRate(e.target.value)}
                            placeholder="e.g. 1.5"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Volume Cap</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formatAmountInput(d.ruleVolumeCap)}
                            onChange={(e) => {
                              const c = parseAmountInput(e.target.value);
                              if (c !== null) d.setRuleVolumeCap(c);
                            }}
                            placeholder="Optional"
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Commission Cap</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={formatAmountInput(d.ruleCommissionCap)}
                            onChange={(e) => {
                              const c = parseAmountInput(e.target.value);
                              if (c !== null) d.setRuleCommissionCap(c);
                            }}
                            placeholder="Optional"
                            className="form-input"
                          />
                        </div>
                      </div>
                    )}
                    {d.ruleType === "TIERED_FLAT" && (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <label className="form-label" style={{ margin: 0 }}>
                            Tiers
                          </label>
                          <button
                            className="btn-secondary btn-sm"
                            type="button"
                            onClick={() => d.addTierRow(d.setRuleTiers)}
                          >
                            <Plus size={13} />
                            Add Tier
                          </button>
                        </div>
                        {d.ruleTiers.map((tier: TierFormEntry, i: number) => (
                          <TierRow
                            key={tier.id}
                            tier={tier}
                            index={i}
                            canRemove={d.ruleTiers.length > 1}
                            onChange={(id, field, value) =>
                              d.updateTierField(
                                d.setRuleTiers,
                                id,
                                field,
                                value,
                              )
                            }
                            onRemove={(id) =>
                              d.removeTierRow(d.setRuleTiers, id)
                            }
                          />
                        ))}
                      </div>
                    )}
                    {d.addRuleError && (
                      <div className="alert alert-error">{d.addRuleError}</div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 12,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        className="btn-secondary"
                        onClick={d.closeAddRule}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        onClick={d.handleAddRule}
                        disabled={d.isSubmitting}
                      >
                        {d.isSubmitting ? (
                          <RefreshCw size={16} className="spin" />
                        ) : null}
                        {d.isSubmitting ? "Adding..." : "Add Rule"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Structure Modal ── */}
      {d.isCreateScheduleOpen && (
        <div className="modal-overlay" onClick={d.closeCreateSchedule}>
          <div
            className="modal-content modal-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Create Commission Structure</h2>
              <button className="btn-icon" onClick={d.closeCreateSchedule}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Structure Name *</label>
                <input
                  type="text"
                  value={d.newScheduleName}
                  onChange={(e) => d.setNewScheduleName(e.target.value)}
                  placeholder="e.g. Standard Agent"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  value={d.newScheduleDesc}
                  onChange={(e) => d.setNewScheduleDesc(e.target.value)}
                  placeholder="Optional description"
                  className="form-input"
                />
              </div>
              {d.createScheduleError && (
                <div className="alert alert-error">{d.createScheduleError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={d.closeCreateSchedule}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={d.handleCreateAndLinkSchedule}
                disabled={d.isCreatingSchedule || !d.newScheduleName.trim()}
                style={{ flex: 2 }}
              >
                {d.isCreatingSchedule ? "Creating..." : "Create & Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Tiers Modal ── */}
      {d.isEditTiersOpen && d.ruleForTiers && (
        <div className="modal-overlay" onClick={d.closeEditTiers}>
          <div
            className="modal-content"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                Edit Tiers — {TX_TYPE_LABELS[d.ruleForTiers.transactionType]}
              </h2>
              <button className="btn-icon" onClick={d.closeEditTiers}>
                <X size={20} />
              </button>
            </div>
            <div
              className="modal-form"
              style={{ maxHeight: "60vh", overflowY: "auto" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 8,
                }}
              >
                <button
                  className="btn-secondary btn-sm"
                  type="button"
                  onClick={() => d.addTierRow(d.setEditTiers)}
                >
                  <Plus size={13} />
                  Add Tier
                </button>
              </div>
              {d.editTiers.map((tier: TierFormEntry, i: number) => (
                <TierRow
                  key={tier.id}
                  tier={tier}
                  index={i}
                  canRemove={d.editTiers.length > 1}
                  onChange={(id, field, value) =>
                    d.updateTierField(d.setEditTiers, id, field, value)
                  }
                  onRemove={(id) => d.removeTierRow(d.setEditTiers, id)}
                />
              ))}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={d.closeEditTiers}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={d.handleReplaceTiers}
                disabled={d.isSubmitting}
                style={{ flex: 2 }}
              >
                {d.isSubmitting ? "Saving..." : "Save Tiers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedTemplateId != null) {
    return (
      <TemplateDetailView
        templateId={selectedTemplateId}
        onBack={() => {
          setSelectedTemplateId(null);
          if (typeof window !== "undefined") window.scrollTo(0, 0);
        }}
      />
    );
  }

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
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{ cursor: "pointer" }}
                  >
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
