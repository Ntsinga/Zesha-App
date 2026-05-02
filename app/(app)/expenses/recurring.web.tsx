import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Pencil, Plus, Repeat, Trash2, X } from "lucide-react";

import { API_ENDPOINTS } from "@/config/api";
import { secureApiRequest } from "@/services/secureApi";
import { selectEffectiveCompanyId } from "@/store/slices/authSlice";
import { useAppSelector } from "@/store/hooks";
import {
  buildTypedQueryString,
  mapApiRequest,
  mapApiResponse,
  type ExpenseFundingSource,
  type RecurringExpense,
  type RecurringExpenseCreate,
  type RecurringExpenseStatus,
  type RecurringExpenseUpdate,
} from "@/types";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_FUNDING_SOURCES,
} from "@/hooks/screens/useExpensesScreen";
import { useToast } from "@/components/Toast.web";
import { formatAmountInput, parseAmountInput } from "@/utils/formatters";
import "@/styles/web.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const currencyFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return currencyFmt.format(value);
}

function formatDateLabel(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFundingSourceLabel(value: ExpenseFundingSource): string {
  return EXPENSE_FUNDING_SOURCES.find((s) => s.value === value)?.label ?? value;
}

function getSourceStyle(source: ExpenseFundingSource): React.CSSProperties {
  switch (source) {
    case "CAPITAL":
      return { background: "#fde8eb", color: "#be123c" };
    case "COMMISSIONS":
      return { background: "#dbeafe", color: "#1d4ed8" };
    case "EXTERNAL_INCOME":
      return { background: "#dcfce7", color: "#15803d" };
    default:
      return {
        background: "var(--color-bg)",
        color: "var(--color-text-secondary)",
      };
  }
}

function getStatusStyle(status: RecurringExpenseStatus): React.CSSProperties {
  switch (status) {
    case "ACTIVE":
      return { background: "#dcfce7", color: "#15803d" };
    case "PAUSED":
      return { background: "#fef3c7", color: "#92400e" };
    case "ENDED":
      return { background: "#f3f4f6", color: "#6b7280" };
    default:
      return { background: "#f3f4f6", color: "#6b7280" };
  }
}

function getStatusBorderColor(status: RecurringExpenseStatus): string {
  switch (status) {
    case "ACTIVE":
      return "#16a34a";
    case "PAUSED":
      return "#d97706";
    case "ENDED":
      return "#d1d5db";
    default:
      return "#d1d5db";
  }
}

async function recurringApiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const data = await secureApiRequest<unknown>(endpoint, options ?? {});
  return mapApiResponse<T>(data);
}

// ─── Form state ───────────────────────────────────────────────────────────────

