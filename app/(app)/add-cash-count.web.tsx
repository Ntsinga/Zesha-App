import React, { useState } from "react";
import { useRouter } from "expo-router";
import { Save, Plus, Minus, Banknote, Trash2, ArrowLeft } from "lucide-react";
import {
  useCashCountScreen,
  type DenominationEntry,
} from "../../hooks/screens/useCashCountScreen";
import "../../styles/web.css";

export default function AddCashCountPage() {
  const router = useRouter();
  const {
    shift,
    entries,
    isSubmitting,
    isEditing,
    isLoading,
    formatCurrency,
    totalAmount,
    totalNotes,
    filledEntries,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    handleSubmit,
    clearAll,
    handleBack,
  } = useCashCountScreen();

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const onSubmit = async () => {
    const result = await handleSubmit();
    setMessage({
      type: result.success ? "success" : "error",
      text: result.message,
    });

    if (result.success) {
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  const onClearAll = () => {
    if (window.confirm("Are you sure you want to clear all entries?")) {
      clearAll();
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header Bar */}
      <header className="header-bar">
        <div className="header-left">
          <button className="btn-back" onClick={() => router.back()}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="header-title">Cash Count</h1>
            <span className="header-date">Enter denomination quantities</span>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-secondary" onClick={onClearAll}>
            <Trash2 size={16} />
            Clear All
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

        {/* Shift Badge (read-only, set from reconciliation screen) */}
        <div className="shift-selector">
          <label className="form-label">Shift</label>
          <div className="shift-buttons">
            <span className={`shift-button selected`}>{shift} Shift</span>
          </div>
        </div>

        {/* Denominations Grid */}
        <div className="cash-count-grid">
          {entries.map((entry, index) => {
            const qty = parseInt(entry.quantity || "0");
            const subtotal = entry.displayValue * qty;
            const hasValue = qty > 0;

            return (
              <div
                key={`${entry.denomination}-${
                  entry.isCoin ? "coin" : "note"
                }-${index}`}
                className={`denomination-card ${hasValue ? "has-value" : ""}`}
              >
                <div className="denomination-info">
                  <div className="denomination-header">
                    <Banknote
                      size={20}
                      className={hasValue ? "text-primary" : "text-gray"}
                    />
                    <span
                      className={`denomination-label ${
                        hasValue ? "text-primary" : ""
                      }`}
                    >
                      {entry.label}
                    </span>
                  </div>
                  {hasValue && (
                    <span className="denomination-subtotal">
                      = {formatCurrency(subtotal)}
                    </span>
                  )}
                </div>

                <div className="quantity-controls">
                  <button
                    className="quantity-btn decrement"
                    onClick={() => decrementQuantity(index)}
                    disabled={qty === 0}
                  >
                    <Minus size={16} />
                  </button>

                  <input
                    type="text"
                    value={entry.quantity}
                    onChange={(e) => updateQuantity(index, e.target.value)}
                    placeholder="0"
                    className="quantity-input"
                    maxLength={4}
                  />

                  <button
                    className="quantity-btn increment"
                    onClick={() => incrementQuantity(index)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Card */}
        <div className="cash-count-summary">
          <div className="summary-stats">
            <div className="summary-stat">
              <span className="summary-stat-label">Total Notes/Coins</span>
              <span className="summary-stat-value">{totalNotes}</span>
            </div>
            <div className="summary-stat">
              <span className="summary-stat-label">Filled Denominations</span>
              <span className="summary-stat-value">{filledEntries}</span>
            </div>
            <div className="summary-stat highlight">
              <span className="summary-stat-label">Total Amount</span>
              <span className="summary-stat-value primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <button
            className={`btn-primary btn-lg ${isEditing ? "btn-success" : ""}`}
            onClick={onSubmit}
            disabled={isSubmitting || filledEntries === 0}
          >
            <Save size={20} />
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update Cash Count"
                : "Save Cash Count"}
          </button>
        </div>
      </div>
    </div>
  );
}
