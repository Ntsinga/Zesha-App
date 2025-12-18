import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchReconciliationDetails,
  calculateReconciliation,
  finalizeReconciliation,
  clearCalculatedResult,
} from "../../store/slices/reconciliationsSlice";
import { useCurrencyFormatter } from "../../hooks/useCurrency";
import type { AppDispatch, RootState } from "../../store";
import "../../styles/web.css";

export default function ReconcileReviewWeb() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { formatCurrency } = useCurrencyFormatter();

  // Get params from URL
  const urlParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const date = urlParams.get("date") || "";
  const shift = (urlParams.get("shift") as "AM" | "PM") || "AM";

  const [notes, setNotes] = useState("");

  const {
    calculatedResult,
    reconciliationDetails,
    isLoading,
    isCalculating,
    isFinalizing,
    error,
  } = useSelector((state: RootState) => state.reconciliations);

  const { user: backendUser } = useSelector((state: RootState) => state.auth);

  // Fetch details on mount
  useEffect(() => {
    if (date && shift) {
      dispatch(fetchReconciliationDetails({ date, shift }));
    }

    return () => {
      dispatch(clearCalculatedResult());
    };
  }, [dispatch, date, shift]);

  // Get reconciliation data
  const reconciliation =
    calculatedResult?.data || reconciliationDetails?.reconciliation;

  const handleRecalculate = async () => {
    if (!date || !shift) return;

    try {
      await dispatch(
        calculateReconciliation({
          date,
          shift,
          user_id: backendUser?.id,
        })
      ).unwrap();

      alert("Reconciliation recalculated successfully");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to recalculate");
    }
  };

  const handleFinalize = async () => {
    if (!date || !shift) return;

    if (reconciliation?.is_finalized) {
      alert("This reconciliation is already locked");
      return;
    }

    if (
      !confirm(
        "Are you sure? This will lock the reconciliation and send notifications to supervisors."
      )
    ) {
      return;
    }

    try {
      await dispatch(
        finalizeReconciliation({
          date,
          shift,
          reconciled_by: backendUser?.id,
          notes: notes || undefined,
        })
      ).unwrap();

      alert("Reconciliation finalized and notifications sent!");
      router.back();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to finalize");
    }
  };

  // Determine status display
  const getStatusDisplay = () => {
    const status = reconciliation?.status || "CALCULATED";
    switch (status) {
      case "PASSED":
        return {
          icon: <CheckCircle size={40} className="status-icon-success" />,
          color: "status-card-passed",
          label: "Passed",
        };
      case "FLAGGED":
        return {
          icon: <AlertTriangle size={40} className="status-icon-warning" />,
          color: "status-card-flagged",
          label: "Flagged",
        };
      case "FAILED":
        return {
          icon: <XCircle size={40} className="status-icon-error" />,
          color: "status-card-failed",
          label: "Failed",
        };
      default:
        return {
          icon: <CheckCircle size={40} className="status-icon-default" />,
          color: "status-card-calculated",
          label: "Calculated",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="page-wrapper">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading reconciliation details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <XCircle size={48} color="#EF4444" />
          <h2>Error Loading Reconciliation</h2>
          <p>{error}</p>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!reconciliation) {
    return (
      <div className="page-wrapper">
        <div className="error-container">
          <p>No reconciliation found</p>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header className="header-bar">
        <div className="header-left">
          <button
            onClick={() => router.back()}
            className="btn-icon"
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="header-title">Reconciliation Review</h1>
            <span className="header-date">
              {date} - {shift} Shift
            </span>
          </div>
        </div>
        {reconciliation.is_finalized && (
          <div className="badge-finalized">
            <Lock size={14} />
            Finalized
          </div>
        )}
      </header>

      <div className="content-wrapper">
        <div className="reconcile-review-container">
          {/* Status Card */}
          <div className={`status-card ${statusDisplay.color}`}>
            {statusDisplay.icon}
            <h2>{statusDisplay.label}</h2>
            <p className="variance">
              Variance: {formatCurrency(reconciliation.variance || 0)}
            </p>
          </div>

          {/* Summary Card */}
          <div className="summary-card">
            <h3>Summary</h3>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Total Float</span>
                <span className="summary-value">
                  {formatCurrency(reconciliation.total_float || 0)}
                </span>
              </div>
              <div className="summary-row">
                <span>Total Cash</span>
                <span className="summary-value">
                  {formatCurrency(reconciliation.total_cash || 0)}
                </span>
              </div>
              <div className="summary-row">
                <span>Commissions</span>
                <span className="summary-value">
                  {formatCurrency(reconciliation.total_commissions || 0)}
                </span>
              </div>
              <div className="summary-row-total">
                <span>Actual Total</span>
                <span className="summary-total">
                  {formatCurrency(reconciliation.actual_closing || 0)}
                </span>
              </div>
              <div className="summary-row">
                <span>Expected Total</span>
                <span className="summary-value-muted">
                  {formatCurrency(reconciliation.expected_closing || 0)}
                </span>
              </div>
              <div className="summary-row-variance">
                <span>Variance</span>
                <span
                  className={`variance-amount ${
                    Math.abs(reconciliation.variance || 0) < 1
                      ? "passed"
                      : Math.abs(reconciliation.variance || 0) <= 1000
                      ? "flagged"
                      : "failed"
                  }`}
                >
                  {formatCurrency(reconciliation.variance || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          {!reconciliation.is_finalized && (
            <div className="notes-card">
              <label className="form-label">Notes (Optional)</label>
              <textarea
                className="notes-input"
                placeholder="Add any notes about this reconciliation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {reconciliation.notes && (
            <div className="notes-display-card">
              <h4>Finalization Notes</h4>
              <p>{reconciliation.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          {!reconciliation.is_finalized && (
            <div className="action-buttons">
              <button
                onClick={handleRecalculate}
                disabled={isCalculating}
                className="btn-secondary"
              >
                <RefreshCw size={18} />
                {isCalculating ? "Recalculating..." : "Recalculate"}
              </button>

              <button
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="btn-primary"
              >
                <Lock size={18} />
                {isFinalizing ? "Finalizing..." : "Finalize & Lock"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