type RecurringFormState = {
  name: string;
  amount: string;
  description: string;
  category: string;
  fundingSource: ExpenseFundingSource;
  dayOfMonth: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const createInitialForm = (): RecurringFormState => ({
  name: "",
  amount: "",
  description: "",
  category: "",
  fundingSource: "CAPITAL",
  dayOfMonth: "1",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  isActive: true,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecurringExpensesWeb() {
  const companyId = useAppSelector(selectEffectiveCompanyId);
  const { showToast } = useToast();

  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<RecurringFormState>(createInitialForm);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!companyId) {
      setItems([]);
      return;
    }
    setIsLoading(true);
    try {
      const query = buildTypedQueryString({ companyId, activeOnly: false });
      const data = await recurringApiRequest<RecurringExpense[]>(
        `${API_ENDPOINTS.recurringExpenses.list}${query}`,
      );
      setItems(data);
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to load recurring schedules",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  }, [companyId, showToast]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (!companyId) setItems([]);
  }, [companyId]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = items.filter((i) => i.status === "ACTIVE");
    const paused = items.filter((i) => i.status === "PAUSED");
    const ended = items.filter((i) => i.status === "ENDED");
    const monthlyTotal = active.reduce((sum, i) => sum + i.amount, 0);
    return {
      active: active.length,
      paused: paused.length,
      ended: ended.length,
      monthlyTotal,
    };
  }, [items]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
    [items],
  );

  // ── Modal helpers ────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingItem(null);
    setForm(createInitialForm());
    setIsModalOpen(true);
  };

  const openEditModal = (item: RecurringExpense) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      amount: item.amount.toString(),
      description: item.description ?? "",
      category: item.category ?? "",
      fundingSource: item.fundingSource,
      dayOfMonth: item.dayOfMonth.toString(),
      startDate: item.startDate,
      endDate: item.endDate ?? "",
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingItem(null);
    setForm(createInitialForm());
    setIsModalOpen(false);
  };

  const patchForm = (patch: Partial<RecurringFormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!companyId) {
      showToast("No company found. Please log in again.", "error");
      return;
    }

    const parsedAmount = parseAmountInput(form.amount);
    const numericAmount = parsedAmount === null ? null : Number(parsedAmount);
    const dayOfMonth = Number(form.dayOfMonth);

    if (!form.name.trim() || numericAmount === null || numericAmount <= 0) {
      showToast("Provide a valid name and amount.", "error");
      return;
    }
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      showToast("Day of month must be between 1 and 31.", "error");
      return;
    }

    const payload: RecurringExpenseCreate = {
      companyId,
      name: form.name.trim(),
      amount: numericAmount,
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      fundingSource: form.fundingSource,
      dayOfMonth,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      isActive: form.isActive,
    };

    try {
      if (editingItem) {
        const updatePayload: RecurringExpenseUpdate = { ...payload };
        await recurringApiRequest<RecurringExpense>(
          API_ENDPOINTS.recurringExpenses.update(editingItem.id, companyId),
          {
            method: "PATCH",
            body: JSON.stringify(mapApiRequest(updatePayload)),
          },
        );
      } else {
        await recurringApiRequest<RecurringExpense>(
          API_ENDPOINTS.recurringExpenses.create,
          {
            method: "POST",
            body: JSON.stringify(mapApiRequest(payload)),
          },
        );
      }
      await loadItems();
      closeModal();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save schedule",
        "error",
      );
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const onDelete = async (id: number) => {
    if (!companyId) return;
    setIsDeleting(true);
    try {
      await recurringApiRequest<void>(
        API_ENDPOINTS.recurringExpenses.delete(id, companyId),
        { method: "DELETE" },
      );
      setDeleteConfirmId(null);
      await loadItems();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to delete schedule",
        "error",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-content">
      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          alignItems: "stretch",
        }}
      >
        {/* Monthly total */}
        <div
          className="summary-card"
          style={{ padding: 16, flex: "1 1 180px" }}
        >
          <div
            className="summary-icon"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
          >
            <Repeat size={18} />
          </div>
          <div className="summary-details">
            <span className="summary-label">Monthly Total</span>
            <span className="summary-amount" style={{ color: "#ef4444" }}>
              -{formatCurrency(stats.monthlyTotal)}
            </span>
          </div>
          <div className="summary-count">
            <span className="count-number">{items.length}</span>
            <span className="count-label">recurring</span>
          </div>
        </div>

        {/* Active */}
        <div
          className="summary-card"
          style={{ padding: 16, flex: "1 1 140px" }}
        >
          <div
            className="summary-icon"
            style={{ background: "#dcfce7", color: "#16a34a" }}
          >
            <span style={{ fontSize: 18, fontWeight: 700 }}>
              {stats.active}
            </span>
          </div>
          <div className="summary-details">
            <span className="summary-label">Active</span>
            <span
              className="summary-amount"
              style={{ color: "#16a34a", fontSize: 14 }}
            >
              Running
            </span>
          </div>
        </div>

        {/* Paused */}
        <div
          className="summary-card"
          style={{ padding: 16, flex: "1 1 140px" }}
        >
          <div
            className="summary-icon"
            style={{ background: "#fef3c7", color: "#d97706" }}
          >
            <span style={{ fontSize: 18, fontWeight: 700 }}>
              {stats.paused}
            </span>
          </div>
          <div className="summary-details">
            <span className="summary-label">Paused</span>
            <span
              className="summary-amount"
              style={{ color: "#d97706", fontSize: 14 }}
            >
              On hold
            </span>
          </div>
        </div>

        {/* Ended */}
        {stats.ended > 0 && (
          <div
            className="summary-card"
            style={{ padding: 16, flex: "1 1 140px" }}
          >
            <div
              className="summary-icon"
              style={{ background: "#f3f4f6", color: "#6b7280" }}
            >
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                {stats.ended}
              </span>
            </div>
            <div className="summary-details">
              <span className="summary-label">Ended</span>
              <span
                className="summary-amount"
                style={{ color: "#6b7280", fontSize: 14 }}
              >
                Inactive
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--color-text-secondary)",
            }}
          >
            Expenses are generated automatically each month based on these
            recurring rules.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={openCreateModal} className="btn-add">
            <Plus size={16} />
            Add Recurring Expense
          </button>
        </div>
      </div>

      {/* ── Schedule cards ────────────────────────────────────────────── */}
      {isLoading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 48,
            gap: 12,
            color: "var(--color-text-secondary)",
          }}
        >
          <div className="spinner" />
          <span>Loading schedules…</span>
        </div>
      ) : sortedItems.length === 0 ? (
        <div
          className="table-card"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 64,
            gap: 12,
          }}
        >
          <Repeat size={44} style={{ color: "var(--color-text-muted)" }} />
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 15,
              margin: 0,
            }}
          >
            No recurring expenses set up yet
          </p>
          <p
            style={{
              color: "var(--color-text-muted)",
              fontSize: 13,
              margin: 0,
            }}
          >
            Add a recurring expense and it will be generated automatically each
            month.
          </p>
          <button
            onClick={openCreateModal}
            className="btn-add"
            style={{ marginTop: 8 }}
          >
            <Plus size={16} />
            Add Recurring Expense
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {sortedItems.map((item) => (
            <div
              key={item.id}
              style={{
                background: "white",
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                borderTop: `3px solid ${getStatusBorderColor(item.status ?? "ENDED")}`,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: "16px 16px 12px",
                  borderBottom: "1px solid var(--color-border-light)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "var(--color-text)",
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </span>
                  <span
                    className="category-badge"
                    style={{
                      ...getStatusStyle(item.status ?? "ENDED"),
                      fontWeight: 700,
                      flexShrink: 0,
                      fontSize: 11,
                    }}
                  >
                    {item.status ?? "ENDED"}
                  </span>
                </div>

                {/* Amount */}
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--color-danger)",
                    letterSpacing: "-0.5px",
                    marginBottom: 8,
                  }}
                >
                  -{formatCurrency(item.amount)}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      letterSpacing: 0,
                    }}
                  >
                    {" "}
                    /month
                  </span>
                </div>

                {/* Badges row */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span
                    className="category-badge"
                    style={getSourceStyle(item.fundingSource)}
                  >
                    {getFundingSourceLabel(item.fundingSource)}
                  </span>
                  {item.category && (
                    <span className="category-badge">{item.category}</span>
                  )}
                  <span
                    className="category-badge"
                    style={{ background: "#f1f5f9", color: "#475569" }}
                  >
                    Day {item.dayOfMonth}
                  </span>
                </div>
              </div>

              {/* Card body — dates */}
              <div style={{ padding: "12px 16px", flex: 1 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px 12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Calendar size={10} />
                      Next Due
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color:
                          item.status === "ACTIVE"
                            ? "var(--color-text)"
                            : "var(--color-text-muted)",
                      }}
                    >
                      {formatDateLabel(item.nextDueDate)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: 2,
                      }}
                    >
                      Last Generated
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {formatDateLabel(item.lastGeneratedAt)}
                    </div>
                  </div>
                </div>

                {item.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      marginTop: 8,
                      marginBottom: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.description}
                  </p>
                )}
              </div>

              {/* Card footer — actions */}
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid var(--color-border-light)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  onClick={() => openEditModal(item)}
                  className="btn-secondary"
                  title="Edit"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  <Pencil size={13} />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="btn-icon-sm delete"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingItem
                  ? "Edit Recurring Expense"
                  : "Add Recurring Expense"}
              </h2>
              <button onClick={closeModal} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="modal-form">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => patchForm({ name: e.target.value })}
                  placeholder="e.g., Office Rent"
                  className="form-input"
                  required
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatAmountInput(form.amount)}
                    onChange={(e) => {
                      const clean = parseAmountInput(e.target.value);
                      if (clean !== null) patchForm({ amount: clean });
                    }}
                    placeholder="0.00"
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Day of Month *</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth}
                    onChange={(e) => patchForm({ dayOfMonth: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => patchForm({ startDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => patchForm({ endDate: e.target.value })}
                    className="form-input"
                    placeholder="Leave blank for indefinite"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => patchForm({ category: e.target.value })}
                    className="form-select"
                  >
                    <option value="">No category</option>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Funding Source</label>
                  <select
                    value={form.fundingSource}
                    onChange={(e) =>
                      patchForm({
                        fundingSource: e.target.value as ExpenseFundingSource,
                      })
                    }
                    className="form-select"
                  >
                    {EXPENSE_FUNDING_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => patchForm({ description: e.target.value })}
                  placeholder="Optional notes"
                  className="form-textarea"
                  rows={2}
                />
              </div>

              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 14,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => patchForm({ isActive: e.target.checked })}
                />
                Active (auto-generates an expense each month)
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? "Update" : "Add"} Recurring Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ───────────────────────────────────────── */}
      {deleteConfirmId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="modal-content small"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Delete Recurring Expense?</h2>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="modal-close"
              >
                <X size={20} />
              </button>
            </div>
            <p
              style={{
                color: "var(--color-text-secondary)",
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              This recurring expense rule will be deleted. Already-generated
              expenses will not be affected.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteConfirmId && void onDelete(deleteConfirmId)
                }
                className="btn-primary"
                disabled={isDeleting}
                style={{ background: "var(--color-danger)" }}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
