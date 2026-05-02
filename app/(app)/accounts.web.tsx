import React, { useState, useRef, useEffect } from "react";
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
  ChevronRight,
  Copy,
  LayoutTemplate,
  ArrowLeft,
  Layers,
  Power,
  DollarSign,
} from "lucide-react";
import { formatAmountInput, parseAmountInput } from "../../utils/formatters";
import {
  useAccountsScreen,
  ACCOUNT_TYPES,
} from "../../hooks/screens/useAccountsScreen";
import {
  useAccountDetailScreen,
  type TierFormEntry,
} from "../../hooks/screens/useAccountDetailScreen";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import { useAppSelector } from "../../store/hooks";
import { selectUserRole } from "../../store/slices/authSlice";
import type {
  Account,
  AccountTypeEnum,
  CommissionModelEnum,
  CommissionRule,
  CommissionRuleTypeEnum,
  TransactionTypeEnum,
} from "../../types";
import "../../styles/web.css";

// ─── Label helpers ─────────────────────────────────────────────────────────

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

// ─── TierRow ───────────────────────────────────────────────────────────────

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
              const clean = parseAmountInput(e.target.value);
              if (clean !== null) onChange(tier.id, "minAmount", clean);
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
              const clean = parseAmountInput(e.target.value);
              if (clean !== null) onChange(tier.id, "maxAmount", clean);
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
              const clean = parseAmountInput(e.target.value);
              if (clean !== null)
                onChange(tier.id, "customerChargeAmount", clean);
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
              const clean = parseAmountInput(e.target.value);
              if (clean !== null)
                onChange(tier.id, "agentCommissionAmount", clean);
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── RuleGroupRow ──────────────────────────────────────────────────────────

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

// ─── AccountDetailView ─────────────────────────────────────────────────────

interface AccountDetailViewProps {
  accountId: number;
  onBack: () => void;
  onDeleteRequest: (account: Account) => void;
}

function AccountDetailView({
  accountId,
  onBack,
  onDeleteRequest,
}: AccountDetailViewProps) {
  const d = useAccountDetailScreen(accountId);
  const { formatCurrency } = useCurrencyFormatter();
  const [localMsg, setLocalMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
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

  const showLocalMsg = (type: "success" | "error", text: string) => {
    setLocalMsg({ type, text });
    if (type === "success") setTimeout(() => setLocalMsg(null), 3500);
  };

  const onSaveAccount = async () => {
    const result = await d.handleSaveAccount();
    showLocalMsg(result.success ? "success" : "error", result.message);
  };

  const onAssignSchedule = async (val: string) => {
    await d.handleAssignSchedule(val ? Number(val) : null);
  };

  // Group rules by transaction type
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

  const msg = d.message ?? localMsg;

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
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="header-title">
              {d.account?.name ?? "Account Detail"}
            </h1>
            <span className="header-date">
              Account details &amp; commission structure
            </span>
          </div>
        </div>
        {d.isAdmin && d.account && (
          <div className="header-right">
            <button
              className="btn-secondary"
              onClick={() => onDeleteRequest(d.account!)}
              style={{
                color: "var(--color-danger)",
                borderColor: "var(--color-danger)",
              }}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        )}
      </header>

      <div className="dashboard-content">
        {msg && (
          <div
            className={`alert ${msg.type === "success" ? "alert-success" : "alert-error"}`}
          >
            {msg.text}
          </div>
        )}

        {/* ── Account Info Card ── */}
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
              Account Information
            </h3>
            {d.account && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className={`status-badge ${d.account.isActive ? "passed" : "failed"}`}
                >
                  {d.account.isActive ? "Active" : "Inactive"}
                </span>
                <span
                  className={`category-badge ${d.account.accountType.toLowerCase()}`}
                >
                  {d.account.accountType}
                </span>
              </div>
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
                    <label className="form-label">Account Name *</label>
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => d.setName(e.target.value)}
                      className="form-input"
                      placeholder="Account name"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Current Balance</label>
                    <input
                      type="text"
                      value={formatCurrency(d.account?.currentBalance ?? 0)}
                      className="form-input"
                      disabled
                      style={{ background: "#f8fafc", color: "#64748b" }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
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

                  {d.accountType === "TELECOM" && (
                    <div
                      className="form-group"
                      style={{ marginBottom: 0, maxWidth: "50%" }}
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
                        <option value="CUMULATIVE">Cumulative</option>
                        <option value="PARTIAL">Partial</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Status</label>
                    <div className="toggle-group">
                      <label className="toggle">
                        <input
                          type="checkbox"
                          checked={d.isActive}
                          onChange={(e) => d.setIsActive(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-label">
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn-primary"
                    onClick={onSaveAccount}
                    disabled={d.isSavingAccount}
                  >
                    {d.isSavingAccount ? (
                      <RefreshCw size={16} className="spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {d.isSavingAccount ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              // Read-only view for non-admins
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
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
                    Balance
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {formatCurrency(d.account?.currentBalance ?? 0)}
                  </div>
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

        {/* ── Commission Structure Section ── */}
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
                  {d.schedule.description && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {d.schedule.description}
                    </span>
                  )}
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
                    No commission structure assigned to this account.
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
                      <div style={{ position: "relative" }}>
                        <select
                          className="form-input"
                          style={{
                            appearance: "none",
                            paddingRight: 28,
                            minWidth: 220,
                          }}
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
                        <ChevronDown
                          size={14}
                          style={{
                            position: "absolute",
                            right: 8,
                            top: "50%",
                            transform: "translateY(-50%)",
                            pointerEvents: "none",
                            color: "#64748b",
                          }}
                        />
                      </div>
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
                  No commission structure has been set up for this account yet.
                </p>
              )
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {Object.keys(TX_TYPE_LABELS).map((txType) => {
                  const rules = rulesByTxType[txType] ?? [];
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
                    <div style={{ position: "relative" }}>
                      <select
                        className="form-input"
                        style={{
                          appearance: "none",
                          paddingRight: 28,
                          minWidth: 200,
                          fontSize: 12,
                        }}
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
                      <ChevronDown
                        size={14}
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          pointerEvents: "none",
                          color: "#64748b",
                        }}
                      />
                    </div>
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
                        {d.ruleTiers.map((tier, i) => (
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
                        ) : (
                          <Check size={16} />
                        )}
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
                  placeholder="e.g. MTN Standard"
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
                {d.isCreatingSchedule ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <Check size={16} />
                )}
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
              {d.editTiers.map((tier, i) => (
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
                {d.isSubmitting ? (
                  <RefreshCw size={16} className="spin" />
                ) : (
                  <Check size={16} />
                )}
                {d.isSubmitting ? "Saving..." : "Save Tiers"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    closeModal,
    handleSubmit,
    confirmDelete,
    handleDelete,
    cancelDelete,
  } = useAccountsScreen();

  const { formatCurrency } = useCurrencyFormatter();
  const userRole = useAppSelector(selectUserRole);
  const isSuperAdmin = userRole === "Super Administrator";
  const isAdmin = userRole === "Administrator" || isSuperAdmin;

  // Master-detail state
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null,
  );

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
      setSelectedAccountId(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // If an account is selected, show the detail view
  if (selectedAccountId !== null) {
    if (typeof window !== "undefined") window.scrollTo(0, 0);
    return (
      <AccountDetailView
        accountId={selectedAccountId}
        onBack={() => setSelectedAccountId(null)}
        onDeleteRequest={(account) => {
          confirmDelete(account);
          setSelectedAccountId(null);
        }}
      />
    );
  }

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
                    onClick={() => setSelectedAccountId(account.id)}
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
