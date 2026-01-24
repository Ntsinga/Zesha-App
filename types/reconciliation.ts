/**
 * Reconciliation types matching backend models/reconciliations.py
 */
import type { BaseModel } from "./base";
import type {
  ShiftEnum,
  StatusEnum,
  ApprovalStatusEnum,
  ReconciliationStatusEnum,
} from "./enums";
import type { Balance } from "./balance";
import type { Commission } from "./commission";
import type { CashCount } from "./cashCount";

/**
 * Reconciliation history entry - simplified view for lists
 */
export interface ReconciliationHistory {
  id: number;
  date: string;
  shift: ShiftEnum;
  totalFloat: number;
  totalCash: number;
  totalCommissions: number;
  expectedClosing: number;
  actualClosing: number;
  variance: number;
  status: StatusEnum;
  approvalStatus: ApprovalStatusEnum;
  reconciliationStatus?: ReconciliationStatusEnum;
  isFinalized: boolean;
  reconciledBy: number | null;
  reconciledAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  createdAt: string | null;
}

/**
 * Full reconciliation detail with related records
 */
export interface ReconciliationDetail {
  reconciliation: ReconciliationHistory;
  balances: Balance[];
  commissions: Commission[];
  cashCounts: CashCount[];
}

/**
 * Full reconciliation entity - matches backend Reconciliations model
 */
export interface Reconciliation extends BaseModel {
  date: string;
  shift: ShiftEnum;
  companyId: number;
  reconciliationStatus: ReconciliationStatusEnum;
  totalFloat: number;
  totalCash: number;
  totalCommissions: number;
  expectedClosing: number;
  actualClosing: number;
  variance: number;
  status: StatusEnum;
  approvalStatus: ApprovalStatusEnum;
  reconciledBy: number | null;
  reconciledAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  isFinalized: boolean;
  notes: string | null;
}

/**
 * Create reconciliation request
 */
export interface ReconciliationCreate {
  date: string;
  shift: ShiftEnum;
  companyId: number;
  notes?: string;
}

/**
 * Update reconciliation request
 */
export interface ReconciliationUpdate {
  notes?: string;
  status?: StatusEnum;
  approvalStatus?: ApprovalStatusEnum;
}

/**
 * Reconciliation calculation result from calculate endpoint
 */
export interface ReconciliationCalculationResult {
  date: string;
  shift: ShiftEnum;
  calculatedTotals: {
    totalFloat: number;
    totalCash: number;
    grandTotal: number;
  };
  reportedTotals: {
    totalFloat: number;
    totalCash: number;
    grandTotal: number;
  };
  variances: {
    floatVariance: number;
    cashVariance: number;
    grandVariance: number;
  };
  commissionTotal: number;
  expenseTotal: number;
  cashCountTotal: number;
  status: StatusEnum;
  isReady: boolean;
  validationErrors: string[];
}

/**
 * Reconciliation summary for dashboard
 */
export interface ReconciliationSummary {
  reportedBalanceCount: number;
  actualBalanceCount: number;
  calculatedTotals: {
    totalFloat: number;
    totalCash: number;
    grandTotal: number;
  };
  reportedTotals: {
    totalFloat: number;
    totalCash: number;
    grandTotal: number;
  };
  isReady: boolean;
  validationErrors: string[];
}

/**
 * Filters for listing reconciliations
 */
export interface ReconciliationFilters {
  onDate?: string;
  shift?: ShiftEnum;
  status?: StatusEnum;
  approvalStatus?: ApprovalStatusEnum;
  companyId?: number;
  skip?: number;
  limit?: number;
}

// ============= API Request Types =============

/**
 * Parameters for fetching reconciliation history
 */
export interface ReconciliationHistoryParams {
  companyId: number;
  dateFrom?: string;
  dateTo?: string;
  shift?: ShiftEnum;
  status?: StatusEnum;
  skip?: number;
  limit?: number;
}

/**
 * Parameters for fetching reconciliation details
 */
export interface ReconciliationDetailsParams {
  date: string;
  shift: ShiftEnum;
  companyId: number;
}

/**
 * Parameters for calculating reconciliation
 */
export interface ReconciliationCalculateParams {
  date: string;
  shift: ShiftEnum;
  companyId: number;
  userId?: number;
}

/**
 * Parameters for finalizing reconciliation
 */
export interface ReconciliationFinalizeParams {
  date: string;
  shift: ShiftEnum;
  companyId: number;
  reconciledBy?: number;
  notes?: string;
}

/**
 * Parameters for approving/rejecting reconciliation
 */
export interface ReconciliationApproveParams {
  date: string;
  shift: ShiftEnum;
  companyId: number;
  action: "APPROVED" | "REJECTED";
  approvedBy: number;
  rejectionReason?: string;
}

/**
 * Result from approve reconciliation endpoint
 */
export interface ReconciliationApproveResult {
  success: boolean;
  message: string;
  action: "APPROVED" | "REJECTED";
  reconciliationId: number;
}
